import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { UserPresencePanel } from './UserPresencePanel';
import { useCanvasStore } from '../store/canvasStore';
import { sendClearBoard } from '../lib/socket';
import { exportToPNG } from '../lib/canvas';
import { toast } from './Toast';
import type { Stroke, Shape, Text } from '../store/canvasStore';

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem('wb_username') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [roomExpired, setRoomExpired] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [zoom, setZoomDisplay] = useState(100);

  const { strokes, notes } = useCanvasStore();
  const setRoomId = useCanvasStore((state) => state.setRoomId);
  const setUserInfo = useCanvasStore((state) => state.setUserInfo);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const storeZoom = useCanvasStore((state) => state.zoom);

  useEffect(() => {
    setZoomDisplay(Math.round(storeZoom * 100));
  }, [storeZoom]);

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

  const handleCopyRoomId = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Invite link copied!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
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
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setShowShortcuts((p) => !p);
      }
      if (e.key === 'Escape') {
        setShowClearConfirm(false);
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes, notes]);

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-3">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Join Whiteboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Room: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{roomId}</code>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Your name…"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition-all"
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
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (roomExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Room Expired</h1>
          <p className="text-sm text-gray-500 mb-6">
            Room <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{roomId}</code> has expired.
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

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 h-12 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Home"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={handleCopyRoomId}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
            title="Copy invite link"
          >
            <span className="font-medium text-gray-400 text-xs">ROOM</span>
            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{roomId}</code>
            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {/* Zoom indicator */}
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <span className="text-xs text-gray-400 tabular-nums">{zoom}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            title="Export PNG (Ctrl+S)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">Clear</span>
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: useCanvasStore.getState().userColor }}
            >
              {username[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-24 truncate">{username}</span>
          </div>
        </div>
      </header>

      {/* Canvas area */}
      <main className="flex-1 relative overflow-hidden bg-[#f8f9fa]">
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <Canvas onRoomExpired={() => setRoomExpired(true)} />
        <UserPresencePanel />
      </main>

      <Toolbar />

      {/* Clear board confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Clear the board?</h3>
                <p className="text-sm text-gray-500 mt-1">This clears all drawings and notes for everyone. Cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
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
                { label: 'Pan canvas', key: 'Middle click' },
                { label: 'Zoom', key: 'Scroll wheel' },
                { label: 'Shortcuts', key: '?' },
                { label: 'Close modal', key: 'Esc' },
              ].map(({ label, key }) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-600">{label}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono border border-gray-200">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
