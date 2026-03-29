import { Shape, Viewport } from './types';

export function screenToCanvas(sx: number, sy: number, vp: Viewport): { x: number; y: number } {
  return {
    x: (sx - vp.x) / vp.zoom,
    y: (sy - vp.y) / vp.zoom,
  };
}

export function canvasToScreen(cx: number, cy: number, vp: Viewport): { x: number; y: number } {
  return {
    x: cx * vp.zoom + vp.x,
    y: cy * vp.zoom + vp.y,
  };
}

export function getBoundingBox(shape: Shape): { x: number; y: number; w: number; h: number } {
  switch (shape.type) {
    case 'rectangle':
    case 'ellipse': {
      const w = shape.width ?? 0;
      const h = shape.height ?? 0;
      return {
        x: w < 0 ? shape.x + w : shape.x,
        y: h < 0 ? shape.y + h : shape.y,
        w: Math.abs(w),
        h: Math.abs(h),
      };
    }
    case 'line':
    case 'arrow': {
      const x2 = shape.x2 ?? shape.x;
      const y2 = shape.y2 ?? shape.y;
      return {
        x: Math.min(shape.x, x2),
        y: Math.min(shape.y, y2),
        w: Math.abs(x2 - shape.x),
        h: Math.abs(y2 - shape.y),
      };
    }
    case 'freehand': {
      const pts = shape.points ?? [];
      if (pts.length === 0) return { x: shape.x, y: shape.y, w: 0, h: 0 };
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        w: Math.max(...xs) - minX,
        h: Math.max(...ys) - minY,
      };
    }
  }
}

function distPointToSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const abx = bx - ax, aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / len2));
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
}

export function hitTest(shape: Shape, cx: number, cy: number, zoom: number): boolean {
  const threshold = 8 / zoom;

  switch (shape.type) {
    case 'rectangle':
    case 'ellipse': {
      const bb = getBoundingBox(shape);
      const pad = threshold;
      return (
        cx >= bb.x - pad &&
        cx <= bb.x + bb.w + pad &&
        cy >= bb.y - pad &&
        cy <= bb.y + bb.h + pad
      );
    }
    case 'line':
    case 'arrow': {
      const x2 = shape.x2 ?? shape.x;
      const y2 = shape.y2 ?? shape.y;
      return distPointToSegment(cx, cy, shape.x, shape.y, x2, y2) <= threshold;
    }
    case 'freehand': {
      const bb = getBoundingBox(shape);
      if (
        cx < bb.x - threshold || cx > bb.x + bb.w + threshold ||
        cy < bb.y - threshold || cy > bb.y + bb.h + threshold
      ) return false;
      const pts = shape.points ?? [];
      for (let i = 0; i < pts.length - 1; i++) {
        if (distPointToSegment(cx, cy, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= threshold) {
          return true;
        }
      }
      return false;
    }
  }
}

export function getResizeHandles(shape: Shape): { id: string; x: number; y: number }[] {
  const bb = getBoundingBox(shape);
  if (shape.type === 'line' || shape.type === 'arrow') {
    return [
      { id: 'start', x: shape.x, y: shape.y },
      { id: 'end', x: shape.x2 ?? shape.x, y: shape.y2 ?? shape.y },
    ];
  }
  return [
    { id: 'nw', x: bb.x, y: bb.y },
    { id: 'n', x: bb.x + bb.w / 2, y: bb.y },
    { id: 'ne', x: bb.x + bb.w, y: bb.y },
    { id: 'e', x: bb.x + bb.w, y: bb.y + bb.h / 2 },
    { id: 'se', x: bb.x + bb.w, y: bb.y + bb.h },
    { id: 's', x: bb.x + bb.w / 2, y: bb.y + bb.h },
    { id: 'sw', x: bb.x, y: bb.y + bb.h },
    { id: 'w', x: bb.x, y: bb.y + bb.h / 2 },
  ];
}

export function applyResize(
  shape: Shape,
  handleId: string,
  dx: number,
  dy: number
): Partial<Shape> {
  if (shape.type === 'line' || shape.type === 'arrow') {
    if (handleId === 'start') return { x: shape.x + dx, y: shape.y + dy };
    return { x2: (shape.x2 ?? shape.x) + dx, y2: (shape.y2 ?? shape.y) + dy };
  }

  const bb = getBoundingBox(shape);
  let { x, y, w, h } = bb;

  if (handleId.includes('e')) w += dx;
  if (handleId.includes('s')) h += dy;
  if (handleId.includes('w')) { x += dx; w -= dx; }
  if (handleId.includes('n')) { y += dy; h -= dy; }

  return { x, y, width: w, height: h };
}

export function normalizeShape(shape: Shape): Shape {
  if (shape.type === 'rectangle' || shape.type === 'ellipse') {
    const w = shape.width ?? 0;
    const h = shape.height ?? 0;
    return {
      ...shape,
      x: w < 0 ? shape.x + w : shape.x,
      y: h < 0 ? shape.y + h : shape.y,
      width: Math.abs(w),
      height: Math.abs(h),
    };
  }
  return shape;
}

export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, 0.05), 20);
}
