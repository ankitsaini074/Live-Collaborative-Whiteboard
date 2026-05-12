import { io, Socket } from 'socket.io-client';
import type {
  JoinRoomPayload,
  LeaveRoomPayload,
  DrawStrokePayload,
  DrawShapePayload,
  CursorMovePayload,
  AddNotePayload,
  UpdateNotePayload,
  MoveNotePayload,
  DeleteNotePayload,
  AddTextPayload,
  DeleteTextPayload,
  ClearBoardPayload,
  RoomStatePayload,
  RoomUsersPayload,
  UserJoinedPayload,
  UserLeftPayload,
} from '../../../shared/types';

let socket: Socket | null = null;
let currentRoomId: string | null = null;
let currentLamportClock: number = 0;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    if (currentRoomId) {
      socket!.emit('request-events', {
        roomId: currentRoomId,
        afterClock: currentLamportClock,
      });
    }
  });

  return socket;
};

export const setCurrentRoomId = (roomId: string): void => {
  currentRoomId = roomId;
};

export const getCurrentLamportClock = (): number => currentLamportClock;

export const updateLocalLamportClock = (clock: number): void => {
  currentLamportClock = Math.max(currentLamportClock, clock);
};

export const incrementLocalLamportClock = (): number => {
  currentLamportClock++;
  return currentLamportClock;
};

export const resetLamportClock = (): void => {
  currentLamportClock = 0;
};

export const joinRoom = (payload: JoinRoomPayload): void => {
  currentRoomId = payload.roomId;
  const s = connectSocket();
  s.emit('join-room', { ...payload, lamportClock: currentLamportClock });
};

export const leaveRoom = (payload: LeaveRoomPayload): void => {
  currentRoomId = null;
  socket?.emit('leave-room', payload);
};

export const sendDrawStroke = (payload: Omit<DrawStrokePayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('draw-stroke', { ...payload, type: 'draw-stroke', timestamp: Date.now(), lamportClock: clock });
};

export const sendDrawShape = (payload: Omit<DrawShapePayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('draw-shape', { ...payload, type: 'draw-shape', timestamp: Date.now(), lamportClock: clock });
};

export const sendCursorMove = (payload: CursorMovePayload): void => {
  socket?.emit('cursor-move', payload);
};

export const sendAddNote = (payload: Omit<AddNotePayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('add-note', { ...payload, type: 'add-note', timestamp: Date.now(), lamportClock: clock });
};

export const sendUpdateNote = (payload: Omit<UpdateNotePayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('update-note', { ...payload, type: 'update-note', timestamp: Date.now(), lamportClock: clock });
};

export const sendMoveNote = (payload: Omit<MoveNotePayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('move-note', { ...payload, type: 'move-note', timestamp: Date.now(), lamportClock: clock });
};

export const sendDeleteNote = (payload: Omit<DeleteNotePayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('delete-note', { ...payload, type: 'delete-note', timestamp: Date.now(), lamportClock: clock });
};

export const sendAddText = (payload: Omit<AddTextPayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('add-text', { ...payload, type: 'add-text', timestamp: Date.now(), lamportClock: clock });
};

export const sendDeleteText = (payload: Omit<DeleteTextPayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('delete-text', { ...payload, type: 'delete-text', timestamp: Date.now(), lamportClock: clock });
};

export const sendClearBoard = (payload: Omit<ClearBoardPayload, 'lamportClock' | 'type' | 'timestamp'>): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('clear-board', { ...payload, type: 'clear-board', timestamp: Date.now(), lamportClock: clock });
};

export const sendAddImage = (payload: {
  roomId: string;
  userId: string;
  imageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
}): void => {
  const clock = incrementLocalLamportClock();
  socket?.emit('add-image', { ...payload, type: 'add-image', timestamp: Date.now(), lamportClock: clock });
};

export const sendEmojiReaction = (payload: {
  roomId: string;
  userId: string;
  username: string;
  color: string;
  emoji: string;
  x: number;
  y: number;
}): void => {
  socket?.emit('emoji-reaction', payload);
};

// Socket event listeners

export const onRoomState = (callback: (payload: RoomStatePayload) => void): (() => void) => {
  socket?.on('room-state', callback);
  return () => socket?.off('room-state', callback);
};

export const onRoomUsers = (callback: (payload: RoomUsersPayload) => void): (() => void) => {
  socket?.on('room-users', callback);
  return () => socket?.off('room-users', callback);
};

export const onUserJoined = (callback: (payload: UserJoinedPayload) => void): (() => void) => {
  socket?.on('user-joined', callback);
  return () => socket?.off('user-joined', callback);
};

export const onUserLeft = (callback: (payload: UserLeftPayload) => void): (() => void) => {
  socket?.on('user-left', callback);
  return () => socket?.off('user-left', callback);
};

export const onDrawStroke = (callback: (payload: DrawStrokePayload) => void): void => {
  socket?.on('draw-stroke', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onDrawShape = (callback: (payload: DrawShapePayload) => void): void => {
  socket?.on('draw-shape', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onCursorMove = (callback: (payload: CursorMovePayload) => void): void => {
  socket?.on('cursor-move', callback);
};

export const onAddNote = (callback: (payload: AddNotePayload) => void): void => {
  socket?.on('add-note', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onUpdateNote = (callback: (payload: UpdateNotePayload) => void): void => {
  socket?.on('update-note', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onMoveNote = (callback: (payload: MoveNotePayload) => void): void => {
  socket?.on('move-note', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onDeleteNote = (callback: (payload: DeleteNotePayload) => void): void => {
  socket?.on('delete-note', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onAddText = (callback: (payload: AddTextPayload) => void): void => {
  socket?.on('add-text', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onDeleteText = (callback: (payload: DeleteTextPayload) => void): void => {
  socket?.on('delete-text', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onClearBoard = (callback: (payload: ClearBoardPayload) => void): void => {
  socket?.on('clear-board', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onMissingEvents = (callback: (payload: { roomId: string; events: any[] }) => void): void => {
  socket?.on('missing-events', callback);
};

export const onAddImage = (callback: (payload: any) => void): void => {
  socket?.on('add-image', (payload) => {
    updateLocalLamportClock(payload.lamportClock);
    callback(payload);
  });
};

export const onEmojiReaction = (callback: (payload: any) => void): void => {
  socket?.on('emoji-reaction', callback);
};

export const disconnectSocket = (): void => {
  currentRoomId = null;
  socket?.disconnect();
  socket = null;
};

export const throttleCursor = (callback: () => void): (() => void) => {
  let lastEmit = 0;
  return () => {
    const now = Date.now();
    if (now - lastEmit >= 30) {
      lastEmit = now;
      callback();
    }
  };
};
