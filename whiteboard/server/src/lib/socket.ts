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
  UserJoinedPayload,
  UserLeftPayload,
} from '../../shared/types';
import { storeDrawEvent, getRoomEvents } from './redis.js';

// Map of room -> set of connected users
const roomUsers = new Map<string, Set<string>>();
// Map of room -> current Lamport clock
const roomLamportClocks = new Map<string, number>();

/**
 * Get or create Lamport clock for a room.
 */
const getRoomLamportClock = (roomId: string): number => {
  if (!roomLamportClocks.has(roomId)) {
    roomLamportClocks.set(roomId, 0);
  }
  return roomLamportClocks.get(roomId)!;
};

/**
 * Increment Lamport clock for a room.
 */
const incrementRoomLamportClock = (roomId: string): number => {
  const clock = getRoomLamportClock(roomId);
  const newClock = clock + 1;
  roomLamportClocks.set(roomId, newClock);
  return newClock;
};

/**
 * Update Lamport clock based on client's clock.
 * Takes max of server clock and client clock, then increments.
 */
const updateRoomLamportClock = (roomId: string, clientClock?: number): number => {
  const serverClock = getRoomLamportClock(roomId);
  const maxClock = clientClock ? Math.max(serverClock, clientClock) : serverClock;
  const newClock = maxClock + 1;
  roomLamportClocks.set(roomId, newClock);
  return newClock;
};

/**
 * Handle join-room event.
 * Adds user to room tracking, broadcasts to others, sends history.
 */
export const handleJoinRoom = async (
  socket: Socket,
  io: SocketIOServer,
  payload: JoinRoomPayload
): Promise<void> => {
  const { roomId, userId, username, color, lamportClock: clientClock } = payload;

  // Update Lamport clock
  const serverClock = updateRoomLamportClock(roomId, clientClock);

  // Join socket.io room
  socket.join(roomId);

  // Track user locally
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Set());
  }
  roomUsers.get(roomId)!.add(userId);

  // Notify others in room
  socket.to(roomId).emit('user-joined', {
    roomId,
    userId,
    username,
    color,
  } satisfies UserJoinedPayload);

  // Send room history (draw events) to new user
  const events = await getRoomEvents(roomId);
  socket.emit('room-state', {
    roomId,
    events: events as RoomStatePayload['events'],
    serverLamportClock: getRoomLamportClock(roomId),
  } satisfies RoomStatePayload);
};

/**
 * Handle leave-room event.
 * Removes user from tracking, broadcasts to others.
 */
export const handleLeaveRoom = (
  socket: Socket,
  io: SocketIOServer,
  payload: LeaveRoomPayload
): void => {
  const { roomId, userId } = payload;

  // Remove from local tracking
  const users = roomUsers.get(roomId);
  if (users) {
    users.delete(userId);
    if (users.size === 0) {
      roomUsers.delete(roomId);
      // Optionally keep room data for TTL expiry
    }
  }

  // Leave socket.io room
  socket.leave(roomId);

  // Notify others
  socket.to(roomId).emit('user-left', {
    roomId,
    userId,
  } satisfies UserLeftPayload);
};

/**
 * Handle draw-stroke event.
 * Stores to Redis, broadcasts to room.
 */
export const handleDrawStroke = async (
  socket: Socket,
  io: SocketIOServer,
  payload: DrawStrokePayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  // Update Lamport clock and assign to event
  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  // Store to Redis
  await storeDrawEvent(roomId, eventWithClock);

  // Broadcast to room (excluding sender) with server's clock
  socket.to(roomId).emit('draw-stroke', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle draw-shape event.
 * Stores to Redis, broadcasts to room.
 */
export const handleDrawShape = async (
  socket: Socket,
  io: SocketIOServer,
  payload: DrawShapePayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  await storeDrawEvent(roomId, eventWithClock);

  socket.to(roomId).emit('draw-shape', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle cursor-move event.
 * Broadcasts to room without storing (transient).
 */
export const handleCursorMove = (
  socket: Socket,
  io: SocketIOServer,
  payload: CursorMovePayload
): void => {
  // Broadcast to room (excluding sender) - no storage
  socket.to(payload.roomId).emit('cursor-move', payload);
};

/**
 * Handle add-note event.
 * Stores to Redis, broadcasts to room.
 */
export const handleAddNote = async (
  socket: Socket,
  io: SocketIOServer,
  payload: AddNotePayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  await storeDrawEvent(roomId, eventWithClock);

  socket.to(roomId).emit('add-note', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle update-note event.
 * Stores to Redis, broadcasts to room.
 */
export const handleUpdateNote = async (
  socket: Socket,
  io: SocketIOServer,
  payload: UpdateNotePayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  await storeDrawEvent(roomId, eventWithClock);

  io.to(roomId).emit('update-note', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle move-note event.
 * Stores to Redis, broadcasts to room.
 */
export const handleMoveNote = async (
  socket: Socket,
  io: SocketIOServer,
  payload: MoveNotePayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  await storeDrawEvent(roomId, eventWithClock);

  io.to(roomId).emit('move-note', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle delete-note event.
 * Stores to Redis, broadcasts to room.
 */
export const handleDeleteNote = async (
  socket: Socket,
  io: SocketIOServer,
  payload: DeleteNotePayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  await storeDrawEvent(roomId, eventWithClock);

  io.to(roomId).emit('delete-note', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle add-text event.
 * Stores to Redis, broadcasts to room.
 */
export const handleAddText = async (
  socket: Socket,
  io: SocketIOServer,
  payload: AddTextPayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  await storeDrawEvent(roomId, eventWithClock);

  socket.to(roomId).emit('add-text', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle delete-text event.
 * Stores to Redis, broadcasts to room.
 */
export const handleDeleteText = async (
  socket: Socket,
  io: SocketIOServer,
  payload: DeleteTextPayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  await storeDrawEvent(roomId, eventWithClock);

  io.to(roomId).emit('delete-text', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle clear-board event.
 * Stores to Redis, broadcasts to room.
 */
export const handleClearBoard = async (
  socket: Socket,
  io: SocketIOServer,
  payload: ClearBoardPayload
): Promise<void> => {
  const { roomId, lamportClock: clientClock, ...eventData } = payload;

  const clock = updateRoomLamportClock(roomId, clientClock);
  const eventWithClock = { ...eventData, lamportClock: clock, timestamp: Date.now() };

  await storeDrawEvent(roomId, eventWithClock);

  io.to(roomId).emit('clear-board', {
    ...payload,
    lamportClock: clock,
  });
};

/**
 * Handle request-events event for reconnection.
 * Sends events after a specific Lamport clock.
 */
export const handleRequestEvents = async (
  socket: Socket,
  payload: { roomId: string; afterClock: number }
): Promise<void> => {
  const { roomId, afterClock } = payload;
  const allEvents = await getRoomEvents(roomId);

  // Filter events with Lamport clock greater than afterClock
  const missingEvents = allEvents.filter((e: any) =>
    e.lamportClock !== undefined && e.lamportClock > afterClock
  );

  socket.emit('missing-events', {
    roomId,
    events: missingEvents,
  });
};

/**
 * Set up all Socket.io event handlers.
 */
export const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket: Socket) => {
    // Join room
    socket.on('join-room', (payload: JoinRoomPayload) => {
      handleJoinRoom(socket, io, payload);
    });

    // Leave room
    socket.on('leave-room', (payload: LeaveRoomPayload) => {
      handleLeaveRoom(socket, io, payload);
    });

    // Draw stroke
    socket.on('draw-stroke', (payload: DrawStrokePayload) => {
      handleDrawStroke(socket, io, payload);
    });

    // Draw shape
    socket.on('draw-shape', (payload: DrawShapePayload) => {
      handleDrawShape(socket, io, payload);
    });

    // Cursor move
    socket.on('cursor-move', (payload: CursorMovePayload) => {
      handleCursorMove(socket, io, payload);
    });

    // Add note
    socket.on('add-note', (payload: AddNotePayload) => {
      handleAddNote(socket, io, payload);
    });

    // Update note
    socket.on('update-note', (payload: UpdateNotePayload) => {
      handleUpdateNote(socket, io, payload);
    });

    // Move note
    socket.on('move-note', (payload: MoveNotePayload) => {
      handleMoveNote(socket, io, payload);
    });

    // Delete note
    socket.on('delete-note', (payload: DeleteNotePayload) => {
      handleDeleteNote(socket, io, payload);
    });

    // Add text
    socket.on('add-text', (payload: AddTextPayload) => {
      handleAddText(socket, io, payload);
    });

    // Delete text
    socket.on('delete-text', (payload: DeleteTextPayload) => {
      handleDeleteText(socket, io, payload);
    });

    // Clear board
    socket.on('clear-board', (payload: ClearBoardPayload) => {
      handleClearBoard(socket, io, payload);
    });

    // Request events (for reconnection)
    socket.on('request-events', (payload: { roomId: string; afterClock: number }) => {
      handleRequestEvents(socket, payload);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Could track user's rooms here to auto-leave
      // For now, users must explicitly leave or room tracking times out
    });
  });
};
