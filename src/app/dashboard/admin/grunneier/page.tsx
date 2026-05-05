'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Ban, FileText, RefreshCw, Search } from 'lucide-react';

type AgreementRow = {
  id: string;
  status: string;
  role: string | null;
  contact_signed_at: string | null;
  beekeeper_signed_at: string | null;
  created_at: string;
  updated_at: string;
  terminated_at: string | null;
  terminated_by: string | null;
  apiary: { id: string; name: string | null; apiary_number: string | null; location: string | null } | null;
  contact: { id: string; name: string | null; email: string | null } | null;
  beekeeper: { id: string; full_name: string | null } | null;
};

export default function AdminGrunneierAgreementsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileData?.role !== 'admin') {
        await supabase.auth.signOut();
        router.push('/admin');
        return;
      }

      await fetchAgreements();
    };
    run();
  }, []);

  const fetchAgreements = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/grunneier/agreements', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || 'Kunne ikke hente avtaler');
        setAgreements([]);
        return;
      }
      setAgreements(Array.isArray(data?.agreements) ? data.agreements : []);
    } finally {
      setLoading(false);
    }
  };

  const terminateAgreement = async (id: string) => {
    const ok = window.confirm('Avslutte avtalen? Grunneier mister tilgang til denne bigården.');
    if (!ok) return;
    setActionId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/grunneier/agreements/${encodeURIComponent(id)}/terminate`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || 'Kunne ikke avslutte avtale');
        return;
      }
      await fetchAgreements();
    } finally {
      setActionId(null);
    }
  };

  const activateAgreement = async (id: string) => {
    const ok = window.confirm('Aktivere avtalen? Grunneier får tilgang til denne bigården.');
    if (!ok) return;
    setActionId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/grunneier/agreements/${encodeURIComponent(id)}/activate`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || 'Kunne ikke aktivere avtale');
        return;
      }
      await fetchAgreements();
    } finally {
      setActionId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agreements;
    return agreements.filter((a) => {
      const apiary = `${a.apiary?.apiary_number || ''} ${a.apiary?.name || ''} ${a.apiary?.location || ''}`.toLowerCase();
      const contact = `${a.contact?.name || ''} ${a.contact?.email || ''}`.toLowerCase();
      const beekeeper = `${a.beekeeper?.full_name || ''}`.toLowerCase();
      const status = String(a.status || '').toLowerCase();
      return apiary.includes(q) || contact.includes(q) || beekeeper.includes(q) || status.includes(q);
    });
  }, [agreements, search]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-[#111827] text-white py-6 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Grunneierportal</h1>
              <p className="text-gray-400 text-sm">Avtaler og tilgangskontroll</p>
            </div>
          </div>
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk på bigård, e-post, navn eller status..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={fetchAgreements}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            Oppdater
          </button>
        </div>

        {message ? (
          <div className="bg-white border border-red-200 text-red-900 rounded-xl p-4">{message}</div>
        ) : null}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50">
            <div className="text-sm font-bold text-gray-900">Avtaler</div>
            <div className="text-xs text-gray-600">{filtered.length} treff</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-600">Laster...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-600">Ingen avtaler funnet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-white sticky top-0">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3">Bigård</th>
                    <th className="px-4 py-3">Grunneier</th>
                    <th className="px-4 py-3">Birøkter</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Signatur</th>
                    <th className="px-4 py-3">Oppdatert</th>
                    <th className="px-4 py-3 text-right">Handling</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const status = String(a.status || '').toLowerCase();
                    const canTerminate = status !== 'terminated' && status !== 'rejected';
                    const canActivate = status !== 'active';
                    const signed = Boolean(a.contact_signed_at) && Boolean(a.beekeeper_signed_at);
                    const updated = new Date(a.updated_at || a.created_at).toLocaleString();
                    return (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {a.apiary?.apiary_number || 'Bigård'} {a.apiary?.name ? `– ${a.apiary?.name}` : ''}
                          </div>
                          <div className="text-xs text-gray-600">{a.apiary?.location || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{a.contact?.name || '—'}</div>
                          <div className="text-xs text-gray-600">{a.contact?.email || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{a.beekeeper?.full_name || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              'inline-flex items-center px-2 py-1 rounded border text-xs font-bold',
                              status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : status === 'terminated'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-gray-50 text-gray-700 border-gray-200',
                            ].join(' ')}
                          >
                            {status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {signed ? 'Begge' : a.contact_signed_at ? 'Grunneier' : a.beekeeper_signed_at ? 'Birøkter' : 'Ingen'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{updated}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {canActivate ? (
                              <button
                                type="button"
                                disabled={actionId === a.id}
                                onClick={() => activateAgreement(a.id)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-green-200 hover:bg-green-50 text-green-700 rounded-lg text-xs font-bold disabled:opacity-50"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Aktiver
                              </button>
                            ) : null}
                            {canTerminate ? (
                              <button
                                type="button"
                                disabled={actionId === a.id}
                                onClick={() => terminateAgreement(a.id)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-bold disabled:opacity-50"
                              >
                                <Ban className="w-4 h-4" />
                                Avslutt
                              </button>
                            ) : null}
                            {!canActivate && !canTerminate ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
