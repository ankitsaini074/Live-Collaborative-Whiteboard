// Shared types for client and server

export interface DrawPoint {
  x: number;
  y: number;
}

export interface Stroke {
  type: 'stroke';
  points: DrawPoint[];
  color: string;
  size: number;
  lamportClock?: number;
}

export interface Shape {
  type: 'rect' | 'circle' | 'line' | 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
  lamportClock?: number;
}

export interface Note {
  noteId: string;
  x: number;
  y: number;
  content: string;
  color: string;
  userId: string;
  lamportClock?: number;
}

export interface Text {
  textId: string;
  type: 'text';
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  lamportClock?: number;
}

export interface RemoteCursor {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  lastSeen: number;
}

// Command pattern for undo/redo
export interface Command {
  execute: () => void;
  undo: () => void;
}

// Socket event payloads
export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  username: string;
  color: string;
  lamportClock?: number;
}

export interface LeaveRoomPayload {
  roomId: string;
  userId: string;
}

export interface DrawStrokePayload {
  roomId: string;
  userId: string;
  stroke: Stroke;
  lamportClock: number;
  timestamp: number;
}

export interface DrawShapePayload {
  roomId: string;
  userId: string;
  shape: Shape;
  lamportClock: number;
  timestamp: number;
}

export interface CursorMovePayload {
  roomId: string;
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

export interface AddNotePayload {
  roomId: string;
  userId: string;
  note: Note;
  lamportClock: number;
  timestamp: number;
}

export interface UpdateNotePayload {
  roomId: string;
  userId: string;
  noteId: string;
  content: string;
  lamportClock: number;
  timestamp: number;
}

export interface MoveNotePayload {
  roomId: string;
  userId: string;
  noteId: string;
  x: number;
  y: number;
  lamportClock: number;
  timestamp: number;
}

export interface DeleteNotePayload {
  roomId: string;
  userId: string;
  noteId: string;
  lamportClock: number;
  timestamp: number;
}

export interface AddTextPayload {
  roomId: string;
  userId: string;
  text: Text;
  lamportClock: number;
  timestamp: number;
}

export interface DeleteTextPayload {
  roomId: string;
  userId: string;
  textId: string;
  lamportClock: number;
  timestamp: number;
}

export interface ClearBoardPayload {
  roomId: string;
  userId: string;
  lamportClock: number;
  timestamp: number;
}

export interface RoomStatePayload {
  roomId: string;
  events: any[];
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
