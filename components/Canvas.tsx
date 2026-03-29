'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { LiveObject } from '@liveblocks/client';
import { useStorage, useMutation, useUpdateMyPresence } from '@/lib/liveblocks';
import { Shape, Tool, Viewport, FillStyle, DEFAULT_SHAPE_STYLE } from '@/lib/types';
import CanvasCore from './CanvasCore';
import LiveCursors from './LiveCursors';
import Presence from './Presence';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';

type StyleState = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
};

type Props = { roomId: string };

export default function Canvas({ roomId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState<Tool>('select');
  const [style, setStyle] = useState<StyleState>(DEFAULT_SHAPE_STYLE);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wrapperSize, setWrapperSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWrapperSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shapes = useStorage((root) => root.shapes.map((s) => ({ ...s }))) ?? [];
  const updateMyPresence = useUpdateMyPresence();

  const addShape = useMutation(({ storage }, shape: Shape) => {
    storage.get('shapes').push(new LiveObject(shape));
  }, []);

  const updateShape = useMutation(({ storage }, id: string, patch: Partial<Shape>) => {
    const list = storage.get('shapes');
    for (let i = 0; i < list.length; i++) {
      const item = list.get(i);
      if (item?.get('id') === id) {
        (Object.entries(patch) as [keyof Shape, unknown][]).forEach(([k, v]) => {
          item.set(k, v as never);
        });
        break;
      }
    }
  }, []);

  const deleteShape = useMutation(({ storage }, id: string) => {
    const list = storage.get('shapes');
    for (let i = 0; i < list.length; i++) {
      if (list.get(i)?.get('id') === id) { list.delete(i); break; }
    }
  }, []);

  const handleCursorMove = useCallback((pos: { x: number; y: number } | null) => {
    updateMyPresence({ cursor: pos });
  }, [updateMyPresence]);

  const selectedShape = shapes.find((s) => s.id === selectedId) ?? null;
  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="room-layout">
      {/* Header */}
      <header className="room-header">
        <div className="room-title">
          <span className="logo-mark">✦</span>
          <span className="room-name">{roomId}</span>
        </div>
        <Presence />
      </header>

      <div className="editor-body">
        {/* Left toolbar */}
        <Toolbar tool={tool} onToolChange={setTool} />

        {/* Canvas */}
        <div ref={wrapperRef} className="canvas-wrapper">
          <CanvasCore
            shapes={shapes}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onAddShape={addShape}
            onUpdateShape={updateShape}
            onDeleteShape={deleteShape}
            onCursorMove={handleCursorMove}
            viewport={viewport}
            setViewport={setViewport}
            tool={tool}
            setTool={setTool}
            style={style}
            setStyle={(patch) => setStyle((s) => ({ ...s, ...patch }))}
          >
            <LiveCursors viewport={viewport} width={wrapperSize.w} height={wrapperSize.h} />
          </CanvasCore>

          {/* Zoom controls */}
          <div className="zoom-indicator">
            <button onClick={() => setViewport((v) => ({ ...v, zoom: Math.min(v.zoom * 1.25, 20) }))}>+</button>
            <span>{zoomPercent}%</span>
            <button onClick={() => setViewport((v) => ({ ...v, zoom: Math.max(v.zoom / 1.25, 0.05) }))}>−</button>
            <button onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })} title="Reset view">↺</button>
          </div>
        </div>

        {/* Right properties panel */}
        <PropertiesPanel
          style={style}
          onChange={(patch) => setStyle((s) => ({ ...s, ...patch }))}
          selectedShape={selectedShape}
          onShapeChange={selectedShape ? (patch) => updateShape(selectedShape.id, patch) : undefined}
        />
      </div>
    </div>
  );
}
