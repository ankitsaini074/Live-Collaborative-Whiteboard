// Socket.io event types — shared between client and server

// Base event with Lamport clock
interface BaseEvent {
  roomId: string;
  userId: string;
  lamportClock: number; // Logical timestamp for ordering
  timestamp: number; // Real timestamp
}

export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  username: string;
  color: string;
  lamportClock?: number; // Client's current clock
}

export interface LeaveRoomPayload {
  roomId: string;
  userId: string;
}

export interface DrawStrokePayload extends BaseEvent {
  type: 'draw-stroke';
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

export interface CursorMovePayload {
  roomId: string;
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface DrawShapePayload extends BaseEvent {
  type: 'draw-shape';
  shapeType: 'rect' | 'circle' | 'line' | 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
}

export interface AddNotePayload extends BaseEvent {
  type: 'add-note';
  noteId: string;
  x: number;
  y: number;
  content: string;
  color: string;
}

export interface UpdateNotePayload extends BaseEvent {
  type: 'update-note';
  noteId: string;
  content: string;
}

export interface MoveNotePayload extends BaseEvent {
  type: 'move-note';
  noteId: string;
  x: number;
  y: number;
}

export interface DeleteNotePayload extends BaseEvent {
  type: 'delete-note';
  noteId: string;
}

export interface AddTextPayload extends BaseEvent {
  type: 'add-text';
  textId: string;
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
}

export interface DeleteTextPayload extends BaseEvent {
  type: 'delete-text';
  textId: string;
}

export interface ClearBoardPayload extends BaseEvent {
  type: 'clear-board';
}

export interface RoomStatePayload {
  roomId: string;
  events: (DrawStrokePayload | DrawShapePayload | AddNotePayload | UpdateNotePayload |
    MoveNotePayload | DeleteNotePayload | AddTextPayload | DeleteTextPayload | ClearBoardPayload)[];
  serverLamportClock: number;
}

export interface UserJoinedPayload {
  roomId: string;
  userId: string;
  username: string;
  color: string;
}

export interface UserLeftPayload {
  roomId: string;
  userId: string;
}

// Socket event names
export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  DRAW_STROKE: 'draw-stroke',
  DRAW_SHAPE: 'draw-shape',
  CURSOR_MOVE: 'cursor-move',
  ADD_NOTE: 'add-note',
  UPDATE_NOTE: 'update-note',
  MOVE_NOTE: 'move-note',
  DELETE_NOTE: 'delete-note',
  ADD_TEXT: 'add-text',
  DELETE_TEXT: 'delete-text',
  CLEAR_BOARD: 'clear-board',
  ROOM_STATE: 'room-state',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  REQUEST_EVENTS: 'request-events',
  MISSING_EVENTS: 'missing-events',
} as const;

export type SocketEvent =
  | { type: typeof SOCKET_EVENTS.JOIN_ROOM; payload: JoinRoomPayload }
  | { type: typeof SOCKET_EVENTS.LEAVE_ROOM; payload: LeaveRoomPayload }
  | { type: typeof SOCKET_EVENTS.DRAW_STROKE; payload: DrawStrokePayload }
  | { type: typeof SOCKET_EVENTS.DRAW_SHAPE; payload: DrawShapePayload }
  | { type: typeof SOCKET_EVENTS.CURSOR_MOVE; payload: CursorMovePayload }
  | { type: typeof SOCKET_EVENTS.ADD_NOTE; payload: AddNotePayload }
  | { type: typeof SOCKET_EVENTS.UPDATE_NOTE; payload: UpdateNotePayload }
  | { type: typeof SOCKET_EVENTS.MOVE_NOTE; payload: MoveNotePayload }
  | { type: typeof SOCKET_EVENTS.DELETE_NOTE; payload: DeleteNotePayload }
  | { type: typeof SOCKET_EVENTS.ADD_TEXT; payload: AddTextPayload }
  | { type: typeof SOCKET_EVENTS.DELETE_TEXT; payload: DeleteTextPayload }
  | { type: typeof SOCKET_EVENTS.CLEAR_BOARD; payload: ClearBoardPayload }
  | { type: typeof SOCKET_EVENTS.ROOM_STATE; payload: RoomStatePayload }
  | { type: typeof SOCKET_EVENTS.USER_JOINED; payload: UserJoinedPayload }
  | { type: typeof SOCKET_EVENTS.USER_LEFT; payload: UserLeftPayload };

// Shape types
export type ShapeType = 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'note';

// Command types for undo/redo
export type CommandType =
  | 'draw-stroke'
  | 'draw-shape'
  | 'add-note'
  | 'update-note'
  | 'move-note'
  | 'delete-note'
  | 'add-text'
  | 'delete-text'
  | 'clear-board';

export interface Command {
  id: string;
  type: CommandType;
  execute: () => void;
  undo: () => void;
  timestamp: number;
}
