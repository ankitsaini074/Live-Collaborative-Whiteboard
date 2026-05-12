import { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import {
  drawSmoothStroke,
  drawEraserStroke,
  drawRect,
  drawCircle,
  drawLine,
  drawArrow,
  drawText,
  drawImage,
} from '../lib/canvas';
import type { Stroke, Shape, Text, ImageItem } from '../store/canvasStore';

const MINI_W = 160;
const MINI_H = 100;
const CANVAS_VIRTUAL_W = 3000;
const CANVAS_VIRTUAL_H = 2000;

export function MiniMap({ darkMode }: { darkMode?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);
  const { strokes, zoom, pan, setPan, setZoom } = useCanvasStore();

  // Scale factor: virtual canvas → minimap pixels
  const scaleX = MINI_W / CANVAS_VIRTUAL_W;
  const scaleY = MINI_H / CANVAS_VIRTUAL_H;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINI_W * dpr;
    canvas.height = MINI_H * dpr;
    canvas.style.width = `${MINI_W}px`;
    canvas.style.height = `${MINI_H}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = darkMode ? '#1f2937' : '#f9fafb';
    ctx.fillRect(0, 0, MINI_W, MINI_H);

    // Draw scaled-down strokes
    ctx.save();
    ctx.scale(scaleX, scaleY);

    strokes.forEach((item) => {
      ctx.globalAlpha = 0.85;
      if (item.type === 'stroke') {
        const s = item as Stroke;
        if (s.color === 'eraser') {
          drawEraserStroke(ctx, s.points, s.size);
        } else {
          drawSmoothStroke(ctx, s.points, s.color, Math.max(s.size * 0.5, 1));
        }
      } else if (item.type === 'rect') {
        const s = item as Shape;
        drawRect(ctx, s.startX, s.startY, s.endX, s.endY, s.color, Math.max(s.size * 0.5, 1));
      } else if (item.type === 'circle') {
        const s = item as Shape;
        drawCircle(ctx, s.startX, s.startY, s.endX, s.endY, s.color, Math.max(s.size * 0.5, 1));
      } else if (item.type === 'line') {
        const s = item as Shape;
        drawLine(ctx, s.startX, s.startY, s.endX, s.endY, s.color, Math.max(s.size * 0.5, 1));
      } else if (item.type === 'arrow') {
        const s = item as Shape;
        drawArrow(ctx, s.startX, s.startY, s.endX, s.endY, s.color, Math.max(s.size * 0.5, 1));
      } else if (item.type === 'text') {
        const t = item as Text;
        drawText(ctx, t.x, t.y, t.content, t.color, Math.max(t.fontSize * 0.3, 6));
      } else if (item.type === 'image') {
        const img = item as ImageItem;
        drawImage(ctx, img.x, img.y, img.width, img.height, img.dataUrl);
      }
    });

    ctx.restore();

    // Draw viewport rectangle
    // The viewport in virtual space: top-left = (-pan.x / zoom, -pan.y / zoom)
    // The viewport size in virtual space = (viewportW / zoom, viewportH / zoom)
    const viewW = window.innerWidth;
    const viewH = window.innerHeight - 48; // minus header

    const vpLeft = (-pan.x / zoom) * scaleX;
    const vpTop = (-pan.y / zoom) * scaleY;
    const vpW = (viewW / zoom) * scaleX;
    const vpH = (viewH / zoom) * scaleY;

    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.9;
    ctx.strokeRect(
      Math.max(0, vpLeft),
      Math.max(0, vpTop),
      Math.min(MINI_W - Math.max(0, vpLeft), vpW),
      Math.min(MINI_H - Math.max(0, vpTop), vpH),
    );
    ctx.fillStyle = 'rgba(59,130,246,0.08)';
    ctx.fillRect(
      Math.max(0, vpLeft),
      Math.max(0, vpTop),
      Math.min(MINI_W - Math.max(0, vpLeft), vpW),
      Math.min(MINI_H - Math.max(0, vpTop), vpH),
    );
    ctx.restore();
  }, [strokes, zoom, pan, visible, darkMode, scaleX, scaleY]);

  // Click on minimap to navigate
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Map minimap coords → virtual canvas coords
    const virtualX = mx / scaleX;
    const virtualY = my / scaleY;

    // Center viewport on clicked point
    const viewW = window.innerWidth;
    const viewH = window.innerHeight - 48;

    const newPanX = -(virtualX * zoom) + viewW / 2;
    const newPanY = -(virtualY * zoom) + viewH / 2;
    setPan(newPanX, newPanY);
  };

  const borderColor = darkMode ? '#374151' : '#e5e7eb';
  const bgColor = darkMode ? '#111827' : '#ffffff';

  return (
    <div
      className="fixed bottom-24 right-3 z-40 rounded-xl overflow-hidden shadow-xl border animate-fade-in"
      style={{ borderColor, background: bgColor }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1 border-b"
        style={{ borderColor, background: darkMode ? '#1f2937' : '#f9fafb' }}
      >
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Map
        </span>
        <button
          onClick={() => setVisible((v) => !v)}
          className={`text-[10px] transition-colors ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
        >
          {visible ? 'hide' : 'show'}
        </button>
      </div>

      {visible && (
        <canvas
          ref={canvasRef}
          width={MINI_W}
          height={MINI_H}
          onClick={handleClick}
          className="block cursor-crosshair"
          style={{ width: MINI_W, height: MINI_H }}
          title="Click to navigate"
        />
      )}
    </div>
  );
}
