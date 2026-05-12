import { Server as SocketIOServer, Socket } from 'socket.io';
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
} from '../../shared/types';
import { storeDrawEvent, getRoomEvents } from './redis.js';

interface RoomUser {
  userId: string;
  username: string;
  color: string;
  socketId: string;
}

const roomUsers = new Map<string, Map<string, RoomUser>>();
const socketSessions = new Map<string, { roomId: string; userId: string }>();
const roomLamportClocks = new Map<string, number>();

// userId -> socketId for targeted messaging
const userSockets = new Map<string, string>();

const getRoomLamportClock = (roomId: string): number => {
  if (!roomLamportClocks.has(roomId)) roomLamportClocks.set(roomId, 0);
  return roomLamportClocks.get(roomId)!;
};

const updateRoomLamportClock = (roomId: string, clientClock?: number): number => {
  const serverClock = getRoomLamportClock(roomId);
  const maxClock = clientClock ? Math.max(serverClock, clientClock) : serverClock;
  const newClock = maxClock + 1;
  roomLamportClocks.set(roomId, newClock);
  return newClock;
};

const getRoomUsersSnapshot = (roomId: string): UserJoinedPayload[] => {
  const users = roomUsers.get(roomId);
  if (!users) return [];
  return Array.from(users.values()).map(({ userId, username, color }) => ({
    roomId,
    userId,
    username,
    color,
  }));
};

const removeUserFromRoom = (roomId: string, userId: string): boolean => {
  const users = roomUsers.get(roomId);
  if (!users) return false;
  const removed = users.delete(userId);
  if (users.size === 0) roomUsers.delete(roomId);
  return removed;
};

export const handleJoinRoom = async (
  socket: Socket,
  io: SocketIOServer,
  payload: JoinRoomPayload
): Promise<void> => {
  const { roomId, userId, username, color, lamportClock: clientClock } = payload;

  updateRoomLamportClock(roomId, clientClock);
  socket.join(roomId);

  if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
  roomUsers.get(roomId)!.set(userId, { userId, username, color, socketId: socket.id });
  socketSessions.set(socket.id, { roomId, userId });
  userSockets.set(userId, socket.id);

  socket.emit('room-users', {
    roomId,
    users: getRoomUsersSnapshot(roomId),
  } satisfies RoomUsersPayload);

  socket.to(roomId).emit('user-joined', {
    roomId,
    userId,
    username,
    color,
  } satisfies UserJoinedPayload);

  const events = await getRoomEvents(roomId);
  socket.emit('room-state', {
    roomId,
    events: events as RoomStatePayload['events'],
    serverLamportClock: getRoomLamportClock(roomId),
  } satisfies RoomStatePayload);
};

export const handleLeaveRoom = (
  socket: Socket,
  io: SocketIOServer,
  payload: LeaveRoomPayload
): void => {
  const { roomId, userId } = payload;
  const removed = removeUserFromRoom(roomId, userId);
  socketSessions.delete(socket.id);
  userSockets.delete(userId);
  socket.leave(roomId);

  if (removed) {
    socket.to(roomId).emit('user-left', { roomId, userId } satisfies UserLeftPayload);
  }
};

export const handleDrawStroke = async (
  socket: Socket,
  io: SocketIOServer,
  payload: DrawStrokePayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };
  await storeDrawEvent(roomId, eventWithClock);
  socket.to(roomId).emit('draw-stroke', { ...payload, lamportClock: clock });
};

export const handleDrawShape = async (
  socket: Socket,
  io: SocketIOServer,
  payload: DrawShapePayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };
  await storeDrawEvent(roomId, eventWithClock);
  socket.to(roomId).emit('draw-shape', { ...payload, lamportClock: clock });
};

export const handleCursorMove = (
  socket: Socket,
  io: SocketIOServer,
  payload: CursorMovePayload
): void => {
  socket.to(payload.roomId).emit('cursor-move', payload);
};

export const handleAddNote = async (socket: Socket, io: SocketIOServer, payload: AddNotePayload): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  await storeDrawEvent(roomId, { ...eventData, lamportClock: clock, timestamp: Date.now() });
  socket.to(roomId).emit('add-note', { ...payload, lamportClock: clock });
};

export const handleUpdateNote = async (socket: Socket, io: SocketIOServer, payload: UpdateNotePayload): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  await storeDrawEvent(roomId, { ...eventData, lamportClock: clock, timestamp: Date.now() });
  io.to(roomId).emit('update-note', { ...payload, lamportClock: clock });
};

export const handleMoveNote = async (socket: Socket, io: SocketIOServer, payload: MoveNotePayload): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  await storeDrawEvent(roomId, { ...eventData, lamportClock: clock, timestamp: Date.now() });
  io.to(roomId).emit('move-note', { ...payload, lamportClock: clock });
};

export const handleDeleteNote = async (socket: Socket, io: SocketIOServer, payload: DeleteNotePayload): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  await storeDrawEvent(roomId, { ...eventData, lamportClock: clock, timestamp: Date.now() });
  io.to(roomId).emit('delete-note', { ...payload, lamportClock: clock });
};

export const handleAddText = async (socket: Socket, io: SocketIOServer, payload: AddTextPayload): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  await storeDrawEvent(roomId, { ...eventData, lamportClock: clock, timestamp: Date.now() });
  socket.to(roomId).emit('add-text', { ...payload, lamportClock: clock });
};

export const handleDeleteText = async (socket: Socket, io: SocketIOServer, payload: DeleteTextPayload): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  await storeDrawEvent(roomId, { ...eventData, lamportClock: clock, timestamp: Date.now() });
  io.to(roomId).emit('delete-text', { ...payload, lamportClock: clock });
};

export const handleClearBoard = async (socket: Socket, io: SocketIOServer, payload: ClearBoardPayload): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  await storeDrawEvent(roomId, { ...eventData, lamportClock: clock, timestamp: Date.now() });
  io.to(roomId).emit('clear-board', { ...payload, lamportClock: clock });
};

export const handleAddImage = async (socket: Socket, io: SocketIOServer, payload: any): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;
  const clock = updateRoomLamportClock(roomId, clientClock);
  await storeDrawEvent(roomId, { ...eventData, lamportClock: clock, timestamp: Date.now() });
  socket.to(roomId).emit('add-image', { ...payload, lamportClock: clock });
};

export const handleRequestEvents = async (
  socket: Socket,
  payload: { roomId: string; afterClock: number }
): Promise<void> => {
  const { roomId, afterClock } = payload;
  const allEvents = await getRoomEvents(roomId);
  const missingEvents = allEvents.filter((e: any) =>
    e.lamportClock !== undefined && e.lamportClock > afterClock
  );
  socket.emit('missing-events', { roomId, events: missingEvents });
};

// WebRTC signaling handlers
export const handleRTCJoinCall = (socket: Socket, io: SocketIOServer, payload: any): void => {
  const { roomId, userId, username, color } = payload;
  socket.to(roomId).emit('rtc:user-joined-call', { userId, username, color });
};

export const handleRTCLeaveCall = (socket: Socket, io: SocketIOServer, payload: any): void => {
  const { roomId, userId } = payload;
  socket.to(roomId).emit('rtc:user-left-call', { userId });
};

export const handleRTCOffer = (socket: Socket, io: SocketIOServer, payload: any): void => {
  const { targetUserId, offer, fromUserId, roomId } = payload;
  const targetSocketId = userSockets.get(targetUserId);
  if (targetSocketId) {
    io.to(targetSocketId).emit('rtc:offer', { fromUserId, offer, roomId });
  }
};

export const handleRTCAnswer = (socket: Socket, io: SocketIOServer, payload: any): void => {
  const { targetUserId, answer, fromUserId, roomId } = payload;
  const targetSocketId = userSockets.get(targetUserId);
  if (targetSocketId) {
    io.to(targetSocketId).emit('rtc:answer', { fromUserId, answer, roomId });
  }
};

export const handleRTCIceCandidate = (socket: Socket, io: SocketIOServer, payload: any): void => {
  const { targetUserId, candidate, fromUserId, roomId } = payload;
  const targetSocketId = userSockets.get(targetUserId);
  if (targetSocketId) {
    io.to(targetSocketId).emit('rtc:ice-candidate', { fromUserId, candidate, roomId });
  }
};

export const handleRTCMediaState = (socket: Socket, io: SocketIOServer, payload: any): void => {
  const { roomId, userId, audioMuted, videoOff } = payload;
  socket.to(roomId).emit('rtc:media-state', { userId, audioMuted, videoOff });
};

export const handleEmojiReaction = (socket: Socket, io: SocketIOServer, payload: any): void => {
  const { roomId } = payload;
  io.to(roomId).emit('emoji-reaction', payload);
};

export const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket: Socket) => {
    socket.on('join-room', (payload: JoinRoomPayload) => handleJoinRoom(socket, io, payload));
    socket.on('leave-room', (payload: LeaveRoomPayload) => handleLeaveRoom(socket, io, payload));
    socket.on('draw-stroke', (payload: DrawStrokePayload) => handleDrawStroke(socket, io, payload));
    socket.on('draw-shape', (payload: DrawShapePayload) => handleDrawShape(socket, io, payload));
    socket.on('cursor-move', (payload: CursorMovePayload) => handleCursorMove(socket, io, payload));
    socket.on('add-note', (payload: AddNotePayload) => handleAddNote(socket, io, payload));
    socket.on('update-note', (payload: UpdateNotePayload) => handleUpdateNote(socket, io, payload));
    socket.on('move-note', (payload: MoveNotePayload) => handleMoveNote(socket, io, payload));
    socket.on('delete-note', (payload: DeleteNotePayload) => handleDeleteNote(socket, io, payload));
    socket.on('add-text', (payload: AddTextPayload) => handleAddText(socket, io, payload));
    socket.on('delete-text', (payload: DeleteTextPayload) => handleDeleteText(socket, io, payload));
    socket.on('clear-board', (payload: ClearBoardPayload) => handleClearBoard(socket, io, payload));
    socket.on('add-image', (payload: any) => handleAddImage(socket, io, payload));
    socket.on('emoji-reaction', (payload: any) => handleEmojiReaction(socket, io, payload));
    socket.on('request-events', (payload: { roomId: string; afterClock: number }) => handleRequestEvents(socket, payload));

    // WebRTC signaling
    socket.on('rtc:join-call', (payload: any) => handleRTCJoinCall(socket, io, payload));
    socket.on('rtc:leave-call', (payload: any) => handleRTCLeaveCall(socket, io, payload));
    socket.on('rtc:offer', (payload: any) => handleRTCOffer(socket, io, payload));
    socket.on('rtc:answer', (payload: any) => handleRTCAnswer(socket, io, payload));
    socket.on('rtc:ice-candidate', (payload: any) => handleRTCIceCandidate(socket, io, payload));
    socket.on('rtc:media-state', (payload: any) => handleRTCMediaState(socket, io, payload));

    socket.on('disconnect', () => {
      const session = socketSessions.get(socket.id);
      if (!session) return;
      socketSessions.delete(socket.id);
      userSockets.delete(session.userId);

      const removed = removeUserFromRoom(session.roomId, session.userId);
      if (removed) {
        socket.to(session.roomId).emit('user-left', {
          roomId: session.roomId,
          userId: session.userId,
        } satisfies UserLeftPayload);
        // Also notify call participants
        socket.to(session.roomId).emit('rtc:user-left-call', { userId: session.userId });
      }
    });
  });
};
