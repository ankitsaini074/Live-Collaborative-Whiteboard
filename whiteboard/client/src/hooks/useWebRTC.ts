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

  // Use refs for muted/videoOff so toggle callbacks are always fresh without needing deps
  const isMutedRef = useRef(false);
  const isVideoOffRef = useRef(false);

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
      isMutedRef.current = false;
      isVideoOffRef.current = false;
      setIsMuted(false);
      setIsVideoOff(false);
      setIsInCall(true);

      socketRef.current.emit('rtc:join-call', { roomId, userId, username, color: userColor });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Camera/mic permission denied. Please allow access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found.');
      } else {
        setError('Could not access media devices.');
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
    isMutedRef.current = false;
    isVideoOffRef.current = false;
    setIsMuted(false);
    setIsVideoOff(false);
    socketRef.current.emit('rtc:leave-call', { roomId, userId });
  }, [roomId, userId]);

  // Use refs so these callbacks are stable and never stale
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    // Toggle: read current enabled state, invert it
    const nowEnabled = !audioTrack.enabled;
    audioTrack.enabled = nowEnabled;
    const nowMuted = !nowEnabled;

    isMutedRef.current = nowMuted;
    setIsMuted(nowMuted);

    socketRef.current.emit('rtc:media-state', {
      roomId, userId,
      audioMuted: nowMuted,
      videoOff: isVideoOffRef.current,
    });
  }, [roomId, userId]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Toggle: read current enabled state, invert it
    const nowEnabled = !videoTrack.enabled;
    videoTrack.enabled = nowEnabled;
    const nowVideoOff = !nowEnabled;

    isVideoOffRef.current = nowVideoOff;
    setIsVideoOff(nowVideoOff);

    socketRef.current.emit('rtc:media-state', {
      roomId, userId,
      audioMuted: isMutedRef.current,
      videoOff: nowVideoOff,
    });
  }, [roomId, userId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!roomId) return;

    socket.on('rtc:user-joined-call', async ({ userId: remoteUserId, username: remoteUsername, color: remoteColor }: any) => {
      if (remoteUserId === userId || !isInCall) return;

      setPeers((prev) => {
        const updated = new Map(prev);
        if (!updated.has(remoteUserId)) {
          updated.set(remoteUserId, {
            userId: remoteUserId,
            username: remoteUsername,
            color: remoteColor,
            stream: null,
            audioMuted: false,
            videoOff: false,
          });
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
          updated.set(fromUserId, {
            userId: fromUserId,
            username: fromUserId,
            color: '#6366f1',
            stream: null,
            audioMuted: false,
            videoOff: false,
          });
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (localStreamRef.current) leaveCall();
    };
  }, []);

  return {
    localStream, peers, isMuted, isVideoOff, isInCall, error,
    joinCall, leaveCall, toggleMute, toggleVideo,
  };
}
