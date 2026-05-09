import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { UserPresencePanel } from './UserPresencePanel';
import { useCanvasStore } from '../store/canvasStore';
import { sendClearBoard } from '../lib/socket';
import { exportToPNG } from '../lib/canvas';
import type { Stroke, Shape, Text } from '../store/canvasStore';

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [roomExpired, setRoomExpired] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { strokes, notes } = useCanvasStore();

  const setRoomId = useCanvasStore((state) => state.setRoomId);
  const setUserInfo = useCanvasStore((state) => state.setUserInfo);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);

  const handleJoin = () => {
    if (!username.trim()) return;
    setRoomId(roomId || '');
    setUserInfo(useCanvasStore.getState().userId, username, useCanvasStore.getState().userColor);
    setIsJoined(true);
  };

  const handleClearBoard = () => {
    clearCanvas();
    sendClearBoard({
      roomId: roomId || '',
      userId: useCanvasStore.getState().userId,
    });
    setShowClearConfirm(false);
  };

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    exportToPNG(strokes as (Stroke | Shape | Text)[], notes, canvas.width, canvas.height);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + S to export
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleExport();
      }

      // ? or / to show shortcuts
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        setShowClearConfirm(false);
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [strokes, notes]);

  // Auto-join if username in localStorage (optional enhancement)
  // For now, require username entry

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Join Room
          </h1>
          <p className="text-center text-gray-500 mb-6">
            Room ID: <code className="bg-gray-100 px-2 py-1 rounded">{roomId}</code>
          </p>

          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={20}
              autoFocus
            />
            <button
              onClick={handleJoin}
              disabled={!username.trim()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Join Whiteboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (roomExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Room Expired</h1>
          <p className="text-gray-600 mb-6">
            The room <code className="bg-gray-100 px-2 py-1 rounded">{roomId}</code> has expired due to inactivity.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Create New Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">
          Whiteboard — <span className="font-normal text-gray-500">Room: {roomId}</span>
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExport}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            title="Export to PNG (Ctrl+S)"
          >
            Export
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Keyboard shortcuts (?)"
          >
            Shortcuts
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          >
            Clear Board
          </button>
          <div className="text-sm text-gray-600">
            {username}
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden bg-white">
        <Canvas onRoomExpired={() => setRoomExpired(true)} />
        <UserPresencePanel />
      </main>

      <Toolbar />

      {/* Clear board confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Clear Board?</h3>
            <p className="text-gray-600 mb-6">
              This will clear all drawings and notes for everyone in the room. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearBoard}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Clear Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Undo</span>
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+Z</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Redo</span>
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+Y</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Export PNG</span>
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+S</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Pan canvas</span>
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Middle click + drag</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Zoom in/out</span>
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Mouse wheel</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Reset zoom</span>
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+0</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Close modals</span>
                <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Escape</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
