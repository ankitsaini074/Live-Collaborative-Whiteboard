import { useState } from 'react';

export function Landing() {
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to create room');

      const data = await res.json();
      window.location.href = `/room/${data.roomId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    if (!roomId.trim()) return;
    window.location.href = `/room/${roomId}`;
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Invite link copied!');
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Collaborative Whiteboard
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Draw together in real-time
        </p>

        <div className="space-y-4">
          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create New Room'}
          </button>

          <div className="text-center text-gray-400">or</div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={joinRoom}
              disabled={!roomId.trim()}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>

          {roomId && (
            <button
              onClick={copyInviteLink}
              className="w-full py-2 px-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-lg transition-colors"
            >
              Copy Invite Link
            </button>
          )}

          {error && (
            <p className="text-red-500 text-center text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
