'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Calendar, Trash2, CheckSquare, Square, Copy, Send, Bug, Users, ArrowLeft } from 'lucide-react';

type PilotInterest = {
  id: string;
  email: string;
  interested: boolean;
  created_at: string;
  source: string | null;
  status: string | null;
};

type TabType = 'beekeeper' | 'non_beekeeper';

export default function PilotInterestPage() {
  const [interests, setInterests] = useState<PilotInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('beekeeper');

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const res = await fetch('/api/admin/pilot-interest', { cache: 'no-store' });
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

  const filteredInterests = useMemo(() => {
    return interests.filter((item) => {
      if (activeTab === 'beekeeper') {
        // Include legacy data (null source) in beekeeper tab
        return !item.source || item.source === 'survey_beekeeper';
      } else {
        return item.source === 'survey_non_beekeeper';
      }
    });
  }, [interests, activeTab]);

  const allSelected = useMemo(() => {
    if (!filteredInterests.length) return false;
    // Check if all displayed items are selected
    return filteredInterests.every((item) => selectedIds.includes(item.id));
  }, [filteredInterests, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!filteredInterests.length) return;
    
    if (allSelected) {
      // Unselect only the visible ones
      const visibleIds = filteredInterests.map(i => i.id);
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Select all visible ones
      const visibleIds = filteredInterests.map(i => i.id);
      setSelectedIds(prev => {
        const newIds = [...prev];
        visibleIds.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      });
    }
  };

  const selectedEmails = useMemo(() => {
    if (!selectedIds.length) {
      // If none selected, return all VISIBLE emails (filtered by tab)
      // This matches the "Send felles e-post" behavior usually expected (send to all in list)
      // BUT, usually "Send felles e-post" button logic below uses this list.
      // Let's stick to "if nothing selected, use all visible".
      return filteredInterests.map((i) => i.email);
    }
    // Return selected emails that are also in the current filter (to avoid confusion)
    return filteredInterests
      .filter((i) => selectedIds.includes(i.id))
      .map((i) => i.email);
  }, [filteredInterests, selectedIds]);

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

    let subject = '';
    let bodyLines: string[] = [];

    if (activeTab === 'beekeeper') {
      subject = 'Takk for at du vil bidra i pilot for LEK-Biens Vokter';
      bodyLines = [
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
    } else {
      subject = 'Pilot for leie av bikube - LEK-Biens Vokter';
      bodyLines = [
        'Hei,',
        '',
        'Tusen takk for at du har meldt interesse for vårt pilotprogram for leie av bikuber.',
        '',
        'Vi jobber med å gjøre det enkelt for privatpersoner og bedrifter å ha egne bikuber, der vi tar oss av alt stellet.',
        '',
        'Kort om piloten:',
        '- Du får leie en bikube som plasseres i din hage/på din tomt.',
        '- Vi (erfarne birøktere) kommer jevnlig innom for å stelle biene.',
        '- Du får førsterett til kjøp av honning i egen leid kube til fast lav pris.',
        '- Som pilotdeltaker får du sterkt redusert pris mot at du gir oss tilbakemeldinger på opplevelsen.',
        '',
        'Les mer om leie av bikuber her:',
        'https://lek-biensvokter.no/leie-av-bikube',
        '',
        'Din rabattkode for pilotprogrammet:',
        'PILOT2024',
        '',
        'Hva skjer nå?',
        'Vi går nå gjennom interesselisten og vil kontakte aktuelle kandidater i Halden-området fortløpende for en uforpliktende prat og befaring.',
        '',
        'Har du spørsmål i mellomtiden, svar gjerne på denne e-posten.',
        '',
        'Vennlig hilsen',
        'LEK-Biens Vokter-teamet',
      ];
    }

    const body = bodyLines.join('\n');
    const encodedSubject = encodeURIComponent(subject).replace(/\+/g, '%20');
    const encodedBody = encodeURIComponent(body).replace(/\+/g, '%20');

    return `mailto:${encodeURIComponent(list.join(','))}?subject=${encodedSubject}&body=${encodedBody}`;
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
      // Remove from selectedIds if present
      setSelectedIds((prev) => prev.filter((x) => x !== id));
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
        <div className="mb-6">
          <Link 
            href="/dashboard/admin" 
            className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til Admin
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pilot-interesser</h1>
            <p className="text-gray-500">
              Oversikt over brukere som ønsker å delta i pilotprogrammet
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-sm text-gray-500">
              Totalt: {filteredInterests.length} (av {interests.length})
            </div>
            {filteredInterests.length > 0 && (
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
                  disabled={!filteredInterests.length}
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('beekeeper')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'beekeeper'
                ? 'border-honey-500 text-honey-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bug className="w-4 h-4" />
            Birøktere ({interests.filter(i => !i.source || i.source === 'survey_beekeeper').length})
          </button>
          <button
            onClick={() => setActiveTab('non_beekeeper')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'non_beekeeper'
                ? 'border-honey-500 text-honey-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Ikke-birøktere ({interests.filter(i => i.source === 'survey_non_beekeeper').length})
          </button>
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
                    {filteredInterests.length > 0 && (
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
                {filteredInterests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Ingen interesserte registrert i denne kategorien ennå.
                    </td>
                  </tr>
                ) : (
                  filteredInterests.map((item) => {
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
                        {item.status ? (
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                             item.status === 'Interessert' ? 'bg-green-100 text-green-800' : 
                             item.status === 'Kanskje' ? 'bg-yellow-100 text-yellow-800' :
                             'bg-gray-100 text-gray-800'
                           }`}>
                            {item.status}
                          </span>
                        ) : item.interested ? (
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
