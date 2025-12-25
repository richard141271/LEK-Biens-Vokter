'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

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
      
      // Suksess! Send til dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      setMessage('Kunne ikke logge inn: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-honey-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-honey-100">
        <div className="text-center mb-6">
          <Link href="/" className="text-honey-600 font-medium hover:underline text-sm mb-4 inline-block">
            ← Tilbake til forsiden
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Logg inn i Bigården
          </h1>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-postadresse</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.no"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Logger inn...' : 'Logg inn'}
          </button>
        </form>

        <div className="mt-6 text-center border-t pt-6">
          <p className="text-gray-600 mb-2">Ny birøkter?</p>
          <Link
            href="/register"
            className="text-honey-600 hover:text-honey-700 font-bold hover:underline"
          >
            Registrer ny konto her
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
