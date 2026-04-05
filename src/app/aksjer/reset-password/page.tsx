'use client';

import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export default function StockResetPasswordPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        if (window.location.hash) {
          const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) setMessage(error.message);
          }
        }
      } finally {
        if (window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        const { data } = await supabase.auth.getUser();
        setUserEmail(data.user?.email || null);
      }
      setLoading(false);
    };
    run();
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage('Passordet må være minst 6 tegn.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passordene er ikke like.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Passordet er oppdatert. Du kan nå logge inn.');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laster...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="mb-6">
          <div className="text-sm text-gray-500">AI Innovate AS</div>
          <h1 className="text-2xl font-bold text-gray-900">Tilbakestill passord</h1>
          <p className="text-sm text-gray-600 mt-1">{userEmail ? userEmail : 'Logg inn på nytt via lenken i e-posten.'}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nytt passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              placeholder="Minst 6 tegn"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Gjenta passord</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              placeholder="Minst 6 tegn"
            />
          </div>

          <button type="submit" className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">
            Lagre nytt passord
          </button>
        </form>

        {message ? (
          <div className="mt-4 p-3 rounded-xl bg-gray-50 text-gray-800 text-sm border border-gray-200">{message}</div>
        ) : null}

        <div className="mt-6 border-t pt-6 text-sm text-gray-600">
          <Link href="/aksjer/signin" className="font-bold text-gray-900 hover:underline">
            Til innlogging
          </Link>
        </div>
      </div>
    </div>
  );
}
