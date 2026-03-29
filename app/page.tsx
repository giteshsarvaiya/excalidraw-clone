'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import RoomEntry from '@/components/RoomEntry';

// Remotion Player uses browser APIs — skip SSR.
// Per Next.js 16 docs, ssr:false must live in a Client Component.
const DisclaimerScreen = dynamic(
  () => import('@/components/DisclaimerScreen').then((m) => m.DisclaimerScreen),
  { ssr: false, loading: () => null },
);

export default function Home() {
  const [done, setDone] = useState(false);

  if (!done) {
    return <DisclaimerScreen onComplete={() => setDone(true)} />;
  }

  return <RoomEntry />;
}
