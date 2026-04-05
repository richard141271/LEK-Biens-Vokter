'use client';

import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Suspense, useState } from 'react';

function SignInContent() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    window.location.href = '/aksjer/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="mb-6">
          <div className="text-sm text-gray-500">AI Innovate AS</div>
          <h1 className="text-2xl font-bold text-gray-900">Logg inn</h1>
          <p className="text-sm text-gray-600 mt-1">Aksjeplattform</p>
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold disabled:opacity-50"
          >
            {loading ? '...' : 'Logg inn'}
          </button>
        </form>

        {message ? (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-800 text-sm border border-red-100">
            {message}
          </div>
        ) : null}

        <div className="mt-6 border-t pt-6 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Ny bruker?</span>
            <Link href="/aksjer/signup" className="font-bold text-gray-900 hover:underline">
              Registrer deg
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StockSignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Laster...</div>}>
      <SignInContent />
    </Suspense>
  );
}

