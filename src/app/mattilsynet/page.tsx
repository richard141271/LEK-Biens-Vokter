'use client';

import Link from "next/link";
import { ShieldCheck, Search, Map } from "lucide-react";
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function MattilsynetPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!user) throw new Error('Ingen bruker funnet');

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'mattilsynet') {
        await supabase.auth.signOut();
        throw new Error('Denne brukeren har ikke tilgang til Mattilsynet-portalen.');
      }
      
      // Redirect to mattilsynet dashboard
      window.location.href = '/dashboard/mattilsynet';
    } catch (error: any) {
      setMessage('Kunne ikke logge inn: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Header */}
      <div className="bg-slate-800 text-white pt-12 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/"
            className="text-slate-300 hover:text-white mb-8 inline-block transition-colors"
          >
            ← Tilbake til forsiden
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <ShieldCheck className="w-12 h-12 text-green-400" />
                <h1 className="text-4xl font-bold">Mattilsynet Portal</h1>
              </div>
              <p className="text-xl text-slate-300 max-w-2xl">
                Effektivt tilsyn, full sporbarhet og sanntidsoversikt over bigårder og sykdomsstatus.
              </p>
            </div>
            
            {/* Quick Login Box in Header */}
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 w-full md:w-96">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Innlogging for ansatte
              </h2>
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-post (mattilsynet.no)"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-green-400 outline-none"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passord"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-green-400 outline-none"
                  required
                />
                {message && (
                  <div className="text-red-300 text-sm bg-red-900/50 p-2 rounded">
                    {message}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  {loading ? 'Logger inn...' : 'Logg inn'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-12">
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Card 1: Inspeksjon */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Tilsyn & Inspeksjon</h2>
            <p className="text-gray-600 mb-6">
              Få tilgang til digitale inspeksjonslogger, avviksmeldinger og historikk for alle registrerte bigårder.
            </p>
          </div>

          {/* Card 2: Smittevern */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
            <div className="bg-red-50 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Map className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Smittekart & Varsling</h2>
            <p className="text-gray-600 mb-6">
              Se utbrudd i sanntid, opprett soner og send varsler til birøktere i berørte områder automatisk.
            </p>
          </div>

        </div>

        <div className="mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Om Biens Vokter for Myndigheter</h3>
          <p className="text-gray-600 leading-relaxed">
            Biens Vokter er utviklet for å sikre full åpenhet og trygghet i norsk honningproduksjon. 
            Gjennom vår plattform registreres alle hendelser i blokkjede-teknologi, som sikrer at data ikke kan manipuleres. 
            Dette gir Mattilsynet et unikt verktøy for å effektivisere sitt arbeid og sikre god dyrevelferd.
          </p>
        </div>
      </div>
    </div>
  );
}
