import { create } from 'zustand';
import type { Command } from '../../../shared/types';

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

export type ToolType = 'brush' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'note';

interface CanvasState {
  strokes: (Stroke | Shape | Text)[];
  notes: Note[];
  currentStroke: DrawPoint[];
  currentShapeStart: DrawPoint | null;
  currentColor: string;
  currentSize: number;
  currentTool: ToolType;

  roomId: string;
  userId: string;
  username: string;
  userColor: string;

  lamportClock: number;
  incrementLamportClock: () => number;
  updateLamportClock: (clock: number) => void;

  remoteCursors: Map<string, RemoteCursor>;

  zoom: number;
  pan: { x: number; y: number };
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;

  undoStack: Command[];
  redoStack: Command[];
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setRoomId: (roomId: string) => void;
  setUserInfo: (userId: string, username: string, color: string) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setTool: (tool: ToolType) => void;
  startStroke: (point: DrawPoint) => void;
  addPoint: (point: DrawPoint) => void;
  endStroke: () => void;
  addShape: (shape: Shape) => void;
  addRemoteStroke: (stroke: Stroke) => void;
  addRemoteShape: (shape: Shape) => void;
  addRemoteText: (text: Text) => void;
  addNote: (note: Omit<Note, 'userId' | 'lamportClock'>) => void;
  updateNote: (noteId: string, content: string) => void;
  moveNote: (noteId: string, x: number, y: number) => void;
  deleteNote: (noteId: string) => void;
  addRemoteNote: (note: Note) => void;
  addText: (text: Omit<Text, 'lamportClock'> & { textId?: string }) => void;
  addRemoteTextObject: (text: Text) => void;
  deleteText: (textId: string) => void;
  clearCanvas: () => void;
  loadRoomState: (strokes: (Stroke | Shape | Text)[], notes: Note[]) => void;

  updateRemoteCursor: (cursor: Omit<RemoteCursor, 'lastSeen'>) => void;
  removeRemoteCursor: (userId: string) => void;
  cleanupOldCursors: () => void;

  setCurrentShapeStart: (point: DrawPoint | null) => void;
}

export const COLORS = [
  '#1a1a1a',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#ffffff',
];

export const NOTE_COLORS = [
  '#fef9c3',
  '#dbeafe',
  '#dcfce7',
  '#fee2e2',
  '#ede9fe',
];

const generateUserColor = (): string => {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  strokes: [],
  notes: [],
  currentStroke: [],
  currentShapeStart: null,
  currentColor: COLORS[0],
  currentSize: 4,
  currentTool: 'brush',
  roomId: '',
  userId: crypto.randomUUID(),
  username: '',
  userColor: generateUserColor(),
  remoteCursors: new Map(),
  lamportClock: 0,
  zoom: 1,
  pan: { x: 0, y: 0 },
  undoStack: [],
  redoStack: [],

  setRoomId: (roomId) => set({ roomId, lamportClock: 0, undoStack: [], redoStack: [], zoom: 1, pan: { x: 0, y: 0 } }),
  setUserInfo: (userId, username, color) => set({ userId, username, userColor: color }),

  // FIX: was `set({ currentTool })` — captured outer scope instead of arg
  setColor: (color) => set({ currentColor: color, currentTool: 'brush' }),
  setSize: (size) => set({ currentSize: size }),
  setTool: (tool) => set({ currentTool: tool }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (x, y) => set({ pan: { x, y } }),
  resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),

  incrementLamportClock: () => {
    const newClock = get().lamportClock + 1;
    set({ lamportClock: newClock });
    return newClock;
  },

  updateLamportClock: (clock) => set((state) => ({
    lamportClock: Math.max(state.lamportClock, clock) + 1,
  })),

  executeCommand: (command) => set((state) => {
    command.execute();
    return {
      undoStack: [...state.undoStack, command],
      redoStack: [],
    };
  }),

  undo: () => set((state) => {
    const { undoStack, redoStack } = state;
    if (undoStack.length === 0) return {};
    const command = undoStack[undoStack.length - 1];
    command.undo();
    return {
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, command],
    };
  }),

  redo: () => set((state) => {
    const { undoStack, redoStack } = state;
    if (redoStack.length === 0) return {};
    const command = redoStack[redoStack.length - 1];
    command.execute();
    return {
      undoStack: [...undoStack, command],
      redoStack: redoStack.slice(0, -1),
    };
  }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  startStroke: (point) => set({ currentStroke: [point], currentShapeStart: point }),
  addPoint: (point) => set((state) => ({
    currentStroke: [...state.currentStroke, point],
  })),

  endStroke: () => set((state) => {
    const { currentStroke, currentTool, currentColor, currentSize } = state;
    const clock = get().incrementLamportClock();

    if ((currentTool === 'brush' || currentTool === 'eraser') && currentStroke.length > 0) {
      const stroke: Stroke = {
        type: 'stroke',
        points: [...currentStroke],
        color: currentTool === 'eraser' ? 'eraser' : currentColor,
        size: currentSize,
        lamportClock: clock,
      };
      return { strokes: [...state.strokes, stroke], currentStroke: [] };
    }

    return { currentStroke: [], currentShapeStart: null };
  }),

  // FIX: separate action to add a locally-drawn shape
  addShape: (shape) => set((state) => ({
    strokes: [...state.strokes, shape],
  })),

  addRemoteStroke: (stroke) => set((state) => {
    if (stroke.lamportClock) get().updateLamportClock(stroke.lamportClock);
    return { strokes: [...state.strokes, stroke] };
  }),

  addRemoteShape: (shape) => set((state) => {
    if (shape.lamportClock) get().updateLamportClock(shape.lamportClock);
    return { strokes: [...state.strokes, shape] };
  }),

  addRemoteText: (text) => set((state) => {
    if (text.lamportClock) get().updateLamportClock(text.lamportClock);
    return { strokes: [...state.strokes, text] };
  }),

  addNote: (note) => set((state) => {
    const clock = get().incrementLamportClock();
    const newNote = { ...note, userId: state.userId, lamportClock: clock };
    return { notes: [...state.notes, newNote] };
  }),

  updateNote: (noteId, content) => set((state) => ({
    notes: state.notes.map((n) => n.noteId === noteId ? { ...n, content } : n),
  })),

  moveNote: (noteId, x, y) => set((state) => ({
    notes: state.notes.map((n) => n.noteId === noteId ? { ...n, x, y } : n),
  })),

  deleteNote: (noteId) => set((state) => ({
    notes: state.notes.filter((n) => n.noteId !== noteId),
  })),

  addRemoteNote: (note) => set((state) => {
    if (note.lamportClock) get().updateLamportClock(note.lamportClock);
    const exists = state.notes.some((n) => n.noteId === note.noteId);
    if (exists) return {};
    return { notes: [...state.notes, note] };
  }),

  addText: (text) => set((state) => {
    const clock = get().incrementLamportClock();
    const newText: Text = {
      textId: text.textId || crypto.randomUUID(),
      type: 'text',
      x: text.x,
      y: text.y,
      content: text.content,
      color: text.color,
      fontSize: text.fontSize,
      lamportClock: clock,
    };
    return { strokes: [...state.strokes, newText] };
  }),

  addRemoteTextObject: (text) => set((state) => {
    if (text.lamportClock) get().updateLamportClock(text.lamportClock);
    return { strokes: [...state.strokes, text] };
  }),

  deleteText: (textId) => set((state) => ({
    strokes: state.strokes.filter((s) => s.type !== 'text' || (s as Text).textId !== textId),
  })),

  clearCanvas: () => set({ strokes: [], notes: [], undoStack: [], redoStack: [] }),

  loadRoomState: (strokes, notes) => set(() => {
    let maxClock = 0;
    [...strokes, ...notes].forEach((item) => {
      const clock = 'lamportClock' in item && item.lamportClock ? item.lamportClock : 0;
      maxClock = Math.max(maxClock, clock);
    });
    return { strokes, notes, lamportClock: maxClock, undoStack: [], redoStack: [] };
  }),

  updateRemoteCursor: (cursor) => set((state) => {
    const newCursors = new Map(state.remoteCursors);
    newCursors.set(cursor.userId, { ...cursor, lastSeen: Date.now() });
    return { remoteCursors: newCursors };
  }),

  removeRemoteCursor: (userId) => set((state) => {
    const newCursors = new Map(state.remoteCursors);
    newCursors.delete(userId);
    return { remoteCursors: newCursors };
  }),

  cleanupOldCursors: () => set((state) => {
    const now = Date.now();
    const timeout = 5000;
    const newCursors = new Map<string, RemoteCursor>();
    for (const [uid, cursor] of state.remoteCursors) {
      if (now - cursor.lastSeen < timeout) newCursors.set(uid, cursor);
    }
    return { remoteCursors: newCursors };
  }),

  setCurrentShapeStart: (point) => set({ currentShapeStart: point }),
}));
