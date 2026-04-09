'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

function SignInContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();
  
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const isRentalFlow = next?.includes('lei-en-kube');
  const backPath = next ? `/signin?next=${encodeURIComponent(next)}` : '/signin';
  const forgotPasswordHref = `/aksjer/forgot-password?back=${encodeURIComponent(backPath)}`;

  const mapAuthError = (raw: string) => {
    const lower = (raw || '').toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'Feil e-post eller passord. Bruk “Glemt passord?” hvis du er usikker på passordet.';
    }
    if (lower.includes('email not confirmed')) {
      return 'E-posten er ikke bekreftet. Sjekk innboksen din og bekreft før du logger inn.';
    }
    return raw;
  };

  const sendMagicLink = async () => {
    const emailValue = email.trim();
    if (!emailValue) {
      setMessage('Skriv inn e-post først.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const origin = window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
      const { error } = await supabase.auth.signInWithOtp({ email: emailValue, options: { emailRedirectTo } });
      if (error) throw error;
      setMessage('Vi har sendt en innloggingslenke til e-posten din.');
    } catch (error: any) {
      setMessage('Kunne ikke sende lenke: ' + mapAuthError(error.message || 'Ukjent feil'));
    } finally {
      setLoading(false);
    }
  };

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
      setMessage('Kunne ikke logge inn: ' + mapAuthError(error.message || 'Ukjent feil'));
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passord"
                required
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-2 text-sm">
              <Link href={forgotPasswordHref} className="font-semibold text-gray-700 hover:underline">
                Glemt passord?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Logg inn'}
          </button>

          <button
            type="button"
            onClick={sendMagicLink}
            disabled={loading}
            className="w-full border border-gray-300 hover:border-gray-400 text-gray-900 font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            Send innloggingslenke
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
