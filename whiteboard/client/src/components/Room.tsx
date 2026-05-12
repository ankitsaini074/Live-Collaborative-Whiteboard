import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { UserPresencePanel } from './UserPresencePanel';
import { VideoPanel } from './VideoPanel';
import { InviteModal } from './InviteModal';
import { EmojiReactionsOverlay, EmojiReactionsPanel } from './EmojiReactions';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { sendClearBoard, sendEmojiReaction, connectSocket } from '../lib/socket';
import { exportToPNG } from '../lib/canvas';
import { toast } from './Toast';
import type { Stroke, Shape, Text } from '../store/canvasStore';

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem('wb_username') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [roomExpired, setRoomExpired] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);

  const { strokes, notes } = useCanvasStore();
  const setRoomId = useCanvasStore((state) => state.setRoomId);
  const setUserInfo = useCanvasStore((state) => state.setUserInfo);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const storeZoom = useCanvasStore((state) => state.zoom);
  const userColor = useCanvasStore((state) => state.userColor);
  const userId = useCanvasStore((state) => state.userId);
  const resetView = useCanvasStore((state) => state.resetView);

  const {
    darkMode,
    showVideoPanel,
    showInviteModal,
    showShortcuts,
    showClearConfirm,
    toggleDarkMode,
    toggleVideoPanel,
    setShowInviteModal,
    setShowShortcuts,
    setShowClearConfirm,
    addEmojiReaction,
    emojiReactions,
  } = useUIStore();

  const zoom = Math.round(storeZoom * 100);

  const webrtc = useWebRTC(
    roomId || '',
    userId,
    username,
    userColor
  );

  // Listen for remote emoji reactions
  useEffect(() => {
    if (!isJoined) return;
    const socket = connectSocket();
    const handleRemoteEmoji = (payload: any) => {
      if (payload.roomId === roomId && payload.userId !== userId) {
        addEmojiReaction({
          emoji: payload.emoji,
          x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
          y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
          username: payload.username,
          color: payload.color,
        });
      }
    };
    socket.on('emoji-reaction', handleRemoteEmoji);
    return () => { socket.off('emoji-reaction', handleRemoteEmoji); };
  }, [isJoined, roomId, userId, addEmojiReaction]);

  const handleJoin = () => {
    if (!username.trim()) return;
    const trimmed = username.trim();
    localStorage.setItem('wb_username', trimmed);
    setRoomId(roomId || '');
    const state = useCanvasStore.getState();
    setUserInfo(state.userId, trimmed, state.userColor);
    setIsJoined(true);
  };

  const handleClearBoard = () => {
    clearCanvas();
    sendClearBoard({ roomId: roomId || '', userId: useCanvasStore.getState().userId });
    setShowClearConfirm(false);
    toast.info('Board cleared');
  };

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    exportToPNG(strokes as (Stroke | Shape | Text)[], notes, canvas.width, canvas.height);
    toast.success('Exported to PNG');
  };

  const handleSendEmoji = (emoji: string) => {
    const x = window.innerWidth / 2 + (Math.random() - 0.5) * 300;
    const y = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
    addEmojiReaction({ emoji, x, y, username, color: userColor });
    if (roomId) {
      sendEmojiReaction({ roomId, userId, username, color: userColor, emoji, x, y });
    }
    setShowEmojiPanel(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLElement && e.target.contentEditable === 'true') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExport();
      }
      if (e.key === '?' || (e.key === '/' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setShowShortcuts(true);
      }
      if (e.key === 'Escape') {
        setShowClearConfirm(false);
        setShowShortcuts(false);
        setShowEmojiPanel(false);
        setShowInviteModal(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleDarkMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes, notes]);

  // ─── Join screen ───────────────────────────────────────────────────
  if (!isJoined) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'}`}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-3">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Join Whiteboard</h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Room: <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>{roomId}</code>
            </p>
          </div>

          <div className={`rounded-2xl shadow-xl border p-6 space-y-3 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Your name…"
              className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                darkMode
                  ? 'border-gray-600 bg-gray-800 text-white placeholder-gray-500'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
              }`}
              maxLength={20}
              autoFocus
            />
            <button
              onClick={handleJoin}
              disabled={!username.trim()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Join Whiteboard
            </button>
            <button
              onClick={() => navigate('/')}
              className={`w-full py-2 text-sm transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Expired screen ─────────────────────────────────────────────────
  if (roomExpired) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className={`rounded-2xl shadow-xl border p-8 max-w-sm w-full text-center ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className="text-4xl mb-4">⏰</div>
          <h1 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Room Expired</h1>
          <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Room <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">{roomId}</code> has expired.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  // ─── Main room ──────────────────────────────────────────────────────
  const headerBg = darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200';
  const headerText = darkMode ? 'text-gray-300' : 'text-gray-600';
  const btnHover = darkMode ? 'hover:bg-gray-800 hover:text-gray-100' : 'hover:bg-gray-100 hover:text-gray-900';
  const canvasBg = darkMode ? 'bg-gray-950' : 'bg-[#f8f9fa]';
  const dotColor = darkMode ? '#374151' : '#d1d5db';

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className={`border-b px-3 sm:px-4 h-12 flex items-center justify-between shrink-0 z-30 ${headerBg}`}>
        {/* Left */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0 ${headerText} ${btnHover}`}
            title="Home"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>

          <div className={`w-px h-5 shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          <button
            onClick={() => setShowInviteModal(true)}
            className={`flex items-center gap-1.5 text-sm transition-colors group min-w-0 ${headerText} ${btnHover} px-2 py-1 rounded-lg`}
            title="Share invite link"
          >
            <span className={`font-medium text-xs shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>ROOM</span>
            <code className={`font-mono text-xs px-1.5 py-0.5 rounded group-hover:text-blue-600 transition-colors truncate max-w-20 sm:max-w-32 ${darkMode ? 'bg-gray-800 text-gray-300 group-hover:bg-blue-900/30' : 'bg-gray-100 text-gray-700 group-hover:bg-blue-50'}`}>
              {roomId}
            </code>
            <svg className={`w-3.5 h-3.5 shrink-0 group-hover:text-blue-500 transition-colors ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Zoom indicator */}
          <button
            onClick={resetView}
            title="Reset zoom (Ctrl+0)"
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs tabular-nums font-mono transition-colors shrink-0 ${
              darkMode ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-300' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            {zoom}%
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Emoji reactions */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPanel((p) => !p)}
              title="Emoji reactions"
              className={`flex items-center justify-center w-8 h-8 rounded-lg text-base transition-colors ${
                showEmojiPanel
                  ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  : `${headerText} ${btnHover}`
              }`}
            >
              😊
            </button>
            {showEmojiPanel && (
              <div className="absolute right-0 top-10 z-50 animate-slide-in">
                <EmojiReactionsPanel onSendReaction={handleSendEmoji} darkMode={darkMode} />
              </div>
            )}
          </div>

          {/* Video call */}
          <button
            onClick={toggleVideoPanel}
            title="Video call"
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              webrtc.isInCall
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : `${headerText} ${btnHover}`
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          <div className={`w-px h-5 mx-0.5 shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Export */}
          <button
            onClick={handleExport}
            title="Export PNG (Ctrl+S)"
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm rounded-lg transition-all ${headerText} ${btnHover}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline text-xs font-medium">Export</span>
          </button>

          {/* Dark mode */}
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Light mode (Ctrl+D)' : 'Dark mode (Ctrl+D)'}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${headerText} ${btnHover}`}
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Shortcuts */}
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-lg transition-all ${headerText} ${btnHover}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>

          {/* Clear */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline text-xs font-medium">Clear</span>
          </button>

          <div className={`w-px h-5 mx-0.5 shrink-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* User avatar */}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900"
              style={{ backgroundColor: userColor, '--tw-ring-color': userColor } as any}
            >
              {username[0]?.toUpperCase()}
            </div>
            <span className={`text-sm font-medium hidden sm:block max-w-24 truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {username}
            </span>
          </div>
        </div>
      </header>

      {/* Canvas area */}
      <main className={`flex-1 relative overflow-hidden ${canvasBg}`}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${dotColor} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <Canvas onRoomExpired={() => setRoomExpired(true)} />
        <UserPresencePanel darkMode={darkMode} />
      </main>

      <Toolbar darkMode={darkMode} />

      {/* Emoji reactions overlay */}
      <EmojiReactionsOverlay />

      {/* Video panel */}
      {showVideoPanel && (
        <VideoPanel
          localStream={webrtc.localStream}
          peers={webrtc.peers}
          localUsername={username}
          localColor={userColor}
          isMuted={webrtc.isMuted}
          isVideoOff={webrtc.isVideoOff}
          isInCall={webrtc.isInCall}
          error={webrtc.error}
          onJoinCall={webrtc.joinCall}
          onLeaveCall={webrtc.leaveCall}
          onToggleMute={webrtc.toggleMute}
          onToggleVideo={webrtc.toggleVideo}
          onClose={toggleVideoPanel}
          darkMode={darkMode}
        />
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal roomId={roomId || ''} onClose={() => setShowInviteModal(false)} />
      )}

      {/* Clear confirm */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
          <div className={`rounded-2xl p-6 max-w-sm w-full shadow-2xl border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Clear the board?</h3>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  This clears all drawings and notes for everyone. Cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className={`px-4 py-2 text-sm rounded-xl transition-colors ${darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleClearBoard}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium"
              >
                Clear board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
          <div className={`rounded-2xl p-6 max-w-sm w-full shadow-2xl border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-1">
              {[
                { label: 'Undo', key: 'Ctrl+Z' },
                { label: 'Redo', key: 'Ctrl+Y' },
                { label: 'Export PNG', key: 'Ctrl+S' },
                { label: 'Reset zoom', key: 'Ctrl+0' },
                { label: 'Dark/light mode', key: 'Ctrl+D' },
                { label: 'Pan canvas', key: 'H or middle-click' },
                { label: 'Zoom', key: 'Scroll wheel / pinch' },
                { label: 'Add image', key: 'Paste / drag-drop' },
                { label: 'Shortcuts', key: '?' },
                { label: 'Close modal', key: 'Esc' },
              ].map(({ label, key }) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
                  <kbd className={`px-2 py-0.5 text-xs rounded font-mono border ${darkMode ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
