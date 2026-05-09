// Canvas drawing utilities

export interface DrawPoint {
  x: number;
  y: number;
}

/**
 * Smooth freehand stroke using quadratic bezier curves.
 * Much smoother than straight lineTo segments.
 */
export const drawSmoothStroke = (
  ctx: CanvasRenderingContext2D,
  points: DrawPoint[],
  color: string,
  size: number
): void => {
  if (points.length < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }

  // Draw final line segment
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
};

/**
 * Eraser uses destination-out composite to clear pixels.
 * Never use white color — it doesn't clear properly over layers.
 */
export const drawEraserStroke = (
  ctx: CanvasRenderingContext2D,
  points: DrawPoint[],
  size: number
): void => {
  const prevComposite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'destination-out';

  drawSmoothStroke(ctx, points, 'rgba(0,0,0,1)', size);

  ctx.globalCompositeOperation = prevComposite;
};

/**
 * Clear entire canvas
 */
export const clearCanvas = (ctx: CanvasRenderingContext2D): void => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

/**
 * Resize canvas to fill parent while maintaining pixel density
 */
export const resizeCanvas = (canvas: HTMLCanvasElement): void => {
  const rect = canvas.parentElement?.getBoundingClientRect();
  if (!rect) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
};

/**
 * Get canvas coordinates from pointer event
 * Handles offset from canvas position
 */
export const getCanvasPoint = (
  event: PointerEvent,
  canvas: HTMLCanvasElement
): DrawPoint => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};

/**
 * Get transformed canvas coordinates accounting for zoom and pan
 */
export const getTransformedPoint = (
  event: PointerEvent,
  canvas: HTMLCanvasElement,
  zoom: number,
  pan: { x: number; y: number }
): DrawPoint => {
  const point = getCanvasPoint(event, canvas);
  return {
    x: (point.x - pan.x) / zoom,
    y: (point.y - pan.y) / zoom,
  };
};

/**
 * Draw rectangle shape
 */
export const drawRect = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  size: number
): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';

  ctx.strokeRect(startX, startY, endX - startX, endY - startY);
};

/**
 * Draw circle shape
 */
export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  size: number
): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';

  const centerX = startX;
  const centerY = startY;
  const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
};

/**
 * Draw line shape
 */
export const drawLine = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  size: number
): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
};

/**
 * Draw arrow shape
 */
export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  size: number
): void => {
  const headLength = size * 4; // Arrow head size based on line thickness
  const angle = Math.atan2(endY - startY, endX - startX);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw line
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Draw arrow head
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
};

/**
 * Draw text on canvas
 */
export const drawText = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  content: string,
  color: string,
  fontSize: number
): void => {
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(content, x, y);
};

/**
 * Draw remote cursor
 */
export const drawCursor = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  username: string
): void => {
  // Cursor triangle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 12, y + 20);
  ctx.lineTo(x + 4, y + 16);
  ctx.lineTo(x + 4, y + 12);
  ctx.closePath();
  ctx.fill();

  // Cursor border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Username label
  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'bottom';
  const textWidth = ctx.measureText(username).width;
  ctx.fillRect(x + 4, y + 20, textWidth + 8, 18);

  // Username text
  ctx.fillStyle = 'white';
  ctx.fillText(username, x + 8, y + 36);
};

/**
 * Draw sticky note
 */
export const drawNote = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  content: string,
  color: string
): void => {
  const width = 150;
  const height = 100;

  // Note background
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  // Note shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(x + 2, y + 2, width, height);

  // Note border
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Note text
  ctx.fillStyle = '#1f2937';
  ctx.font = '14px sans-serif';
  ctx.textBaseline = 'top';

  // Wrap text to fit in note
  const maxWidth = width - 16;
  const words = content.split(' ');
  let line = '';
  let lineHeight = 18;
  let currentY = y + 8;

  words.forEach((word) => {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, x + 8, currentY);
      line = word + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });
  if (line !== '') {
    ctx.fillText(line, x + 8, currentY);
  }
};

/**
 * Export canvas to PNG
 * Creates an offscreen canvas, draws all content, and triggers download
 */
export const exportToPNG = (
  strokes: any[],
  notes: any[],
  width: number,
  height: number
): void => {
  // Create offscreen canvas
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  // Fill white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Draw all strokes
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

  // Draw all notes
  notes.forEach((note) => {
    drawNote(ctx, note.x, note.y, note.content, note.color);
  });

  // Convert to PNG and download
  const dataUrl = exportCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `whiteboard-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
};
