'use client';

import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ShieldCheck, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const emailValue = normalizeEmail(email);
      if (emailValue.endsWith('@gmail.no')) {
        throw new Error('Obs: Gmail bruker vanligvis @gmail.com (ikke @gmail.no). Sjekk at e-posten er riktig.');
      }
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password,
      });
      
      if (signInError) throw signInError;
      if (!user) throw new Error('Ingen bruker funnet');

      // Check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Kunne ikke hente brukerprofil: ' + (profileError.message || JSON.stringify(profileError)));
      }

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error(`Brukeren har ikke administrator-tilgang (Rolle: ${profile?.role || 'ingen'}).`);
      }
      
      // Redirect to admin dashboard
      window.location.href = '/dashboard/admin';
    } catch (error: any) {
      const msg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      setMessage('Kunne ikke logge inn: ' + msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        <div className="text-center mb-8">
          <Link href="/" className="text-gray-400 hover:text-white font-medium hover:underline text-sm mb-6 inline-block">
            ← Tilbake til forsiden
          </Link>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-900/30 rounded-full">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Administrator
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Kun for autorisert personell
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@biensvokter.no"
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Passord</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {message && (
            <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-red-900/20"
          >
            {loading ? 'Verifiserer...' : 'Logg inn som Admin'}
          </button>

          <Link
            href={`/aksjer/forgot-password?back=${encodeURIComponent('/admin')}`}
            className="block text-center text-sm text-gray-300 hover:text-white hover:underline"
          >
            Glemt passord
          </Link>
        </form>
      </div>
    </div>
  );
}
