import { create } from 'zustand';
import type { Command } from '../../../shared/types';

// Draw types
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
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  lamportClock?: number;
}

// Remote cursor tracking
export interface RemoteCursor {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  lastSeen: number;
}

// Tool types
export type ToolType = 'brush' | 'eraser' | 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'note';

interface CanvasState {
  // Drawing state
  strokes: (Stroke | Shape | Text)[];
  notes: Note[];
  currentStroke: DrawPoint[];
  currentShapeStart: DrawPoint | null;
  currentColor: string;
  currentSize: number;
  currentTool: ToolType;

  // Room and user info
  roomId: string;
  userId: string;
  username: string;
  userColor: string;

  // Lamport clock for event ordering
  lamportClock: number;
  incrementLamportClock: () => number;
  updateLamportClock: (clock: number) => void;

  // Remote cursors
  remoteCursors: Map<string, RemoteCursor>;

  // Zoom and pan
  zoom: number;
  pan: { x: number; y: number };
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;

  // Undo/redo
  undoStack: Command[];
  redoStack: Command[];
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions
  setRoomId: (roomId: string) => void;
  setUserInfo: (userId: string, username: string, color: string) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  setTool: (tool: ToolType) => void;
  startStroke: (point: DrawPoint) => void;
  addPoint: (point: DrawPoint) => void;
  endStroke: () => void;
  addRemoteStroke: (stroke: Stroke) => void;
  addRemoteShape: (shape: Shape) => void;
  addRemoteText: (text: Text) => void;
  addNote: (note: Omit<Note, 'userId' | 'lamportClock'>) => void;
  updateNote: (noteId: string, content: string, oldContent?: string) => void;
  moveNote: (noteId: string, x: number, y: number, oldX?: number, oldY?: number) => void;
  deleteNote: (noteId: string, note?: Note) => void;
  addRemoteNote: (note: Note) => void;
  addText: (text: Omit<Text, 'textId' | 'lamportClock'> & { textId?: string }) => void;
  addRemoteTextObject: (text: Text) => void;
  deleteText: (textId: string, text?: Text) => void;
  clearCanvas: () => void;
  loadRoomState: (strokes: (Stroke | Shape | Text)[], notes: Note[]) => void;

  // Cursor actions
  updateRemoteCursor: (cursor: Omit<RemoteCursor, 'lastSeen'>) => void;
  removeRemoteCursor: (userId: string) => void;
  cleanupOldCursors: () => void;

  // Current shape preview
  setCurrentShapeStart: (point: DrawPoint | null) => void;
}

// Preset color palette
export const COLORS = [
  '#000000', // black
  '#FF0000', // red
  '#FF7F00', // orange
  '#FFFF00', // yellow
  '#00FF00', // green
  '#0000FF', // blue
  '#8B00FF', // violet
  '#FFFFFF', // white
];

// Note colors
export const NOTE_COLORS = [
  '#FEF3C7', // yellow
  '#DBEAFE', // blue
  '#D1FAE5', // green
  '#FEE2E2', // red
  '#EDE9FE', // purple
];

// Generate random color for user
const generateUserColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
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

  setColor: (color) => set({ currentColor: color, currentTool: 'brush' }),
  setSize: (size) => set({ currentSize: size }),
  setTool: (tool) => set({ currentTool }),

  // Zoom and pan
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setPan: (x, y) => set({ pan: { x, y } }),
  resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),

  // Lamport clock management
  incrementLamportClock: () => {
    const newClock = get().lamportClock + 1;
    set({ lamportClock: newClock });
    return newClock;
  },

  updateLamportClock: (clock) => set((state) => ({
    lamportClock: Math.max(state.lamportClock, clock) + 1,
  })),

  // Command execution for undo/redo
  executeCommand: (command) => set((state) => {
    command.execute();
    return {
      undoStack: [...state.undoStack, command],
      redoStack: [], // Clear redo stack on new command
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
    const { currentStroke, currentShapeStart, currentTool, currentColor, currentSize, incrementLamportClock } = state;
    const clock = incrementLamportClock();

    if (currentTool === 'brush' || currentTool === 'eraser') {
      if (currentStroke.length === 0) return {};

      const stroke: Stroke = {
        type: 'stroke',
        points: [...currentStroke],
        color: currentTool === 'eraser' ? '#FFFFFF' : currentColor,
        size: currentSize,
        lamportClock: clock,
      };

      return {
        strokes: [...state.strokes, stroke],
        currentStroke: [],
      };
    } else if (currentShapeStart) {
      // Shape tools
      const lastPoint = currentStroke[currentStroke.length - 1] || currentShapeStart;
      const shape: Shape = {
        type: currentTool,
        startX: currentShapeStart.x,
        startY: currentShapeStart.y,
        endX: lastPoint.x,
        endY: lastPoint.y,
        color: currentColor,
        size: currentSize,
        lamportClock: clock,
      };

      return {
        strokes: [...state.strokes, shape],
        currentStroke: [],
        currentShapeStart: null,
      };
    }

    return { currentStroke: [], currentShapeStart: null };
  }),

  addRemoteStroke: (stroke) => set((state) => {
    // Update Lamport clock on remote event
    if (stroke.lamportClock) {
      get().updateLamportClock(stroke.lamportClock);
    }
    return { strokes: [...state.strokes, stroke] };
  }),

  addRemoteShape: (shape) => set((state) => {
    if (shape.lamportClock) {
      get().updateLamportClock(shape.lamportClock);
    }
    return { strokes: [...state.strokes, shape] };
  }),

  addRemoteText: (text) => set((state) => {
    if (text.lamportClock) {
      get().updateLamportClock(text.lamportClock);
    }
    return { strokes: [...state.strokes, text] };
  }),

  addNote: (note) => set((state) => {
    const clock = get().incrementLamportClock();
    const newNote = { ...note, userId: state.userId, lamportClock: clock };
    return { notes: [...state.notes, newNote] };
  }),

  updateNote: (noteId, content, oldContent) => set((state) => {
    return {
      notes: state.notes.map((n) => (n.noteId === noteId ? { ...n, content } : n)),
    };
  }),

  moveNote: (noteId, x, y, oldX, oldY) => set((state) => {
    return {
      notes: state.notes.map((n) => (n.noteId === noteId ? { ...n, x, y } : n)),
    };
  }),

  deleteNote: (noteId, note) => set((state) => {
    return {
      notes: state.notes.filter((n) => n.noteId !== noteId),
    };
  }),

  addRemoteNote: (note) => set((state) => {
    if (note.lamportClock) {
      get().updateLamportClock(note.lamportClock);
    }
    return { notes: [...state.notes, note] };
  }),

  addText: (text) => set((state) => {
    const clock = get().incrementLamportClock();
    const newText: Text = {
      textId: text.textId || crypto.randomUUID(),
      x: text.x,
      y: text.y,
      content: text.content,
      color: text.color,
      fontSize: text.fontSize,
      lamportClock: clock,
    };

    return {
      strokes: [...state.strokes, newText],
    };
  }),

  addRemoteTextObject: (text) => set((state) => {
    if (text.lamportClock) {
      get().updateLamportClock(text.lamportClock);
    }
    return { strokes: [...state.strokes, text] };
  }),

  deleteText: (textId, text) => set((state) => ({
    strokes: state.strokes.filter((s) => s.type !== 'text' || (s as Text).textId !== textId),
  })),

  clearCanvas: () => set({ strokes: [], notes: [], undoStack: [], redoStack: [] }),

  loadRoomState: (strokes, notes) => set((state) => {
    // Update Lamport clock to max of all events
    let maxClock = 0;
    [...strokes, ...notes].forEach((item) => {
      const clock = 'lamportClock' in item && item.lamportClock ? item.lamportClock : 0;
      maxClock = Math.max(maxClock, clock);
    });

    return {
      strokes,
      notes,
      lamportClock: maxClock,
      undoStack: [], // Clear undo stack on state load
      redoStack: [],
    };
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
    const timeout = 5000; // 5 seconds
    const newCursors = new Map<string, RemoteCursor>();

    for (const [userId, cursor] of state.remoteCursors) {
      if (now - cursor.lastSeen < timeout) {
        newCursors.set(userId, cursor);
      }
    }

    return { remoteCursors: newCursors };
  }),

  setCurrentShapeStart: (point) => set({ currentShapeStart: point }),
}));

// export { COLORS, NOTE_COLORS };
