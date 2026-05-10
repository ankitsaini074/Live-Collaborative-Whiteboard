import { useEffect, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { onRoomUsers, onUserJoined, onUserLeft } from '../lib/socket';

interface User {
  userId: string;
  username: string;
  color: string;
}

export function UserPresencePanel() {
  const { roomId, userId, username, userColor } = useCanvasStore();
  const [users, setUsers] = useState<User[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (username) {
      setUsers([{ userId, username, color: userColor }]);
    }
  }, [userId, username, userColor]);

  useEffect(() => {
    if (!roomId) return;

    const offRoomUsers = onRoomUsers((payload) => {
      if (payload.roomId === roomId) {
        setUsers(payload.users);
      }
    });

    const offUserJoined = onUserJoined((payload) => {
      if (payload.roomId === roomId) {
        setUsers((prev) => {
          if (prev.some((u) => u.userId === payload.userId)) return prev;
          return [...prev, { userId: payload.userId, username: payload.username, color: payload.color }];
        });
      }
    });

    const offUserLeft = onUserLeft((payload) => {
      if (payload.roomId === roomId) {
        setUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
      }
    });

    return () => {
      offRoomUsers();
      offUserJoined();
      offUserLeft();
    };
  }, [roomId]);

  if (!roomId) return null;

  return (
    <div className="fixed right-4 top-[4.5rem] z-40">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-44">
        {/* Header */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {users.slice(0, 3).map((user) => (
                <div
                  key={user.userId}
                  className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                  style={{ backgroundColor: user.color }}
                >
                  {user.username[0]?.toUpperCase()}
                </div>
              ))}
              {users.length > 3 && (
                <div className="w-5 h-5 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-500 text-[9px] font-bold">
                  +{users.length - 3}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-gray-600">{users.length} online</span>
          </div>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* User list */}
        {!collapsed && (
          <div className="border-t border-gray-100 max-h-48 overflow-y-auto">
            {users.map((user) => (
              <div key={user.userId} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: user.color }}
                >
                  {user.username[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{user.username}</p>
                  {user.userId === userId && (
                    <p className="text-[10px] text-gray-400">you</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
