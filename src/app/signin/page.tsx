'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SignInContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();
  
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const isRentalFlow = next?.includes('lei-en-kube');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // Force hard reload to clear any potential client-side state issues
      // If there is a next param, the middleware or auth callback should handle it, 
      // but explicitly redirecting there is safer if we control the flow.
      if (next) {
        window.location.href = next;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      setMessage('Kunne ikke logge inn: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-200">
        <div className="text-center mb-6">
          <Link href="/" className="text-orange-600 font-medium hover:underline text-sm mb-4 inline-block">
            ← Tilbake
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isRentalFlow ? 'Logg inn for å bestille' : 'Logg inn'}
          </h1>
          {isRentalFlow && (
            <p className="text-sm text-gray-600 mt-2">
              Du må ha en bruker for å signere leieavtalen digitalt.
            </p>
          )}
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-postadresse"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passord"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Logg inn'}
          </button>
        </form>

        <div className="mt-6 text-center border-t pt-6">
          <p className="text-gray-600 mb-2">Ny bruker?</p>
          <Link
            href={isRentalFlow ? `/register?next=${next}` : "/register"}
            className="text-orange-600 hover:text-orange-700 font-bold hover:underline"
          >
            Registrer deg her
          </Link>
        </div>

        {message && (
          <div className="mt-4 p-4 rounded-lg text-sm bg-red-50 text-red-800">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Laster...</div>}>
      <SignInContent />
    </Suspense>
  );
}
