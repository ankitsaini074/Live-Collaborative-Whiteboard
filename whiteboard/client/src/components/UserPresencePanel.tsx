import { useEffect, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { onUserJoined, onUserLeft } from '../lib/socket';

interface User {
  userId: string;
  username: string;
  color: string;
}

export function UserPresencePanel() {
  const { roomId, userId, username, userColor, remoteCursors } = useCanvasStore();
  const [users, setUsers] = useState<User[]>([]);

  // Initialize with current user
  useEffect(() => {
    if (username) {
      setUsers([{ userId, username, color: userColor }]);
    }
  }, [userId, username, userColor]);

  // Listen for user joins
  useEffect(() => {
    if (!roomId) return;

    onUserJoined((payload) => {
      if (payload.roomId === roomId) {
        setUsers((prev) => {
          const exists = prev.some((u) => u.userId === payload.userId);
          if (exists) return prev;
          return [...prev, {
            userId: payload.userId,
            username: payload.username,
            color: payload.color,
          }];
        });
      }
    });

    onUserLeft((payload) => {
      if (payload.roomId === roomId) {
        setUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
      }
    });
  }, [roomId]);

  if (!roomId) return null;

  return (
    <div className="fixed right-4 top-4 bg-white rounded-lg shadow-xl p-4 border border-gray-200 w-48 z-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Users</h3>
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.userId}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: user.color }}
            >
              {user.username[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 truncate">
              {user.username}
              {user.userId === userId && ' (you)'}
            </span>
          </div>
        ))}
      </div>

      {/* Also show active cursors (may include users not in room tracking yet) */}
      {remoteCursors.size > 0 && (
        <>
          <div className="h-px bg-gray-200 my-3" />
          <h3 className="text-xs font-medium text-gray-500 mb-2">Active Cursors</h3>
          <div className="space-y-1">
            {Array.from(remoteCursors.values()).map((cursor) => (
              <div
                key={cursor.userId}
                className="flex items-center gap-2 text-xs text-gray-600"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cursor.color }}
                />
                <span className="truncate">{cursor.username}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
