'use client';

import { useOthersMapped } from '@/lib/liveblocks';
import { Viewport } from '@/lib/types';
import { canvasToScreen } from '@/lib/canvas-utils';

type Props = { viewport: Viewport; width: number; height: number };

export default function LiveCursors({ viewport, width, height }: Props) {
  const others = useOthersMapped((other) => ({
    cursor: other.presence.cursor,
    name: other.presence.name,
    color: other.presence.color,
  }));

  return (
    <svg
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
        width, height,
      }}
    >
      {others.map(([id, { cursor, name, color }]) => {
        if (!cursor) return null;
        const { x, y } = canvasToScreen(cursor.x, cursor.y, viewport);
        if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return null;
        return (
          <g key={id} transform={`translate(${x}, ${y})`}>
            <path
              d="M0 0 L8 20 L11 13 L19 16 Z"
              fill={color}
              stroke="#fff"
              strokeWidth="1"
            />
            <rect
              x="12" y="18"
              width={name.length * 7 + 8}
              height="18"
              rx="4"
              fill={color}
            />
            <text
              x="16" y="30"
              fill="#fff"
              fontSize="11"
              fontFamily="'Nunito', sans-serif"
              fontWeight="600"
            >
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
