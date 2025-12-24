'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        // Registrer ny bruker
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage('Konto opprettet! Du kan nå logge inn.');
        setIsSignUp(false); // Bytt til login-modus
      } else {
        // Logg inn eksisterende bruker
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Suksess! Send til dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error: any) {
      setMessage('Noe gikk galt: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-honey-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-honey-100">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          {isSignUp ? 'Registrer ny bruker' : 'Logg inn i Bigården'}
        </h1>
        
        <form onSubmit={handleAuth} className="space-y-4">
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
            {loading ? 'Jobber...' : (isSignUp ? 'Opprett konto' : 'Logg inn')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
            }}
            className="text-sm text-honey-600 hover:text-honey-700 font-medium"
          >
            {isSignUp 
              ? 'Har du allerede konto? Logg inn' 
              : 'Ny bruker? Opprett konto'}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-4 rounded-lg text-sm ${message.includes('Opprettet') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
