'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminBreakglassPage() {
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!email.trim()) return;
    if (password.length < 8) {
      setMessage('Passord må være minst 8 tegn.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passordene er ikke like.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/breakglass/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          newPassword: password,
          secret,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || 'Kunne ikke oppdatere passord');
        return;
      }
      setMessage('Passord er oppdatert. Du kan nå logge inn i admin.');
      setPassword('');
      setConfirm('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <Link href="/admin" className="text-gray-400 hover:text-white font-medium hover:underline text-sm mb-6 inline-block">
            ← Tilbake til admin
          </Link>
          <h1 className="text-2xl font-bold text-white">Breakglass</h1>
          <p className="text-gray-400 text-sm mt-2">Nødreset av admin-passord (krever nøkkelkode)</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Admin e-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
              placeholder="admin@..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nøkkelkode</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
              placeholder="ADMIN_BREAKGLASS_SECRET"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nytt passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
              placeholder="Minst 8 tegn"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Gjenta passord</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
              placeholder="Gjenta passord"
            />
          </div>

          {message ? (
            <div className="p-3 bg-gray-900/40 border border-gray-700 rounded-lg text-gray-100 text-sm">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-red-900/20"
          >
            {loading ? 'Oppdaterer...' : 'Oppdater passord'}
          </button>
        </form>
      </div>
    </div>
  );
}
