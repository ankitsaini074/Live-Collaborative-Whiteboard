import { useEffect, useRef, useState, useCallback } from 'react';
import { connectSocket } from '../lib/socket';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export interface RemotePeer {
  userId: string;
  username: string;
  color: string;
  stream: MediaStream | null;
  audioMuted: boolean;
  videoOff: boolean;
}

export function useWebRTC(roomId: string, userId: string, username: string, userColor: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, RemotePeer>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef(connectSocket());

  const createPeerConnection = useCallback((targetUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('rtc:ice-candidate', {
          roomId,
          targetUserId,
          candidate: event.candidate,
          fromUserId: userId,
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setPeers((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(targetUserId);
        if (existing) {
          updated.set(targetUserId, { ...existing, stream });
        }
        return updated;
      });
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        removePeer(targetUserId);
      }
    };

    peerConnections.current.set(targetUserId, pc);
    return pc;
  }, [roomId, userId]);

  const removePeer = useCallback((targetUserId: string) => {
    const pc = peerConnections.current.get(targetUserId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(targetUserId);
    }
    setPeers((prev) => {
      const updated = new Map(prev);
      updated.delete(targetUserId);
      return updated;
    });
  }, []);

  const joinCall = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsInCall(true);

      socketRef.current.emit('rtc:join-call', { roomId, userId, username, color: userColor });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Camera/mic permission denied');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found');
      } else {
        setError('Failed to access media devices');
      }
    }
  }, [roomId, userId, username, userColor]);

  const leaveCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    setPeers(new Map());
    setIsInCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    socketRef.current.emit('rtc:leave-call', { roomId, userId });
  }, [roomId, userId]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      socketRef.current.emit('rtc:media-state', {
        roomId, userId, audioMuted: !audioTrack.enabled, videoOff: isVideoOff,
      });
    }
  }, [roomId, userId, isVideoOff]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
      socketRef.current.emit('rtc:media-state', {
        roomId, userId, audioMuted: isMuted, videoOff: !videoTrack.enabled,
      });
    }
  }, [roomId, userId, isMuted]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!roomId) return;

    socket.on('rtc:user-joined-call', async ({ userId: remoteUserId, username: remoteUsername, color: remoteColor }: any) => {
      if (remoteUserId === userId || !isInCall) return;

      setPeers((prev) => {
        const updated = new Map(prev);
        if (!updated.has(remoteUserId)) {
          updated.set(remoteUserId, { userId: remoteUserId, username: remoteUsername, color: remoteColor, stream: null, audioMuted: false, videoOff: false });
        }
        return updated;
      });

      const pc = createPeerConnection(remoteUserId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('rtc:offer', { roomId, targetUserId: remoteUserId, offer, fromUserId: userId });
      } catch {}
    });

    socket.on('rtc:offer', async ({ fromUserId, offer }: any) => {
      if (fromUserId === userId || !isInCall) return;
      setPeers((prev) => {
        const updated = new Map(prev);
        if (!updated.has(fromUserId)) {
          updated.set(fromUserId, { userId: fromUserId, username: fromUserId, color: '#6366f1', stream: null, audioMuted: false, videoOff: false });
        }
        return updated;
      });
      const pc = createPeerConnection(fromUserId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('rtc:answer', { roomId, targetUserId: fromUserId, answer, fromUserId: userId });
      } catch {}
    });

    socket.on('rtc:answer', async ({ fromUserId, answer }: any) => {
      const pc = peerConnections.current.get(fromUserId);
      if (pc) {
        try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } catch {}
      }
    });

    socket.on('rtc:ice-candidate', async ({ fromUserId, candidate }: any) => {
      const pc = peerConnections.current.get(fromUserId);
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    });

    socket.on('rtc:user-left-call', ({ userId: remoteUserId }: any) => {
      removePeer(remoteUserId);
    });

    socket.on('rtc:media-state', ({ userId: remoteUserId, audioMuted, videoOff }: any) => {
      setPeers((prev) => {
        const updated = new Map(prev);
        const peer = updated.get(remoteUserId);
        if (peer) updated.set(remoteUserId, { ...peer, audioMuted, videoOff });
        return updated;
      });
    });

    return () => {
      socket.off('rtc:user-joined-call');
      socket.off('rtc:offer');
      socket.off('rtc:answer');
      socket.off('rtc:ice-candidate');
      socket.off('rtc:user-left-call');
      socket.off('rtc:media-state');
    };
  }, [roomId, userId, isInCall, createPeerConnection, removePeer]);

  useEffect(() => {
    return () => {
      if (isInCall) leaveCall();
    };
  }, []);

  return {
    localStream, peers, isMuted, isVideoOff, isInCall, error,
    joinCall, leaveCall, toggleMute, toggleVideo,
  };
}
