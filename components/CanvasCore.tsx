'use client';

import { useEffect, useRef, useCallback } from 'react';
import rough from 'roughjs';
import { Shape, Tool, Viewport, FillStyle } from '@/lib/types';
import { renderShapes, renderSelectionOverlay } from '@/lib/rough-renderer';
import { useCanvasEvents } from '@/hooks/useCanvasEvents';

type StyleState = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
};

type Props = {
  shapes: Shape[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onAddShape: (s: Shape) => void;
  onUpdateShape: (id: string, patch: Partial<Shape>) => void;
  onDeleteShape: (id: string) => void;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
  viewport: Viewport;
  setViewport: (vp: Viewport | ((prev: Viewport) => Viewport)) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
  style: StyleState;
  setStyle: (patch: Partial<StyleState>) => void;
  children?: React.ReactNode;
};

export default function CanvasCore({
  shapes,
  selectedId,
  setSelectedId,
  onAddShape,
  onUpdateShape,
  onDeleteShape,
  onCursorMove,
  viewport,
  setViewport,
  tool,
  setTool,
  style,
  children,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const shapesRef = useRef<Shape[]>(shapes);
  const viewportRef = useRef<Viewport>(viewport);
  const selectedIdRef = useRef<string | null>(selectedId);
  const previewRef = useRef<Shape | null>(null);

  // Resize observer — keeps canvas pixel dimensions matching container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      scheduleRender();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rc = rough.canvas(canvas);
      const all = previewRef.current
        ? [...shapesRef.current, previewRef.current]
        : shapesRef.current;
      renderShapes(rc, ctx, all, viewportRef.current, selectedIdRef.current);
      if (selectedIdRef.current) {
        const sel = all.find((s) => s.id === selectedIdRef.current);
        if (sel) renderSelectionOverlay(ctx, sel, viewportRef.current);
      }
    });
  }, []);

  useEffect(() => { shapesRef.current = shapes; scheduleRender(); }, [shapes, scheduleRender]);
  useEffect(() => { viewportRef.current = viewport; scheduleRender(); }, [viewport, scheduleRender]);
  useEffect(() => { selectedIdRef.current = selectedId; scheduleRender(); }, [selectedId, scheduleRender]);

  const {
    preview,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onKeyDown,
    onKeyUp,
    onMouseLeave,
  } = useCanvasEvents({
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
    onToolChange: setTool,
    onCursorMove,
  });

  useEffect(() => { previewRef.current = preview; scheduleRender(); }, [preview, scheduleRender]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const map: Record<string, Tool> = {
        v: 'select', r: 'rectangle', c: 'ellipse',
        l: 'line', a: 'arrow', p: 'freehand',
      };
      if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
      onKeyDown(e);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp, setTool]);

  const getCursor = () => {
    if (tool === 'select') return 'default';
    return 'crosshair';
  };

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ cursor: getCursor(), display: 'block', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {children}
    </div>
  );
}
