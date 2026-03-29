import { useCallback, useRef, useState } from 'react';
import { Shape, Tool, Viewport, DEFAULT_SHAPE_STYLE, FillStyle } from '@/lib/types';
import { screenToCanvas, hitTest, getResizeHandles, applyResize, normalizeShape, clampZoom } from '@/lib/canvas-utils';

type StyleState = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
};

type UseCanvasEventsProps = {
  tool: Tool;
  viewport: Viewport;
  setViewport: (vp: Viewport | ((prev: Viewport) => Viewport)) => void;
  shapes: Shape[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  style: StyleState;
  onAddShape: (shape: Shape) => void;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
  onDeleteShape: (id: string) => void;
  onToolChange: (tool: Tool) => void;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
};

export function useCanvasEvents({
  tool,
  viewport,
  setViewport,
  shapes,
  selectedId,
  setSelectedId,
  style,
  onAddShape,
  onUpdateShape,
  onDeleteShape,
  onToolChange,
  onCursorMove,
}: UseCanvasEventsProps) {
  const [preview, setPreview] = useState<Shape | null>(null);
  const drag = useRef<{
    type: 'draw' | 'move' | 'resize' | 'pan';
    startX: number;
    startY: number;
    shapeStartX?: number;
    shapeStartY?: number;
    shapeStartX2?: number;
    shapeStartY2?: number;
    shapeStartPoints?: [number, number][];
    handleId?: string;
    lastX?: number;
    lastY?: number;
  } | null>(null);

  const isPanning = useRef(false);
  const spaceDown = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: cx, y: cy } = screenToCanvas(sx, sy, viewport);

    // Middle mouse or space+left = pan
    if (e.button === 1 || spaceDown.current) {
      drag.current = { type: 'pan', startX: sx, startY: sy, lastX: sx, lastY: sy };
      isPanning.current = true;
      return;
    }

    if (tool === 'select') {
      // Check resize handles first
      if (selectedId) {
        const selected = shapes.find((s) => s.id === selectedId);
        if (selected) {
          const handles = getResizeHandles(selected);
          const threshold = 8 / viewport.zoom;
          for (const h of handles) {
            if (Math.hypot(cx - h.x, cy - h.y) <= threshold) {
              drag.current = {
                type: 'resize',
                startX: cx,
                startY: cy,
                handleId: h.id,
                shapeStartX: selected.x,
                shapeStartY: selected.y,
              };
              return;
            }
          }
        }
      }

      // Hit test shapes (top to bottom)
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTest(shapes[i], cx, cy, viewport.zoom)) {
          setSelectedId(shapes[i].id);
          drag.current = {
            type: 'move',
            startX: cx,
            startY: cy,
            shapeStartX: shapes[i].x,
            shapeStartY: shapes[i].y,
            shapeStartX2: shapes[i].x2,
            shapeStartY2: shapes[i].y2,
            shapeStartPoints: shapes[i].points ? shapes[i].points!.map((p) => [p[0], p[1]] as [number, number]) : undefined,
            lastX: cx,
            lastY: cy,
          };
          return;
        }
      }
      setSelectedId(null);
      return;
    }

    // Drawing tool
    const id = Math.random().toString(36).slice(2);
    const seed = Math.floor(Math.random() * 2 ** 31);
    const newShape: Shape = {
      id,
      type: tool,
      x: cx,
      y: cy,
      seed,
      ...style,
      ...(tool === 'rectangle' || tool === 'ellipse' ? { width: 0, height: 0 } : {}),
      ...(tool === 'line' || tool === 'arrow' ? { x2: cx, y2: cy } : {}),
      ...(tool === 'freehand' ? { points: [[cx, cy]] } : {}),
    };
    setPreview(newShape);
    drag.current = { type: 'draw', startX: cx, startY: cy };
  }, [tool, viewport, shapes, selectedId, setSelectedId, style]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: cx, y: cy } = screenToCanvas(sx, sy, viewport);

    onCursorMove({ x: cx, y: cy });

    if (!drag.current) return;

    if (drag.current.type === 'pan') {
      const dx = sx - (drag.current.lastX ?? sx);
      const dy = sy - (drag.current.lastY ?? sy);
      drag.current.lastX = sx;
      drag.current.lastY = sy;
      setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    if (drag.current.type === 'move' && selectedId) {
      const dx = cx - drag.current.startX;
      const dy = cy - drag.current.startY;
      const sel = shapes.find((s) => s.id === selectedId);
      if (!sel) return;
      const patch: Partial<Shape> = {
        x: (drag.current.shapeStartX ?? sel.x) + dx,
        y: (drag.current.shapeStartY ?? sel.y) + dy,
      };
      if (sel.type === 'line' || sel.type === 'arrow') {
        patch.x2 = (drag.current.shapeStartX2 ?? sel.x2 ?? sel.x) + dx;
        patch.y2 = (drag.current.shapeStartY2 ?? sel.y2 ?? sel.y) + dy;
      }
      if (sel.type === 'freehand' && drag.current.shapeStartPoints) {
        patch.points = drag.current.shapeStartPoints.map((p) => [p[0] + dx, p[1] + dy]);
      }
      onUpdateShape(selectedId, patch);
      return;
    }

    if (drag.current.type === 'resize' && selectedId && drag.current.handleId) {
      const sel = shapes.find((s) => s.id === selectedId);
      if (!sel) return;
      const dx = cx - drag.current.startX;
      const dy = cy - drag.current.startY;
      drag.current.startX = cx;
      drag.current.startY = cy;
      const patch = applyResize(sel, drag.current.handleId, dx, dy);
      onUpdateShape(selectedId, patch);
      return;
    }

    if (drag.current.type === 'draw' && preview) {
      const { startX, startY } = drag.current;
      setPreview((prev) => {
        if (!prev) return null;
        if (prev.type === 'rectangle' || prev.type === 'ellipse') {
          return { ...prev, width: cx - startX, height: cy - startY };
        }
        if (prev.type === 'line' || prev.type === 'arrow') {
          return { ...prev, x2: cx, y2: cy };
        }
        if (prev.type === 'freehand') {
          return { ...prev, points: [...(prev.points ?? []), [cx, cy]] };
        }
        return prev;
      });
    }
  }, [viewport, selectedId, shapes, preview, onUpdateShape, onCursorMove, setViewport]);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
    if (drag.current?.type === 'draw' && preview) {
      const normalized = normalizeShape(preview);
      // Don't commit degenerate shapes
      const isDegenerate =
        (normalized.type === 'rectangle' || normalized.type === 'ellipse') &&
        (Math.abs(normalized.width ?? 0) < 3 || Math.abs(normalized.height ?? 0) < 3);
      const isLineDegenerate =
        (normalized.type === 'line' || normalized.type === 'arrow') &&
        Math.hypot(
          (normalized.x2 ?? normalized.x) - normalized.x,
          (normalized.y2 ?? normalized.y) - normalized.y
        ) < 3;

      if (!isDegenerate && !isLineDegenerate) {
        onAddShape(normalized);
        setSelectedId(normalized.id);
        onToolChange('select');
      }
      setPreview(null);
    }
    if (drag.current?.type === 'resize' && selectedId) {
      const sel = shapes.find((s) => s.id === selectedId);
      if (sel) onUpdateShape(selectedId, normalizeShape(sel));
    }
    drag.current = null;
  }, [preview, shapes, selectedId, onAddShape, onUpdateShape, setSelectedId, onToolChange]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = -e.deltaY * 0.001;
      setViewport((prev) => {
        const newZoom = clampZoom(prev.zoom * (1 + delta));
        const scale = newZoom / prev.zoom;
        return {
          zoom: newZoom,
          x: sx - (sx - prev.x) * scale,
          y: sy - (sy - prev.y) * scale,
        };
      });
    } else if (e.shiftKey) {
      setViewport((prev) => ({ ...prev, x: prev.x - e.deltaY }));
    } else {
      // Pan
      setViewport((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [setViewport]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') spaceDown.current = true;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId && document.activeElement?.tagName !== 'INPUT') {
        onDeleteShape(selectedId);
        setSelectedId(null);
      }
    }
    if (e.key === 'Escape') setSelectedId(null);
  }, [selectedId, onDeleteShape, setSelectedId]);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') spaceDown.current = false;
  }, []);

  const onMouseLeave = useCallback(() => {
    onCursorMove(null);
  }, [onCursorMove]);

  return { preview, onMouseDown, onMouseMove, onMouseUp, onWheel, onKeyDown, onKeyUp, onMouseLeave };
}
