'use client';

import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function StockForgotPasswordPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const backRaw = String(searchParams.get('back') || '').trim();
  const back = backRaw.startsWith('/') ? backRaw : '/aksjer/signin';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const configuredBaseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL;
    const origin = window.location.origin;
    const baseUrl = origin.includes('localhost') && configuredBaseUrl ? configuredBaseUrl : origin;
    const redirectTo = `${baseUrl}/aksjer/reset-password?back=${encodeURIComponent(back)}`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage('Sjekk e-posten din for lenke til å tilbakestille passordet.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="mb-6">
          <div className="text-sm text-gray-500">AI Innovate AS</div>
          <h1 className="text-2xl font-bold text-gray-900">Glemt passord</h1>
          <p className="text-sm text-gray-600 mt-1">Vi sender en lenke til e-posten din.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              placeholder="navn@firma.no"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold disabled:opacity-50"
          >
            {loading ? '...' : 'Send lenke'}
          </button>
        </form>

        {message ? (
          <div className="mt-4 p-3 rounded-xl bg-gray-50 text-gray-800 text-sm border border-gray-200">{message}</div>
        ) : null}

        <div className="mt-6 border-t pt-6 text-sm text-gray-600">
          <Link href={back} className="font-bold text-gray-900 hover:underline">
            ← Tilbake til innlogging
          </Link>
        </div>
      </div>
    </div>
  );
}
