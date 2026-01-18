'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Calendar, Trash2, CheckSquare, Square, Copy, Send } from 'lucide-react';

type PilotInterest = {
  id: string;
  email: string;
  interested: boolean;
  created_at: string;
};

export default function PilotInterestPage() {
  const [interests, setInterests] = useState<PilotInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const res = await fetch('/api/admin/pilot-interest');
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const message =
            data?.error || 'Kunne ikke hente pilot-interesser.';
          throw new Error(message);
        }

        const data = await res.json();
        setInterests(data.interests || []);
      } catch (e: any) {
        console.error('Feil ved henting av pilot-interesser:', e);
        setError(
          e?.message || 'Kunne ikke hente pilot-interesser.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInterests();
  }, []);

  const allSelected = useMemo(() => {
    if (!interests.length) return false;
    return selectedIds.length === interests.length;
  }, [interests, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!interests.length) return;
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(interests.map((i) => i.id));
    }
  };

  const selectedEmails = useMemo(() => {
    if (!selectedIds.length) {
      return interests.map((i) => i.email);
    }
    return interests
      .filter((i) => selectedIds.includes(i.id))
      .map((i) => i.email);
  }, [interests, selectedIds]);

  const handleCopyEmails = async () => {
    try {
      const list = selectedEmails;
      if (!list.length) return;
      const text = list.join(', ');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Kunne ikke kopiere e-poster', e);
      setError('Kunne ikke kopiere e-postadresser til utklippstavlen.');
    }
  };

  const buildMailtoLink = () => {
    const list = selectedEmails;
    if (!list.length) return '#';

    const subject =
      'Takk for at du vil bidra i pilot for LEK-Biens Vokter';
    const bodyLines = [
      'Hei,',
      '',
      'Tusen takk for at du har meldt interesse for å teste LEK-Biens Vokter™️.',
      'Vi bygger et nasjonalt smittevernverktøy for birøkt, og pilotbrukerne våre er helt avgjørende for at løsningen skal bli nyttig i ekte birøkterhverdag.',
      '',
      'Kort om oss:',
      '- LEK-Biens Vokter™️ er utviklet for å gjøre det enklere å oppdage, rapportere og håndtere bisykdommer tidlig.',
      '- Vi samarbeider tett med birøktere og fagmiljø for å lage et verktøy som faktisk brukes, ikke bare ser fint ut på papiret.',
      '',
      'Slik kommer du i gang:',
      '- Installer appen via lenken under. Den fungerer på både iPhone og Android.',
      '- Logg inn med e-postadressen du vanligvis bruker, og aktiver varslinger for å få mest mulig ut av løsningen.',
      '',
      'Installer appen:',
      '<LENKE TIL APPEN LEGGES INN HER>',
      '',
      'Når du har installert appen, kan du gjerne svare direkte på denne e-posten hvis du har innspill, ønsker eller oppdager noe som skurrer. Alle tilbakemeldinger er gull verdt i pilotfasen.',
      '',
      'Igjen – tusen takk for at du vil være med og gjøre norsk birøkt litt tryggere.',
      '',
      'Vennlig hilsen',
      'LEK-Biens Vokter-teamet',
    ];

    const params = new URLSearchParams({
      subject,
      body: bodyLines.join('\n'),
    });

    return `mailto:${encodeURIComponent(
      list.join(',')
    )}?${params.toString()}`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne pilot-interessen?')) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/pilot-interest/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          data?.error || 'Kunne ikke slette pilot-interessen.';
        throw new Error(message);
      }

      setInterests((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      console.error('Feil ved sletting av pilot-interesse:', e);
      setError(
        e?.message || 'Kunne ikke slette pilot-interessen.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-honey-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pilot-interesser</h1>
            <p className="text-gray-500">
              Oversikt over brukere som ønsker å delta i pilotprogrammet
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-sm text-gray-500">
              Totalt: {interests.length}
            </div>
            {interests.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={toggleSelectAll}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  {allSelected ? (
                    <CheckSquare className="w-3 h-3" />
                  ) : (
                    <Square className="w-3 h-3" />
                  )}
                  {allSelected ? 'Fjern markering' : 'Velg alle'}
                </button>
                <button
                  onClick={handleCopyEmails}
                  disabled={!interests.length}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'Kopiert!' : 'Kopier e-poster'}
                </button>
                <a
                  href={buildMailtoLink()}
                  onClick={(e) => {
                    if (!selectedEmails.length) {
                      e.preventDefault();
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                    selectedEmails.length
                      ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      : 'border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-3 h-3" />
                  Send felles e-post
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <span className="mr-2">←</span>
            Tilbake til Systemadministrasjon
          </Link>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 w-10">
                    {interests.length > 0 && (
                      <button
                        onClick={toggleSelectAll}
                        className="inline-flex items-center justify-center"
                        aria-label="Velg alle"
                      >
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-gray-800" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </th>
                  <th className="px-6 py-4">E-post</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Dato registrert</th>
                  <th className="px-6 py-4 text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {interests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Ingen interesserte registrert ennå.
                    </td>
                  </tr>
                ) : (
                  interests.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr
                      key={item.id}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleSelect(item.id)}
                          className="inline-flex items-center justify-center"
                          aria-label="Velg rad"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a
                          href={`mailto:${item.email}`}
                          className="hover:text-honey-600 hover:underline"
                        >
                          {item.email}
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        {item.interested ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Interessert
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Ikke interessert
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(item.created_at).toLocaleString('nb-NO')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          Slett
                        </button>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
