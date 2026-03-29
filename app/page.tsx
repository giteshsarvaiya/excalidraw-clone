'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import RoomEntry from '@/components/RoomEntry';


export default function Home() {
  const [done, setDone] = useState(false);


  return <RoomEntry />;
}
