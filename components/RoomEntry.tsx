'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RoomEntry() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = tab === 'create'
        ? '/api/rooms'
        : `/api/rooms/${encodeURIComponent(roomId)}/join`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, password }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }

      sessionStorage.setItem('room_token', data.token);
      sessionStorage.setItem('room_name', name || 'Anonymous');
      sessionStorage.setItem('room_color', randomColor());
      router.push(`/room/${encodeURIComponent(roomId)}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden />

      <div className="landing-card">
        <div className="landing-logo">
          <span className="logo-glyph">✦</span>
          <h1 className="landing-title">Sketchroom</h1>
          <p className="landing-sub">Collaborative drawing, hand-crafted feel.</p>
        </div>

        <div className="tab-row">
          <button
            className={`tab-btn ${tab === 'create' ? 'active' : ''}`}
            onClick={() => setTab('create')}
          >
            Create room
          </button>
          <button
            className={`tab-btn ${tab === 'join' ? 'active' : ''}`}
            onClick={() => setTab('join')}
          >
            Join room
          </button>
        </div>

        <form onSubmit={handleSubmit} className="room-form">
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="roomId">Room ID</label>
            <input
              id="roomId"
              type="text"
              placeholder="e.g. my-canvas-42"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              required
              minLength={3}
              maxLength={32}
              autoComplete="off"
            />
            <span className="field-hint">3–32 chars: letters, numbers, hyphens</span>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Room password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : tab === 'create' ? (
              'Create & Enter'
            ) : (
              'Join Room'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function randomColor() {
  const colors = [
    '#e03131', '#c2255c', '#9c36b5', '#6741d9', '#3b5bdb',
    '#1971c2', '#0c8599', '#099268', '#2f9e44', '#e8590c',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
