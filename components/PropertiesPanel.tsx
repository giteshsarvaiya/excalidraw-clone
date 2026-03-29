'use client';

import { FillStyle, Shape, DEFAULT_SHAPE_STYLE } from '@/lib/types';

const STROKE_COLORS = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#9c36b5', '#0c8599', '#fff'];
const FILL_COLORS = ['transparent', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#e5dbff', '#c5f6fa', '#1e1e1e'];
const FILL_STYLES: { id: FillStyle; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'hachure', label: 'Hatch' },
  { id: 'cross-hatch', label: 'Cross' },
  { id: 'dots', label: 'Dots' },
  { id: 'solid', label: 'Solid' },
];

type StyleState = {
  strokeColor: string;
  fillColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  roughness: number;
  opacity: number;
};

type Props = {
  style: StyleState;
  onChange: (patch: Partial<StyleState>) => void;
  selectedShape?: Shape | null;
  onShapeChange?: (patch: Partial<Shape>) => void;
};

function ColorSwatch({
  color,
  selected,
  onClick,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`color-swatch ${selected ? 'selected' : ''}`}
      style={{
        background: color === 'transparent'
          ? 'linear-gradient(135deg, #fff 45%, #f00 45%, #f00 55%, #fff 55%)'
          : color,
      }}
      title={color}
    />
  );
}

export default function PropertiesPanel({ style, onChange, selectedShape, onShapeChange }: Props) {
  const effectiveStyle = selectedShape
    ? {
        strokeColor: selectedShape.strokeColor,
        fillColor: selectedShape.fillColor,
        fillStyle: selectedShape.fillStyle,
        strokeWidth: selectedShape.strokeWidth,
        roughness: selectedShape.roughness,
        opacity: selectedShape.opacity,
      }
    : style;

  const update = (patch: Partial<StyleState>) => {
    onChange(patch);
    if (selectedShape && onShapeChange) {
      onShapeChange(patch as Partial<Shape>);
    }
  };

  return (
    <div className="props-panel">
      <section>
        <label className="prop-label">Stroke</label>
        <div className="color-row">
          {STROKE_COLORS.map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              selected={effectiveStyle.strokeColor === c}
              onClick={() => update({ strokeColor: c })}
            />
          ))}
        </div>
      </section>

      <section>
        <label className="prop-label">Fill</label>
        <div className="color-row">
          {FILL_COLORS.map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              selected={effectiveStyle.fillColor === c}
              onClick={() => update({ fillColor: c })}
            />
          ))}
        </div>
      </section>

      <section>
        <label className="prop-label">Fill style</label>
        <div className="fill-style-row">
          {FILL_STYLES.map((fs) => (
            <button
              key={fs.id}
              className={`fill-style-btn ${effectiveStyle.fillStyle === fs.id ? 'active' : ''}`}
              onClick={() => update({ fillStyle: fs.id })}
            >
              {fs.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="prop-label">
          Stroke width <span className="prop-value">{effectiveStyle.strokeWidth}px</span>
        </label>
        <input
          type="range" min={1} max={8} step={0.5}
          value={effectiveStyle.strokeWidth}
          onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
          className="prop-slider"
        />
      </section>

      <section>
        <label className="prop-label">
          Roughness <span className="prop-value">{effectiveStyle.roughness.toFixed(1)}</span>
        </label>
        <input
          type="range" min={0} max={3} step={0.1}
          value={effectiveStyle.roughness}
          onChange={(e) => update({ roughness: Number(e.target.value) })}
          className="prop-slider"
        />
      </section>

      <section>
        <label className="prop-label">
          Opacity <span className="prop-value">{Math.round(effectiveStyle.opacity * 100)}%</span>
        </label>
        <input
          type="range" min={0.1} max={1} step={0.05}
          value={effectiveStyle.opacity}
          onChange={(e) => update({ opacity: Number(e.target.value) })}
          className="prop-slider"
        />
      </section>
    </div>
  );
}
