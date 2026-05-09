import { useEffect, useRef, useCallback, useState } from 'react';
import { useCanvasStore, type DrawPoint } from '../store/canvasStore';
import {
  drawSmoothStroke,
  drawEraserStroke,
  drawRect,
  drawCircle,
  drawLine,
  drawArrow,
  drawText,
  drawCursor,
  resizeCanvas,
  getCanvasPoint,
  getTransformedPoint,
} from '../lib/canvas';
import type { Stroke, Shape, Text } from '../store/canvasStore';

interface Note {
  noteId: string;
  x: number;
  y: number;
  content: string;
  color: string;
  userId: string;
  lamportClock?: number;
}
import {
  joinRoom,
  sendDrawStroke,
  sendDrawShape,
  sendCursorMove,
  sendAddNote,
  sendUpdateNote,
  sendMoveNote,
  sendDeleteNote,
  sendAddText,
  sendDeleteText,
  onRoomState,
  onDrawStroke,
  onDrawShape,
  onCursorMove,
  onAddNote,
  onUpdateNote,
  onMoveNote,
  onDeleteNote,
  onAddText,
  onDeleteText,
  onClearBoard,
  onMissingEvents,
  throttleCursor,
  updateLocalLamportClock,
  setCurrentRoomId,
  resetLamportClock,
} from '../lib/socket';

export function Canvas({ onRoomExpired }: { onRoomExpired?: () => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastCursorPos = useRef<DrawPoint | null>(null);
  const [textInputPos, setTextInputPos] = useState<DrawPoint | null>(null);

  // Pan state
  const isPanning = useRef(false);
  const panStartPos = useRef({ x: 0, y: 0 });

  const {
    strokes,
    notes,
    currentStroke,
    currentShapeStart,
    currentColor,
    currentSize,
    currentTool,
    remoteCursors,
    startStroke,
    addPoint,
    endStroke,
    addRemoteStroke,
    addRemoteShape,
    addRemoteTextObject,
    addNote,
    updateNote,
    moveNote,
    addRemoteNote,
    addText,
    roomId,
    userId,
    username,
    userColor,
    setCurrentShapeStart,
    cleanupOldCursors,
    updateRemoteCursor,
    removeRemoteCursor,
    undo,
    redo,
    canUndo,
    canRedo,
    loadRoomState,
    zoom,
    pan,
    setZoom,
    setPan,
    resetView,
  } = useCanvasStore();

  // Setup canvas context and resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;

    const handleResize = () => resizeCanvas(canvas);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts for undo/redo (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Ctrl+0 to reset zoom
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, resetView]);

  // Draw helper - renders all content
  const render = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // Apply zoom and pan transforms
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw all strokes and shapes
    strokes.forEach((item) => {
      if (item.type === 'stroke') {
        if (item.color === '#FFFFFF') {
          drawEraserStroke(ctx, item.points, item.size);
        } else {
          drawSmoothStroke(ctx, item.points, item.color, item.size);
        }
      } else if (item.type === 'rect') {
        drawRect(ctx, item.startX, item.startY, item.endX, item.endY, item.color, item.size);
      } else if (item.type === 'circle') {
        drawCircle(ctx, item.startX, item.startY, item.endX, item.endY, item.color, item.size);
      } else if (item.type === 'line') {
        drawLine(ctx, item.startX, item.startY, item.endX, item.endY, item.color, item.size);
      } else if (item.type === 'arrow') {
        drawArrow(ctx, item.startX, item.startY, item.endX, item.endY, item.color, item.size);
      } else if (item.type === 'text') {
        drawText(ctx, item.x, item.y, item.content, item.color, item.fontSize);
      }
    });

    // Draw remote cursors
    remoteCursors.forEach((cursor) => {
      drawCursor(ctx, cursor.x, cursor.y, cursor.color, cursor.username);
    });

    ctx.restore();
  }, [strokes, remoteCursors]);

  // Render when strokes, cursors, zoom, or pan change
  useEffect(() => {
    render();
  }, [render, zoom, pan]);

  // Join room and setup socket listeners
  useEffect(() => {
    if (!roomId || !userId || !username) return;

    joinRoom({ roomId, userId, username, color: userColor });

    // Listen for room state (full state replay)
    onRoomState((payload) => {
      if (payload.roomId === roomId) {
        // Update local Lamport clock to server's clock
        updateLocalLamportClock(payload.serverLamportClock);

        // Convert events to local format
        const localStrokes: (Stroke | Shape | Text)[] = [];
        const localNotes: Note[] = [];

        payload.events.forEach((event: any) => {
          if (event.points) {
            // Draw stroke
            localStrokes.push({
              type: 'stroke',
              points: event.points,
              color: event.color,
              size: event.size,
              lamportClock: event.lamportClock,
            });
          } else if (event.type === 'rect' || event.type === 'circle' || event.type === 'line' || event.type === 'arrow') {
            // Shape
            localStrokes.push({
              type: event.type,
              startX: event.startX,
              startY: event.startY,
              endX: event.endX,
              endY: event.endY,
              color: event.color,
              size: event.size,
              lamportClock: event.lamportClock,
            });
          } else if (event.textId) {
            // Text
            localStrokes.push({
              textId: event.textId,
              x: event.x,
              y: event.y,
              content: event.content,
              color: event.color,
              fontSize: event.fontSize,
              lamportClock: event.lamportClock,
              type: 'text',
            });
          } else if (event.noteId) {
            // Note (add-note)
            if (event.type === 'add-note') {
              localNotes.push({
                noteId: event.noteId,
                x: event.x,
                y: event.y,
                content: event.content,
                color: event.color,
                userId: event.userId,
                lamportClock: event.lamportClock,
              });
            }
          }
        });

        // Load all state at once (with Lamport clock ordering)
        localStrokes.sort((a, b) => (a.lamportClock || 0) - (b.lamportClock || 0));
        localNotes.sort((a, b) => (a.lamportClock || 0) - (b.lamportClock || 0));

        loadRoomState(localStrokes, localNotes);

        // Check if room is expired (no events and server clock is 0)
        if (localStrokes.length === 0 && localNotes.length === 0 && payload.serverLamportClock === 0) {
          // Room may be expired, but we'll allow joining to create new content
          // The 24h TTL is handled by Redis
        }
      }
    });

    // Listen for missing events (for reconnection)
    onMissingEvents((payload) => {
      if (payload.roomId === roomId) {
        // Process missing events similarly to room state
        payload.events.forEach((event: any) => {
          updateLocalLamportClock(event.lamportClock);

          if (event.points) {
            addRemoteStroke({
              type: 'stroke',
              points: event.points,
              color: event.color,
              size: event.size,
              lamportClock: event.lamportClock,
            });
          } else if (event.type === 'rect' || event.type === 'circle' || event.type === 'line' || event.type === 'arrow') {
            addRemoteShape({
              type: event.type,
              startX: event.startX,
              startY: event.startY,
              endX: event.endX,
              endY: event.endY,
              color: event.color,
              size: event.size,
              lamportClock: event.lamportClock,
            });
          } else if (event.textId) {
            addRemoteTextObject({
              textId: event.textId,
              x: event.x,
              y: event.y,
              content: event.content,
              color: event.color,
              fontSize: event.fontSize,
              lamportClock: event.lamportClock,
              type: 'text',
            });
          }
        });
      }
    });

    // Listen for incoming strokes
    onDrawStroke((payload) => {
      if (payload.userId !== userId && payload.roomId === roomId) {
        addRemoteStroke({
          type: 'stroke',
          points: payload.points,
          color: payload.color,
          size: payload.size,
          lamportClock: payload.lamportClock,
        });
      }
    });

    // Listen for incoming shapes
    onDrawShape((payload) => {
      if (payload.userId !== userId && payload.roomId === roomId) {
        addRemoteShape({
          type: payload.shapeType,
          startX: payload.startX,
          startY: payload.startY,
          endX: payload.endX,
          endY: payload.endY,
          color: payload.color,
          size: payload.size,
          lamportClock: payload.lamportClock,
        });
      }
    });

    // Listen for cursor moves
    onCursorMove((payload) => {
      if (payload.userId !== userId && payload.roomId === roomId) {
        updateRemoteCursor({
          userId: payload.userId,
          username: payload.username,
          color: payload.color,
          x: payload.x,
          y: payload.y,
        });
      }
    });

    // Listen for notes
    onAddNote((payload) => {
      if (payload.roomId === roomId) {
        addRemoteNote({
          noteId: payload.noteId,
          x: payload.x,
          y: payload.y,
          content: payload.content,
          color: payload.color,
          userId: payload.userId,
          lamportClock: payload.lamportClock,
        });
      }
    });

    onUpdateNote((payload) => {
      if (payload.userId !== userId) {
        updateNote(payload.noteId, payload.content);
      }
    });

    onMoveNote((payload) => {
      if (payload.userId !== userId) {
        moveNote(payload.noteId, payload.x, payload.y);
      }
    });

    onDeleteNote((payload) => {
      if (payload.userId !== userId) {
        // Delete note
        const notes = get().notes;
        const noteToDelete = notes.find(n => n.noteId === payload.noteId);
        if (noteToDelete) {
          // Remove note by updating the store
          set((state) => ({
            notes: state.notes.filter(n => n.noteId !== payload.noteId),
          }));
        }
      }
    });

    // Listen for text
    onAddText((payload) => {
      if (payload.userId !== userId && payload.roomId === roomId) {
        addRemoteTextObject({
          textId: payload.textId,
          x: payload.x,
          y: payload.y,
          content: payload.content,
          color: payload.color,
          fontSize: payload.fontSize,
          lamportClock: payload.lamportClock,
          type: 'text',
        });
      }
    });

    onDeleteText((payload) => {
      if (payload.userId !== userId) {
        // Delete text
        set((state) => ({
          strokes: state.strokes.filter(s => s.type !== 'text' || (s as Text).textId !== payload.textId),
        }));
      }
    });

    onClearBoard((payload) => {
      if (payload.roomId === roomId) {
        // Clear all content
        set((state) => ({
          strokes: [],
          notes: [],
          undoStack: [],
          redoStack: [],
        }));
      }
    });

    // Cleanup old cursors periodically
    const interval = setInterval(() => {
      cleanupOldCursors();
    }, 1000);

    return () => clearInterval(interval);
  }, [roomId, userId, username, userColor, addRemoteStroke, addRemoteShape, addRemoteTextObject, addRemoteNote, updateNote, moveNote, cleanupOldCursors, loadRoomState, updateRemoteCursor, onRoomExpired]);

  // Helper function to get state from inside useEffect
  const get = useCanvasStore.getState;
  const set = useCanvasStore.setState;

  // Wheel event handler for zooming
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(4, zoom * zoomFactor));

    // Calculate new pan to zoom towards mouse position
    const zoomRatio = newZoom / zoom;
    const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
    const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;

    setZoom(newZoom);
    setPan(newPanX, newPanY);
  };

  // Create throttled cursor sender
  const sendCursor = throttleCursor(() => {
    if (roomId && lastCursorPos.current) {
      sendCursorMove({
        roomId,
        userId,
        username,
        color: userColor,
        x: lastCursorPos.current.x,
        y: lastCursorPos.current.y,
        timestamp: Date.now(),
      });
    }
  });

  // Pointer down handler
  const handlePointerDown = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Middle-click for panning
    if (e.button === 1) {
      isPanning.current = true;
      panStartPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const point = getTransformedPoint(e, canvas, zoom, pan);

    // Text tool click to place
    if (currentTool === 'text') {
      setTextInputPos(point);
      return;
    }

    // Note tool click to add
    if (currentTool === 'note') {
      const noteId = crypto.randomUUID();
      addNote({
        noteId,
        x: point.x,
        y: point.y,
        content: '',
        color: '#FEF3C7',
      });

      if (roomId) {
        sendAddNote({
          roomId,
          userId,
          noteId,
          x: point.x,
          y: point.y,
          content: '',
          color: '#FEF3C7',
        });
      }
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    startStroke(point);
  };

  // Pointer move handler
  const handlePointerMove = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle panning
    if (isPanning.current) {
      const newPanX = e.clientX - panStartPos.current.x;
      const newPanY = e.clientY - panStartPos.current.y;
      setPan(newPanX, newPanY);
      return;
    }

    const point = getTransformedPoint(e, canvas, zoom, pan);

    // Update and send cursor position (always, even when not drawing)
    lastCursorPos.current = point;
    sendCursor();

    if (currentStroke.length === 0 && !currentShapeStart) {
      render(); // Re-render to show cursors
      return;
    }

    const ctx = ctxRef.current;
    if (ctx) {
      addPoint(point);

      // Re-render with preview
      render();

      // Draw preview for shapes
      if (currentShapeStart && (currentTool === 'rect' || currentTool === 'circle' || currentTool === 'line' || currentTool === 'arrow')) {
        ctx.save();
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);

        ctx.globalAlpha = 0.5;
        if (currentTool === 'rect') {
          drawRect(ctx, currentShapeStart.x, currentShapeStart.y, point.x, point.y, currentColor, currentSize);
        } else if (currentTool === 'circle') {
          drawCircle(ctx, currentShapeStart.x, currentShapeStart.y, point.x, point.y, currentColor, currentSize);
        } else if (currentTool === 'line') {
          drawLine(ctx, currentShapeStart.x, currentShapeStart.y, point.x, point.y, currentColor, currentSize);
        } else if (currentTool === 'arrow') {
          drawArrow(ctx, currentShapeStart.x, currentShapeStart.y, point.x, point.y, currentColor, currentSize);
        }

        ctx.restore();
        return; // Skip regular render for shape preview
      }

      // Brush/Eraser preview
      if ((currentTool === 'brush' || currentTool === 'eraser') && currentStroke.length > 0) {
        ctx.save();
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);

        const drawColor = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
        if (drawColor === '#FFFFFF') {
          drawEraserStroke(ctx, [...currentStroke, point], currentSize);
        } else {
          drawSmoothStroke(ctx, [...currentStroke, point], drawColor, currentSize);
        }

        ctx.restore();
      }
    }
  };

  // Pointer up handler
  const handlePointerUp = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Stop panning
    if (e.button === 1) {
      isPanning.current = false;
      canvas.releasePointerCapture(e.pointerId);
      return;
    }

    if (currentStroke.length === 0) return;

    canvas.releasePointerCapture(e.pointerId);

    const point = getTransformedPoint(e, canvas, zoom, pan);
    addPoint(point);

    if (currentTool === 'brush' || currentTool === 'eraser') {
      endStroke();
      if (roomId) {
        sendDrawStroke({
          roomId,
          userId,
          points: [...currentStroke, point],
          color: currentTool === 'eraser' ? '#FFFFFF' : currentColor,
          size: currentSize,
        });
      }
    } else if (currentShapeStart && (currentTool === 'rect' || currentTool === 'circle' || currentTool === 'line' || currentTool === 'arrow')) {
      if (roomId) {
        sendDrawShape({
          roomId,
          userId,
          shapeType: currentTool,
          startX: currentShapeStart.x,
          startY: currentShapeStart.y,
          endX: point.x,
          endY: point.y,
          color: currentColor,
          size: currentSize,
        });
      }
      setCurrentShapeStart(null);
    }
  };

  // Pointer leave handler
  const handlePointerLeave = () => {
    if (currentStroke.length > 0) {
      endStroke();
      setCurrentShapeStart(null);
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
        style={{ touchAction: 'none', cursor: isPanning.current ? 'grabbing' : 'crosshair' }}
      />
      <StickyNotesOverlay />
      <TextInputOverlay
        position={textInputPos}
        onClose={() => setTextInputPos(null)}
        onConfirm={(content) => {
          if (textInputPos && content.trim()) {
            const textId = crypto.randomUUID();
            addText({
              x: textInputPos.x,
              y: textInputPos.y,
              content,
              color: currentColor,
              fontSize: 16 + currentSize,
              textId,
            });
            if (roomId) {
              sendAddText({
                roomId,
                userId,
                textId,
                x: textInputPos.x,
                y: textInputPos.y,
                content,
                color: currentColor,
                fontSize: 16 + currentSize,
              });
            }
          }
          setTextInputPos(null);
        }}
      />
    </>
  );
}

// Text input overlay for text tool
function TextInputOverlay({
  position,
  onClose,
  onConfirm,
}: {
  position: DrawPoint | null;
  onClose: () => void;
  onConfirm: (content: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (position && inputRef.current) {
      inputRef.current.focus();
    }
  }, [position]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm(content);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!position) return null;

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left: position.x, top: position.y }}
    >
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Auto-confirm on blur if there's content
          if (content.trim()) {
            onConfirm(content);
          } else {
            onClose();
          }
        }}
        className="bg-transparent border-b-2 border-blue-500 outline-none text-sm min-w-24"
        style={{ color: 'black' }}
        placeholder="Type and press Enter..."
        autoFocus
      />
    </div>
  );
}

// Sticky notes overlay component
function StickyNotesOverlay() {
  const { notes, updateNote, moveNote, roomId, userId, zoom, pan } = useCanvasStore();

  const handleUpdate = (noteId: string, content: string) => {
    updateNote(noteId, content);
    if (roomId) {
      const note = notes.find((n) => n.noteId === noteId);
      if (note && note.userId === userId) {
        sendUpdateNote({
          roomId,
          userId,
          noteId,
          content,
        });
      }
    }
  };

  const handleMove = (noteId: string, dx: number, dy: number) => {
    const note = notes.find((n) => n.noteId === noteId);
    if (!note) return;

    const newX = note.x + dx;
    const newY = note.y + dy;
    moveNote(noteId, newX, newY);

    if (roomId && note.userId === userId) {
      sendMoveNote({
        roomId,
        userId,
        noteId,
        x: newX,
        y: newY,
      });
    }
  };

  const handleDelete = (noteId: string, note: any) => {
    if (roomId && note.userId === userId) {
      sendDeleteNote({
        roomId,
        userId,
        noteId,
      });
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
      {notes.map((note) => (
        <DraggableNote
          key={note.noteId}
          note={note}
          isEditable={note.userId === userId}
          onUpdate={handleUpdate}
          onMove={handleMove}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

// Draggable sticky note component
function DraggableNote({
  note,
  isEditable,
  onUpdate,
  onMove,
  onDelete,
}: {
  note: { noteId: string; x: number; y: number; content: string; color: string; userId?: string };
  isEditable: boolean;
  onUpdate: (noteId: string, content: string) => void;
  onMove: (noteId: string, dx: number, dy: number) => void;
  onDelete?: (noteId: string, note: any) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const zoom = useCanvasStore((state) => state.zoom);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.contentEditable === 'true') return;
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - startPos.x) / zoom;
    const dy = (e.clientY - startPos.y) / zoom;
    onMove(note.noteId, dx, dy);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (isEditable) {
      onUpdate(note.noteId, e.target.textContent || '');
    }
  };

  return (
    <div
      ref={noteRef}
      className={`absolute pointer-events-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: note.x,
        top: note.y,
        width: '150px',
        minHeight: '100px',
        backgroundColor: note.color,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        borderRadius: '4px',
        padding: '8px',
        transform: 'rotate(-1deg)',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isEditable && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.noteId, note);
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
          style={{ lineHeight: 1 }}
        >
          ×
        </button>
      )}
      <div
        contentEditable={isEditable}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className="w-full h-full outline-none text-sm"
        style={{
          color: '#1f2937',
          fontFamily: 'sans-serif',
          minHeight: '80px',
        }}
      >
        {note.content}
      </div>
    </div>
  );
}
