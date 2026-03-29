import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const { roomId } = await params;
  const { password } = await req.json();

  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  const raw = await redis.get(`room:${roomId}`);
  if (!raw) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const room = typeof raw === 'string' ? JSON.parse(raw) : raw as { hashedPassword: string };
  const valid = await bcrypt.compare(password, room.hashedPassword);

  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = jwt.sign(
    { roomId, type: 'room_access' },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
  return NextResponse.json({ token });
}
