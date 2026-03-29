'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LiveList, LiveObject } from '@liveblocks/client';
import { RoomProvider } from '@/lib/liveblocks';
import Canvas from '@/components/Canvas';
import type { Shape } from '@/lib/types';

export default function RoomClient({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('Anonymous');
  const [userColor, setUserColor] = useState('#6965db');

  useEffect(() => {
    const token = sessionStorage.getItem('room_token');
    if (!token) {
      router.replace('/');
      return;
    }
    setUserName(sessionStorage.getItem('room_name') ?? 'Anonymous');
    setUserColor(sessionStorage.getItem('room_color') ?? '#6965db');
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="loading-screen">
        <span className="logo-glyph large">✦</span>
        <p>Connecting…</p>
      </div>
    );
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null, name: userName, color: userColor }}
      initialStorage={{ shapes: new LiveList<LiveObject<Shape>>([]) }}
    >
      <Canvas roomId={roomId} />
    </RoomProvider>
  );
}
