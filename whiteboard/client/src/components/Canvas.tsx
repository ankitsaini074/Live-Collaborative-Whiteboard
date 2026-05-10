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
  getTransformedPoint,
} from '../lib/canvas';
import type { Stroke, Shape, Text } from '../store/canvasStore';
import {
  joinRoom,
  leaveRoom,
  sendDrawStroke,
  sendDrawShape,
  sendCursorMove,
  sendAddNote,
  sendUpdateNote,
  sendMoveNote,
  sendDeleteNote,
  sendAddText,
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
} from '../lib/socket';

export function Canvas({ onRoomExpired }: { onRoomExpired?: () => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastCursorPos = useRef<DrawPoint | null>(null);
  const [textInputPos, setTextInputPos] = useState<DrawPoint | null>(null);

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
    addShape,
    addRemoteStroke,
    addRemoteShape,
    addRemoteTextObject,
    addNote,
    updateNote,
    moveNote,
    deleteNote,
    addRemoteNote,
    addText,
    roomId,
    userId,
    username,
    userColor,
    setCurrentShapeStart,
    cleanupOldCursors,
    updateRemoteCursor,
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
    clearCanvas,
    deleteText,
  } = useCanvasStore();

  // Setup canvas context and resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    const handleResize = () => {
      resizeCanvas(canvas);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts: undo/redo, zoom reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLElement && e.target.contentEditable === 'true') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, resetView]);

  // FIX: include zoom and pan in deps so render uses fresh values
  const render = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    strokes.forEach((item) => {
      if (item.type === 'stroke') {
        if (item.color === 'eraser') {
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

    remoteCursors.forEach((cursor) => {
      drawCursor(ctx, cursor.x, cursor.y, cursor.color, cursor.username);
    });

    ctx.restore();
  }, [strokes, remoteCursors, zoom, pan]);

  useEffect(() => {
    render();
  }, [render]);

  // Join room and setup socket listeners — with proper cleanup
  useEffect(() => {
    if (!roomId || !userId || !username) return;

    joinRoom({ roomId, userId, username, color: userColor });

    const handleRoomState = (payload: any) => {
      if (payload.roomId !== roomId) return;
      updateLocalLamportClock(payload.serverLamportClock);

      const localStrokes: (Stroke | Shape | Text)[] = [];
      const localNotes: any[] = [];

      payload.events.forEach((event: any) => {
        if (event.points) {
          localStrokes.push({
            type: 'stroke',
            points: event.points,
            color: event.color,
            size: event.size,
            lamportClock: event.lamportClock,
          });
        } else if (event.type === 'rect' || event.type === 'circle' || event.type === 'line' || event.type === 'arrow') {
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
          localStrokes.push({
            textId: event.textId,
            type: 'text',
            x: event.x,
            y: event.y,
            content: event.content,
            color: event.color,
            fontSize: event.fontSize,
            lamportClock: event.lamportClock,
          });
        } else if (event.noteId && event.type === 'add-note') {
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
      });

      localStrokes.sort((a, b) => (a.lamportClock || 0) - (b.lamportClock || 0));
      localNotes.sort((a: any, b: any) => (a.lamportClock || 0) - (b.lamportClock || 0));
      loadRoomState(localStrokes, localNotes);
    };

    const handleMissingEvents = (payload: any) => {
      if (payload.roomId !== roomId) return;
      payload.events.forEach((event: any) => {
        updateLocalLamportClock(event.lamportClock);
        if (event.points) {
          addRemoteStroke({ type: 'stroke', points: event.points, color: event.color, size: event.size, lamportClock: event.lamportClock });
        } else if (event.type === 'rect' || event.type === 'circle' || event.type === 'line' || event.type === 'arrow') {
          addRemoteShape({ type: event.type, startX: event.startX, startY: event.startY, endX: event.endX, endY: event.endY, color: event.color, size: event.size, lamportClock: event.lamportClock });
        } else if (event.textId) {
          addRemoteTextObject({ textId: event.textId, type: 'text', x: event.x, y: event.y, content: event.content, color: event.color, fontSize: event.fontSize, lamportClock: event.lamportClock });
        }
      });
    };

    const handleDrawStroke = (payload: any) => {
      if (payload.userId !== userId && payload.roomId === roomId) {
        addRemoteStroke({ type: 'stroke', points: payload.points, color: payload.color, size: payload.size, lamportClock: payload.lamportClock });
      }
    };

    const handleDrawShape = (payload: any) => {
      if (payload.userId !== userId && payload.roomId === roomId) {
        addRemoteShape({ type: payload.shapeType, startX: payload.startX, startY: payload.startY, endX: payload.endX, endY: payload.endY, color: payload.color, size: payload.size, lamportClock: payload.lamportClock });
      }
    };

    const handleCursorMove = (payload: any) => {
      if (payload.userId !== userId && payload.roomId === roomId) {
        updateRemoteCursor({ userId: payload.userId, username: payload.username, color: payload.color, x: payload.x, y: payload.y });
      }
    };

    const handleAddNote = (payload: any) => {
      if (payload.roomId === roomId) {
        addRemoteNote({ noteId: payload.noteId, x: payload.x, y: payload.y, content: payload.content, color: payload.color, userId: payload.userId, lamportClock: payload.lamportClock });
      }
    };

    const handleUpdateNote = (payload: any) => {
      if (payload.userId !== userId) updateNote(payload.noteId, payload.content);
    };

    const handleMoveNote = (payload: any) => {
      if (payload.userId !== userId) moveNote(payload.noteId, payload.x, payload.y);
    };

    const handleDeleteNote = (payload: any) => {
      if (payload.userId !== userId) deleteNote(payload.noteId);
    };

    const handleAddText = (payload: any) => {
      if (payload.userId !== userId && payload.roomId === roomId) {
        addRemoteTextObject({ textId: payload.textId, type: 'text', x: payload.x, y: payload.y, content: payload.content, color: payload.color, fontSize: payload.fontSize, lamportClock: payload.lamportClock });
      }
    };

    const handleDeleteText = (payload: any) => {
      if (payload.userId !== userId) deleteText(payload.textId);
    };

    const handleClearBoard = (payload: any) => {
      if (payload.roomId === roomId) clearCanvas();
    };

    onRoomState(handleRoomState);
    onMissingEvents(handleMissingEvents);
    onDrawStroke(handleDrawStroke);
    onDrawShape(handleDrawShape);
    onCursorMove(handleCursorMove);
    onAddNote(handleAddNote);
    onUpdateNote(handleUpdateNote);
    onMoveNote(handleMoveNote);
    onDeleteNote(handleDeleteNote);
    onAddText(handleAddText);
    onDeleteText(handleDeleteText);
    onClearBoard(handleClearBoard);

    const interval = setInterval(() => cleanupOldCursors(), 1000);

    return () => {
      clearInterval(interval);
      leaveRoom({ roomId, userId });
    };
  }, [roomId, userId, username, userColor]);

  // Attach wheel event non-passively for zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const state = useCanvasStore.getState();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, state.zoom * zoomFactor));
      const zoomRatio = newZoom / state.zoom;
      const newPanX = mouseX - (mouseX - state.pan.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - state.pan.y) * zoomRatio;

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [setZoom, setPan]);

  // Create throttled cursor sender
  const sendCursor = useRef(throttleCursor(() => {
    const state = useCanvasStore.getState();
    if (state.roomId && lastCursorPos.current) {
      sendCursorMove({
        roomId: state.roomId,
        userId: state.userId,
        username: state.username,
        color: state.userColor,
        x: lastCursorPos.current.x,
        y: lastCursorPos.current.y,
        timestamp: Date.now(),
      });
    }
  })).current;

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.button === 1) {
      isPanning.current = true;
      panStartPos.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const point = getTransformedPoint(e.nativeEvent, canvas, zoom, pan);

    if (currentTool === 'text') {
      setTextInputPos(point);
      return;
    }

    if (currentTool === 'note') {
      const noteId = crypto.randomUUID();
      addNote({ noteId, x: point.x, y: point.y, content: '', color: '#fef9c3' });
      if (roomId) {
        sendAddNote({ roomId, userId, noteId, x: point.x, y: point.y, content: '', color: '#fef9c3' });
      }
      return;
    }

    canvas.setPointerCapture(e.pointerId);
    startStroke(point);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isPanning.current) {
      setPan(e.clientX - panStartPos.current.x, e.clientY - panStartPos.current.y);
      return;
    }

    const point = getTransformedPoint(e.nativeEvent, canvas, zoom, pan);
    lastCursorPos.current = point;
    sendCursor();

    if (currentStroke.length === 0 && !currentShapeStart) return;

    addPoint(point);
    render();

    const ctx = ctxRef.current;
    if (!ctx) return;

    // FIX: Shape preview — apply same transforms as render()
    if (currentShapeStart && (currentTool === 'rect' || currentTool === 'circle' || currentTool === 'line' || currentTool === 'arrow')) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      ctx.globalAlpha = 0.5;

      if (currentTool === 'rect') drawRect(ctx, currentShapeStart.x, currentShapeStart.y, point.x, point.y, currentColor, currentSize);
      else if (currentTool === 'circle') drawCircle(ctx, currentShapeStart.x, currentShapeStart.y, point.x, point.y, currentColor, currentSize);
      else if (currentTool === 'line') drawLine(ctx, currentShapeStart.x, currentShapeStart.y, point.x, point.y, currentColor, currentSize);
      else if (currentTool === 'arrow') drawArrow(ctx, currentShapeStart.x, currentShapeStart.y, point.x, point.y, currentColor, currentSize);

      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.button === 1) {
      isPanning.current = false;
      canvas.releasePointerCapture(e.pointerId);
      return;
    }

    if (currentStroke.length === 0 && !currentShapeStart) return;

    canvas.releasePointerCapture(e.pointerId);
    const point = getTransformedPoint(e.nativeEvent, canvas, zoom, pan);
    addPoint(point);

    if (currentTool === 'brush' || currentTool === 'eraser') {
      endStroke();
      if (roomId) {
        sendDrawStroke({
          roomId,
          userId,
          points: [...currentStroke, point],
          color: currentTool === 'eraser' ? 'eraser' : currentColor,
          size: currentSize,
        });
      }
    } else if (currentShapeStart && (currentTool === 'rect' || currentTool === 'circle' || currentTool === 'line' || currentTool === 'arrow')) {
      // FIX: Add shape locally AND send over socket
      const clock = useCanvasStore.getState().incrementLamportClock();
      const shape: Shape = {
        type: currentTool,
        startX: currentShapeStart.x,
        startY: currentShapeStart.y,
        endX: point.x,
        endY: point.y,
        color: currentColor,
        size: currentSize,
        lamportClock: clock,
      };
      addShape(shape);
      setCurrentShapeStart(null);
      useCanvasStore.setState({ currentStroke: [] });

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
    }
  };

  const handlePointerLeave = () => {
    if (currentStroke.length > 0) {
      endStroke();
      setCurrentShapeStart(null);
    }
  };

  const getCursor = () => {
    if (isPanning.current) return 'grabbing';
    if (currentTool === 'eraser') return 'cell';
    if (currentTool === 'text') return 'text';
    if (currentTool === 'note') return 'copy';
    return 'crosshair';
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
        style={{ touchAction: 'none', cursor: getCursor() }}
      />
      <StickyNotesOverlay />
      <TextInputOverlay
        position={textInputPos}
        onClose={() => setTextInputPos(null)}
        onConfirm={(content) => {
          if (textInputPos && content.trim()) {
            const textId = crypto.randomUUID();
            addText({ textId, type: 'text', x: textInputPos.x, y: textInputPos.y, content, color: currentColor, fontSize: 16 + currentSize });
            if (roomId) {
              sendAddText({ roomId, userId, textId, x: textInputPos.x, y: textInputPos.y, content, color: currentColor, fontSize: 16 + currentSize });
            }
          }
          setTextInputPos(null);
        }}
      />
    </>
  );
}

function TextInputOverlay({ position, onClose, onConfirm }: {
  position: DrawPoint | null;
  onClose: () => void;
  onConfirm: (content: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (position) {
      setContent('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [position]);

  if (!position) return null;

  return (
    <div className="absolute pointer-events-auto" style={{ left: position.x, top: position.y }}>
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm(content);
          else if (e.key === 'Escape') onClose();
        }}
        onBlur={() => {
          if (content.trim()) onConfirm(content);
          else onClose();
        }}
        className="bg-white/90 border border-blue-400 rounded px-2 py-1 text-sm shadow-lg outline-none min-w-32 backdrop-blur-sm"
        placeholder="Type text…"
      />
    </div>
  );
}

function StickyNotesOverlay() {
  const { notes, updateNote, moveNote, deleteNote, roomId, userId, zoom, pan } = useCanvasStore();

  const handleUpdate = (noteId: string, content: string) => {
    updateNote(noteId, content);
    const note = useCanvasStore.getState().notes.find((n) => n.noteId === noteId);
    if (roomId && note && note.userId === userId) {
      sendUpdateNote({ roomId, userId, noteId, content });
    }
  };

  const handleMove = (noteId: string, dx: number, dy: number) => {
    const note = useCanvasStore.getState().notes.find((n) => n.noteId === noteId);
    if (!note) return;
    const newX = note.x + dx;
    const newY = note.y + dy;
    moveNote(noteId, newX, newY);
    if (roomId && note.userId === userId) {
      sendMoveNote({ roomId, userId, noteId, x: newX, y: newY });
    }
  };

  const handleDelete = (noteId: string, note: any) => {
    deleteNote(noteId);
    if (roomId && note.userId === userId) {
      sendDeleteNote({ roomId, userId, noteId });
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
    >
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

function DraggableNote({ note, isEditable, onUpdate, onMove, onDelete }: {
  note: { noteId: string; x: number; y: number; content: string; color: string; userId?: string };
  isEditable: boolean;
  onUpdate: (noteId: string, content: string) => void;
  onMove: (noteId: string, dx: number, dy: number) => void;
  onDelete?: (noteId: string, note: any) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const zoom = useCanvasStore((state) => state.zoom);

  return (
    <div
      className="absolute pointer-events-auto select-none"
      style={{
        left: note.x,
        top: note.y,
        width: '160px',
        minHeight: '110px',
        backgroundColor: note.color,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.12)',
        borderRadius: '6px',
        padding: '10px',
        cursor: isDragging ? 'grabbing' : 'grab',
        transform: isDragging ? 'rotate(0deg) scale(1.02)' : 'rotate(-0.8deg)',
        transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.2s',
        zIndex: isDragging ? 10 : 1,
      }}
      onMouseDown={(e) => {
        if (e.target instanceof HTMLElement && e.target.contentEditable === 'true') return;
        setIsDragging(true);
        setStartPos({ x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => {
        if (!isDragging) return;
        const dx = (e.clientX - startPos.x) / zoom;
        const dy = (e.clientY - startPos.y) / zoom;
        onMove(note.noteId, dx, dy);
        setStartPos({ x: e.clientX, y: e.clientY });
      }}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {isEditable && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note.noteId, note); }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors leading-none"
          style={{ lineHeight: 1 }}
        >
          ×
        </button>
      )}
      <div
        contentEditable={isEditable}
        suppressContentEditableWarning
        onBlur={(e) => { if (isEditable) onUpdate(note.noteId, e.target.textContent || ''); }}
        className="w-full h-full text-sm text-gray-800 outline-none"
        style={{ minHeight: '80px', fontFamily: 'sans-serif', cursor: 'text' }}
      >
        {note.content}
      </div>
    </div>
  );
}
