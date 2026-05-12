// Canvas drawing utilities

export interface DrawPoint {
  x: number;
  y: number;
}

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

  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  ctx.stroke();
};

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

export const clearCanvas = (ctx: CanvasRenderingContext2D): void => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

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

export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  size: number
): void => {
  const headLength = size * 4;
  const angle = Math.atan2(endY - startY, endX - startX);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(endX - headLength * Math.cos(angle - Math.PI / 6), endY - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(endX - headLength * Math.cos(angle + Math.PI / 6), endY - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
};

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

export const drawCursor = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  username: string
): void => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 12, y + 20);
  ctx.lineTo(x + 4, y + 16);
  ctx.lineTo(x + 4, y + 12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'bottom';
  const textWidth = ctx.measureText(username).width;
  ctx.fillRect(x + 4, y + 20, textWidth + 8, 18);

  ctx.fillStyle = 'white';
  ctx.fillText(username, x + 8, y + 36);
};

// Image cache for performance
const imageCache = new Map<string, HTMLImageElement>();

export const drawImage = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  dataUrl: string
): void => {
  let img = imageCache.get(dataUrl);
  if (!img) {
    img = new Image();
    img.src = dataUrl;
    imageCache.set(dataUrl, img);
  }
  if (img.complete) {
    ctx.drawImage(img, x, y, width, height);
  } else {
    img.onload = () => {
      ctx.drawImage(img!, x, y, width, height);
    };
  }
};

export const drawNote = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  content: string,
  color: string
): void => {
  const width = 150;
  const height = 100;

  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(x + 2, y + 2, width, height);

  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#1f2937';
  ctx.font = '14px sans-serif';
  ctx.textBaseline = 'top';

  const maxWidth = width - 16;
  const words = content.split(' ');
  let line = '';
  const lineHeight = 18;
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
  if (line !== '') ctx.fillText(line, x + 8, currentY);
};

/**
 * Resize an image dataUrl to a maximum dimension for performance.
 */
export const resizeImageDataUrl = (dataUrl: string, maxSize = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataUrl;
  });
};

export const exportToPNG = (
  strokes: any[],
  notes: any[],
  width: number,
  height: number
): void => {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  strokes.forEach((item) => {
    if (item.type === 'stroke') {
      if (item.color === 'eraser' || item.color === '#FFFFFF') {
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
    } else if (item.type === 'image') {
      drawImage(ctx, item.x, item.y, item.width, item.height, item.dataUrl);
    }
  });

  notes.forEach((note) => {
    drawNote(ctx, note.x, note.y, note.content, note.color);
  });

  const dataUrl = exportCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `whiteboard-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
};
