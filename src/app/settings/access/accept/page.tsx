'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Link as LinkIcon, LogIn } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AcceptAccessInvitePage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const token = String(searchParams.get('token') || '').trim();

  const [status, setStatus] = useState<'idle' | 'checking' | 'need_login' | 'accepting' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      setStatus('checking');
      setMessage('');
      if (!token) {
        setStatus('error');
        setMessage('Mangler token');
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        setStatus('need_login');
        setMessage('Logg inn for å godta invitasjonen.');
        return;
      }

      setStatus('accepting');
      const res = await fetch('/api/access/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setStatus('error');
        setMessage(String(json?.error || 'Kunne ikke godta invitasjon'));
        return;
      }

      setStatus('done');
      setMessage('Invitasjonen er godtatt.');
    };

    run().catch((e) => {
      setStatus('error');
      setMessage(String((e as any)?.message || 'Ukjent feil'));
    });
  }, [supabase, token]);

  const loginNext = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/settings/access';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/settings/access" className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Godta invitasjon</h1>
          <p className="text-xs text-gray-500">Tilganger</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-5 h-5 text-honey-600" />
            <div className="font-bold text-gray-900">Invitasjon</div>
          </div>

          <div className="text-sm text-gray-700 mb-4">{message || '...'}</div>

          {status === 'need_login' ? (
            <Link
              href={`/login?next=${encodeURIComponent(loginNext)}`}
              className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Logg inn
            </Link>
          ) : null}

          {status === 'done' ? (
            <Link
              href="/settings/access"
              className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Gå til tilganger
            </Link>
          ) : null}

          {status === 'error' ? (
            <Link
              href="/settings/access"
              className="w-full bg-white border border-gray-300 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center"
            >
              Tilbake
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

