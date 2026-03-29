import type { RoughCanvas } from 'roughjs/bin/canvas';
import { Shape, Viewport } from './types';
import { getBoundingBox } from './canvas-utils';

function getOptions(shape: Shape) {
  return {
    seed: shape.seed,
    roughness: shape.roughness,
    stroke: shape.strokeColor,
    strokeWidth: shape.strokeWidth,
    fill: shape.fillColor === 'transparent' ? undefined : shape.fillColor,
    fillStyle: shape.fillStyle === 'none' ? 'solid' : shape.fillStyle,
    fillWeight: shape.strokeWidth * 0.8,
    hachureGap: shape.strokeWidth * 4,
  };
}

export function renderShapes(
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  vp: Viewport,
  selectedId?: string | null
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save();
  ctx.translate(vp.x, vp.y);
  ctx.scale(vp.zoom, vp.zoom);

  for (const shape of shapes) {
    ctx.save();
    ctx.globalAlpha = shape.opacity;

    const opts = getOptions(shape);

    switch (shape.type) {
      case 'rectangle': {
        const bb = getBoundingBox(shape);
        rc.rectangle(bb.x, bb.y, bb.w, bb.h, opts);
        break;
      }
      case 'ellipse': {
        const bb = getBoundingBox(shape);
        rc.ellipse(bb.x + bb.w / 2, bb.y + bb.h / 2, bb.w, bb.h, opts);
        break;
      }
      case 'line': {
        rc.line(shape.x, shape.y, shape.x2 ?? shape.x, shape.y2 ?? shape.y, opts);
        break;
      }
      case 'arrow': {
        const x2 = shape.x2 ?? shape.x;
        const y2 = shape.y2 ?? shape.y;
        rc.line(shape.x, shape.y, x2, y2, opts);
        drawArrowhead(ctx, shape.x, shape.y, x2, y2, shape.strokeColor, shape.strokeWidth, shape.opacity);
        break;
      }
      case 'freehand': {
        const pts = shape.points ?? [];
        if (pts.length > 1) {
          rc.curve(pts as [number, number][], { ...opts, roughness: 0.5 });
        }
        break;
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  strokeWidth: number,
  opacity: number
) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = Math.max(12, strokeWidth * 5);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - size * Math.cos(angle - Math.PI / 6),
    y2 - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - size * Math.cos(angle + Math.PI / 6),
    y2 - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
  ctx.restore();
}

export function renderSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  vp: Viewport
) {
  ctx.save();
  ctx.translate(vp.x, vp.y);
  ctx.scale(vp.zoom, vp.zoom);

  const bb = getBoundingBox(shape);
  const pad = 6 / vp.zoom;

  ctx.strokeStyle = '#6965db';
  ctx.lineWidth = 1.5 / vp.zoom;
  ctx.setLineDash([5 / vp.zoom, 3 / vp.zoom]);

  if (shape.type === 'line' || shape.type === 'arrow') {
    const x2 = shape.x2 ?? shape.x;
    const y2 = shape.y2 ?? shape.y;
    const dx = x2 - shape.x;
    const dy = y2 - shape.y;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const nx = -dy / len * pad;
      const ny = dx / len * pad;
      ctx.beginPath();
      ctx.moveTo(shape.x + nx, shape.y + ny);
      ctx.lineTo(x2 + nx, y2 + ny);
      ctx.moveTo(shape.x - nx, shape.y - ny);
      ctx.lineTo(x2 - nx, y2 - ny);
      ctx.stroke();
    }
  } else {
    ctx.strokeRect(bb.x - pad, bb.y - pad, bb.w + pad * 2, bb.h + pad * 2);
  }

  ctx.setLineDash([]);

  // Draw handles
  const handles = getHandlePositions(shape);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#6965db';
  ctx.lineWidth = 1.5 / vp.zoom;
  const hs = 6 / vp.zoom;

  for (const h of handles) {
    ctx.beginPath();
    ctx.arc(h.x, h.y, hs / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function getHandlePositions(shape: Shape) {
  if (shape.type === 'line' || shape.type === 'arrow') {
    return [
      { x: shape.x, y: shape.y },
      { x: shape.x2 ?? shape.x, y: shape.y2 ?? shape.y },
    ];
  }
  const bb = getBoundingBox(shape);
  return [
    { x: bb.x, y: bb.y },
    { x: bb.x + bb.w / 2, y: bb.y },
    { x: bb.x + bb.w, y: bb.y },
    { x: bb.x + bb.w, y: bb.y + bb.h / 2 },
    { x: bb.x + bb.w, y: bb.y + bb.h },
    { x: bb.x + bb.w / 2, y: bb.y + bb.h },
    { x: bb.x, y: bb.y + bb.h },
    { x: bb.x, y: bb.y + bb.h / 2 },
  ];
}
