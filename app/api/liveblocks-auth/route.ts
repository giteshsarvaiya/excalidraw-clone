import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  const { Liveblocks } = await import('@liveblocks/node');
  const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

  const { room, token } = await req.json();

  if (!token || !room) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { roomId: string; type: string };
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as { roomId: string; type: string };
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (payload.type !== 'room_access' || payload.roomId !== room) {
    return NextResponse.json({ error: 'Unauthorized for this room' }, { status: 403 });
  }

  const userId = `user_${Math.random().toString(36).slice(2, 10)}`;

  const session = liveblocks.prepareSession(userId, {
    userInfo: { name: 'Anonymous', color: '#6965db' },
  });

  session.allow(room, session.FULL_ACCESS);

  const { body, status } = await session.authorize();
  return new NextResponse(body, { status });
}
