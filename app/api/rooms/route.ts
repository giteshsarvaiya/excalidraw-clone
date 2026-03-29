import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const { roomId, password } = await req.json();

  if (!roomId || !password) {
    return NextResponse.json({ error: 'roomId and password required' }, { status: 400 });
  }

  if (!/^[a-z0-9-]{3,32}$/.test(roomId)) {
    return NextResponse.json(
      { error: 'Room ID must be 3–32 lowercase letters, numbers, or hyphens' },
      { status: 400 }
    );
  }

  const existing = await redis.get(`room:${roomId}`);
  if (existing) {
    return NextResponse.json({ error: 'Room already exists' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await redis.set(`room:${roomId}`, JSON.stringify({ hashedPassword, createdAt: Date.now() }));

  const token = jwt.sign(
    { roomId, type: 'room_access' },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  return NextResponse.json({ token });
}
