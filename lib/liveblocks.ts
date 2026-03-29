import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';
import { LiveList, LiveObject } from '@liveblocks/client';
import type { Shape, Presence } from './types';

const client = createClient({
  authEndpoint: async (room) => {
    const token = typeof window !== 'undefined'
      ? sessionStorage.getItem('room_token')
      : null;

    const res = await fetch('/api/liveblocks-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, token }),
    });

    if (!res.ok) throw new Error('Liveblocks auth failed');
    return res.json();
  },
});

type Storage = {
  shapes: LiveList<LiveObject<Shape>>;
};

type UserMeta = {
  id: string;
  info: { name: string; color: string };
};

type RoomEvent = never;
type ThreadMetadata = Record<string, never>;

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useOthersMapped,
  useStorage,
  useMutation,
  useHistory,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(client);
