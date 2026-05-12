import { useEffect, useRef, useState } from 'react';
import type { RemotePeer } from '../hooks/useWebRTC';

interface VideoPanelProps {
  localStream: MediaStream | null;
  peers: Map<string, RemotePeer>;
  localUsername: string;
  localColor: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isInCall: boolean;
  error: string | null;
  onJoinCall: () => void;
  onLeaveCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onClose: () => void;
  darkMode: boolean;
}

export function VideoPanel({
  localStream, peers, localUsername, localColor,
  isMuted, isVideoOff, isInCall, error,
  onJoinCall, onLeaveCall, onToggleMute, onToggleVideo, onClose, darkMode,
}: VideoPanelProps) {
  const [pos, setPos] = useState({ x: window.innerWidth - 300, y: 80 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  const peersArray = Array.from(peers.values());
  const totalParticipants = (isInCall ? 1 : 0) + peersArray.length;

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 rounded-2xl shadow-2xl border overflow-hidden select-none ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-950 border-gray-800'
      }`}
      style={{
        left: Math.max(0, Math.min(pos.x, window.innerWidth - 280)),
        top: Math.max(0, Math.min(pos.y, window.innerHeight - 200)),
        width: 280,
        cursor: dragging ? 'grabbing' : 'default',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-black/30 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white text-xs font-semibold">
            {isInCall ? `${totalParticipants} in call` : 'Video Call'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video grid */}
      <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
        {isInCall && (
          <VideoTile
            stream={localStream}
            username={localUsername}
            color={localColor}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isLocal
          />
        )}
        {peersArray.map((peer) => (
          <VideoTile
            key={peer.userId}
            stream={peer.stream}
            username={peer.username}
            color={peer.color}
            isMuted={peer.audioMuted}
            isVideoOff={peer.videoOff}
          />
        ))}
        {!isInCall && peersArray.length === 0 && (
          <div className="text-center py-4 text-white/40 text-xs">
            Join the call to see others
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-900/50 border-t border-red-800">
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 p-3 bg-black/20 border-t border-white/10">
        {isInCall ? (
          <>
            <ControlButton
              onClick={onToggleMute}
              active={isMuted}
              activeColor="bg-red-600"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </ControlButton>

            <ControlButton
              onClick={onToggleVideo}
              active={isVideoOff}
              activeColor="bg-red-600"
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </ControlButton>

            <button
              onClick={onLeaveCall}
              className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors"
              title="Leave call"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
              </svg>
            </button>
          </>
        ) : (
          <button
            onClick={onJoinCall}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Join Call
          </button>
        )}
      </div>
    </div>
  );
}

function ControlButton({ onClick, active, activeColor, title, children }: {
  onClick: () => void;
  active: boolean;
  activeColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all ${
        active ? activeColor : 'bg-white/20 hover:bg-white/30'
      }`}
    >
      {children}
    </button>
  );
}

function VideoTile({ stream, username, color, isMuted, isVideoOff, isLocal }: {
  stream: MediaStream | null;
  username: string;
  color: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isLocal?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
      {!isVideoOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: color }}
          >
            {username[0]?.toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
        <span className="bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
          {username}{isLocal ? ' (you)' : ''}
        </span>
        {isMuted && (
          <div className="w-5 h-5 rounded-full bg-red-600/90 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
