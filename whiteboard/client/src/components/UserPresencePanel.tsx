import { useEffect, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { onRoomUsers, onUserJoined, onUserLeft } from '../lib/socket';

interface User {
  userId: string;
  username: string;
  color: string;
}

export function UserPresencePanel({ darkMode }: { darkMode?: boolean }) {
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

  const panelBase = darkMode
    ? 'bg-gray-900 border-gray-700 shadow-xl shadow-black/30'
    : 'bg-white border-gray-100 shadow-xl';

  return (
    <div className="fixed right-3 top-[3.75rem] z-40 animate-fade-in">
      <div className={`rounded-xl border overflow-hidden w-44 ${panelBase}`}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {users.slice(0, 4).map((user) => (
                <div
                  key={user.userId}
                  className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                  style={{ backgroundColor: user.color }}
                  title={user.username}
                >
                  {user.username[0]?.toUpperCase()}
                </div>
              ))}
            </div>
            <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {users.length} online
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <svg
              className={`w-3.5 h-3.5 transition-transform ${darkMode ? 'text-gray-500' : 'text-gray-400'} ${collapsed ? '-rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {!collapsed && (
          <div className={`border-t max-h-52 overflow-y-auto ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            {users.map((user) => (
              <div
                key={user.userId}
                className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-offset-1"
                  style={{
                    backgroundColor: user.color,
                    ['--tw-ring-color' as any]: user.color,
                    ['--tw-ring-offset-color' as any]: darkMode ? '#111827' : '#fff',
                  }}
                >
                  {user.username[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {user.username}
                  </p>
                  {user.userId === userId && (
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>you</p>
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
