'use client';

import { useSelf, useOthers } from '@/lib/liveblocks';

export default function Presence() {
  const me = useSelf();
  const others = useOthers();

  const allUsers = [
    ...(me ? [{ id: 'me', name: me.presence.name, color: me.presence.color, isMe: true }] : []),
    ...others.map((o) => ({
      id: String(o.id),
      name: o.presence.name,
      color: o.presence.color,
      isMe: false,
    })),
  ];

  return (
    <div className="presence-bar">
      {allUsers.map((u) => (
        <div key={u.id} className="avatar" title={u.name + (u.isMe ? ' (you)' : '')}>
          <div
            className="avatar-circle"
            style={{ background: u.color, outline: u.isMe ? `2px solid ${u.color}` : 'none' }}
          >
            {u.name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      ))}
      {allUsers.length > 1 && (
        <span className="collab-dot" title="Live collaboration active" />
      )}
    </div>
  );
}
