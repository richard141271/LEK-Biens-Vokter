'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Mail, MapPin } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
      Laster kart...
    </div>
  ),
});

type LinkedApiary = {
  apiary: {
    id: string;
    name: string | null;
    apiary_number: string | null;
    latitude: number | null;
    longitude: number | null;
    location: string | null;
    type: string | null;
  };
  contact: {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    phone: string | null;
  };
  role: 'grunneier' | 'kontaktperson' | 'samarbeidspartner';
};

export default function GrunneierPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [linkedApiaries, setLinkedApiaries] = useState<LinkedApiary[]>([]);

  const fetchSession = async () => {
    setSessionLoading(true);
    try {
      const res = await fetch('/api/grunneier/session', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.expired) {
          setStatus('Lenken er utløpt');
        }
        setLinkedApiaries([]);
        return;
      }
      const data = await res.json();
      setLinkedApiaries(data?.apiaries || []);
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    const validate = async () => {
      if (!token) return;
      setLoading(true);
      setStatus(null);
      try {
        const res = await fetch(`/api/grunneier/validate?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setStatus(data?.error || 'Lenken er utløpt');
          router.replace('/grunneier');
          return;
        }
        router.replace('/grunneier');
        await fetchSession();
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, [token, router]);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/grunneier/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data?.error || 'Kunne ikke sende lenke');
        return;
      }

      setStatus('Hvis e-posten finnes, er lenke sendt.');
      setEmail('');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = useMemo<[number, number]>(() => {
    for (const item of linkedApiaries) {
      const lat = item.apiary.latitude;
      const lng = item.apiary.longitude;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return [lat, lng];
      }
    }
    return [60.3913, 5.3221];
  }, [linkedApiaries]);

  const markers = useMemo(() => {
    return linkedApiaries
      .map((item) => {
        const lat = item.apiary.latitude;
        const lng = item.apiary.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        const title = item.apiary.apiary_number || item.apiary.name || 'Bigård';
        const description = [
          item.apiary.name ? `Navn: ${item.apiary.name}` : null,
          item.apiary.location ? `Sted: ${item.apiary.location}` : null,
          `Rolle: ${item.role}`,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          id: `${item.apiary.id}:${item.contact.id}`,
          position: [lat, lng] as [number, number],
          title,
          type: 'user' as const,
          description,
        };
      })
      .filter(Boolean) as any[];
  }, [linkedApiaries]);

  const hasSession = linkedApiaries.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">Grunneierportal</h1>
            <p className="text-xs text-gray-500">
              Kart og oversikt over bigårder du er knyttet til
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {status && (
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 flex items-center justify-between gap-3">
            <span>{status}</span>
            {!hasSession && status.toLowerCase().includes('utløpt') && (
              <button
                onClick={() => (document.getElementById('grunneier-email') as HTMLInputElement | null)?.focus()}
                className="shrink-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium"
              >
                Send ny lenke
              </button>
            )}
          </div>
        )}

        {sessionLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">
            Laster...
          </div>
        ) : hasSession ? (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="h-[420px] w-full rounded-xl overflow-hidden">
                <Map center={mapCenter} zoom={11} markers={markers} />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                Bigårder
              </h2>
              <div className="grid gap-2">
                {linkedApiaries.map((item) => (
                  <div
                    key={`${item.apiary.id}:${item.contact.id}`}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="font-semibold text-gray-900">
                      {item.apiary.apiary_number || 'Bigård'}{' '}
                      {item.apiary.name ? `– ${item.apiary.name}` : ''}
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.apiary.location || 'Ukjent sted'} • Rolle: {item.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-600" />
              Få tilsendt lenke
            </h2>
            <form onSubmit={requestLink} className="flex flex-col sm:flex-row gap-2">
              <input
                id="grunneier-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Skriv inn e-post"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
              <button
                disabled={loading}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Send lenke
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Du får en engangslenke på e-post (ingen passord).
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
