'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Activity, ArrowLeft, BarChart2, FileDown, Printer, Flag, Trash2, Undo2, CheckSquare, Square } from 'lucide-react';
import { jsPDF } from 'jspdf';

type SurveyResponse = {
  id: string;
  created_at: string;
  county: string | null;
  number_of_hives: string | null;
  number_of_hives_category: string | null;
  years_experience: string | null;
  years_experience_category: string | null;
  beekeeper_type: string | null;
  is_member_norwegian_beekeepers: boolean | null;
  experienced_disease: boolean | null;
  disease_types: string | null;
  difficulty_detecting_disease: number | null;
  late_detection: boolean | null;
  current_record_method: string | null;
  time_spent_documentation: string | null;
  value_warning_system: number | null;
  value_nearby_alert: number | null;
  value_reporting: number | null;
  value_ai_analysis: number | null;
  value_better_overview: number | null;
  would_use_system_choice: string | null;
  willingness_to_pay: string | null;
  biggest_challenge: string | null;
  feature_wishes: string | null;
  is_test: boolean | null;
  is_invalid: boolean | null;
  submitted_at: string | null;
  ip_address: string | null;
};

type FilterType = 'all' | 'valid' | 'test' | 'invalid';

export default function SurveyResultsAdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [pilotCount, setPilotCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeResponse, setActiveResponse] = useState<SurveyResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    checkUser();
    fetchResults();
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData?.role !== 'admin' && user.email !== 'richard141271@gmail.com') {
      await supabase.auth.signOut();
      router.push('/admin');
      return;
    }

    setProfile(profileData);
  };

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/admin/survey-results');
      if (!res.ok) {
        console.error('Feil ved henting av survey-resultater:', await res.text());
        setError('Kunne ikke hente resultater fra behovsanalysen.');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResponses(data.responses || []);
      setPilotCount(data.pilotCount || 0);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching survey results:', e);
      setError('Uventet feil ved henting av resultater.');
      setLoading(false);
    }
  };

  const filteredResponses = useMemo(() => {
    if (filter === 'test') {
      return responses.filter((r) => r.is_test === true);
    }
    if (filter === 'invalid') {
      return responses.filter((r) => r.is_invalid === true);
    }
    if (filter === 'valid') {
      return responses.filter((r) => r.is_test !== true && r.is_invalid !== true);
    }
    return responses;
  }, [responses, filter]);

  const visibleResponses = useMemo(
    () => filteredResponses.slice(0, 200),
    [filteredResponses]
  );

  const stats = useMemo(() => {
    if (!responses.length) {
      return {
        total: 0,
        experiencedDisease: 0,
        memberCount: 0,
        avgWarning: 0,
        avgNearby: 0,
        avgReporting: 0,
        avgOverview: 0,
        wouldUse: {
          yes: 0,
          yesIfEasy: 0,
          unsure: 0,
          no: 0,
        },
      };
    }

    const total = responses.length;
    let experiencedDisease = 0;
    let memberCount = 0;

    let sumWarning = 0;
    let countWarning = 0;
    let sumNearby = 0;
    let countNearby = 0;
    let sumReporting = 0;
    let countReporting = 0;
    let sumOverview = 0;
    let countOverview = 0;

    let yes = 0;
    let yesIfEasy = 0;
    let unsure = 0;
    let no = 0;

    responses.forEach((r) => {
      if (r.experienced_disease) {
        experiencedDisease += 1;
      }

      if (r.is_member_norwegian_beekeepers === true) {
        memberCount += 1;
      }

      if (r.value_warning_system != null) {
        sumWarning += r.value_warning_system;
        countWarning += 1;
      }
      if (r.value_nearby_alert != null) {
        sumNearby += r.value_nearby_alert;
        countNearby += 1;
      }
      if (r.value_reporting != null) {
        sumReporting += r.value_reporting;
        countReporting += 1;
      }
      if (r.value_better_overview != null) {
        sumOverview += r.value_better_overview;
        countOverview += 1;
      }

      const choice = (r.would_use_system_choice || '').toLowerCase();
      if (choice) {
        if (choice === 'ja') {
          yes += 1;
        } else if (choice.startsWith('ja, hvis')) {
          yesIfEasy += 1;
        } else if (choice.startsWith('vet')) {
          unsure += 1;
        } else if (choice === 'nei') {
          no += 1;
        }
      }
    });

    const avg = (sum: number, count: number) =>
      count ? Math.round((sum / count) * 10) / 10 : 0;

    return {
      total,
      experiencedDisease,
      memberCount,
      avgWarning: avg(sumWarning, countWarning),
      avgNearby: avg(sumNearby, countNearby),
      avgReporting: avg(sumReporting, countReporting),
      avgOverview: avg(sumOverview, countOverview),
      wouldUse: {
        yes,
        yesIfEasy,
        unsure,
        no,
      },
    };
  }, [responses]);

  const exportCsv = () => {
    if (!responses.length) return;

    const headers = [
      'id',
      'created_at',
      'county',
      'number_of_hives',
      'number_of_hives_category',
      'years_experience',
      'years_experience_category',
      'beekeeper_type',
      'is_member_norwegian_beekeepers',
      'experienced_disease',
      'disease_types',
      'current_record_method',
      'time_spent_documentation',
      'value_warning_system',
      'value_nearby_alert',
      'value_reporting',
      'value_better_overview',
      'would_use_system_choice',
      'willingness_to_pay',
      'biggest_challenge',
      'feature_wishes',
      'is_test',
      'is_invalid',
      'submitted_at',
      'ip_address',
    ];

    const escapeValue = (value: any) => {
      if (value == null) return '';
      const str = String(value).replace(/"/g, '""');
      if (str.includes(';') || str.includes('\n') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = responses.map((r) =>
      headers
        .map((key) =>
          escapeValue((r as any)[key as keyof SurveyResponse])
        )
        .join(';')
    );

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'behovsanalyse_svar.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePdfReport = () => {
    if (!responses.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Behovsanalyse – Administratorsammendrag', 15, 20);
    doc.setFontSize(11);
    const created = new Date().toLocaleString('nb-NO');
    doc.text(`Generert: ${created}`, 15, 30);
    const lines: string[] = [];
    lines.push(`Antall svar: ${stats.total}`);
    lines.push(`Antall pilotinteresserte: ${pilotCount}`);
    const diseasePercent = stats.total
      ? Math.round((stats.experiencedDisease / stats.total) * 100)
      : 0;
    const memberPercent = stats.total
      ? Math.round((stats.memberCount / stats.total) * 100)
      : 0;
    lines.push(`Andel med sykdomserfaring: ${diseasePercent}%`);
    lines.push(`Andel medlem i Norges Birøkterlag: ${memberPercent}%`);
    lines.push('');
    lines.push('Snittscore digitale verktøy (1–5):');
    lines.push(`- Automatisk smittevarsling: ${stats.avgWarning.toFixed(1)}`);
    lines.push(`- Varsel til nærliggende bigårder: ${stats.avgNearby.toFixed(1)}`);
    lines.push(`- Enkel rapportering til Mattilsynet: ${stats.avgReporting.toFixed(1)}`);
    lines.push(`- Bedre oversikt over egen bigård: ${stats.avgOverview.toFixed(1)}`);
    lines.push('');
    const totalWouldUse = stats.wouldUse.yes + stats.wouldUse.yesIfEasy + stats.wouldUse.unsure + stats.wouldUse.no;
    if (totalWouldUse > 0) {
      const yesPercent = Math.round((stats.wouldUse.yes / totalWouldUse) * 100);
      const yesEasyPercent = Math.round((stats.wouldUse.yesIfEasy / totalWouldUse) * 100);
      const unsurePercent = Math.round((stats.wouldUse.unsure / totalWouldUse) * 100);
      const noPercent = Math.round((stats.wouldUse.no / totalWouldUse) * 100);
      lines.push('Svar på hovedspørsmål – ville du brukt systemet?');
      lines.push(`- Ja: ${stats.wouldUse.yes} svar (${yesPercent}%)`);
      lines.push(`- Ja, hvis det er enkelt å bruke: ${stats.wouldUse.yesIfEasy} svar (${yesEasyPercent}%)`);
      lines.push(`- Vet ikke: ${stats.wouldUse.unsure} svar (${unsurePercent}%)`);
      lines.push(`- Nei: ${stats.wouldUse.no} svar (${noPercent}%)`);
    }
    if (responses.length) {
      const challenges = responses
        .map((r) => r.biggest_challenge)
        .filter((v): v is string => !!v)
        .slice(0, 5);
      if (challenges.length) {
        lines.push('');
        lines.push('Eksempler på største utfordringer (inntil 5):');
        challenges.forEach((c, index) => {
          lines.push(`${index + 1}. ${c}`);
        });
      }
    }
    const wrapped = doc.splitTextToSize(lines.join('\n'), 180);
    doc.text(wrapped, 15, 40);
    doc.save('behovsanalyse_rapport.pdf');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    if (!visibleResponses.length) return;
    if (selectedIds.length === visibleResponses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleResponses.map((r) => r.id));
    }
  };

  const applyLocalUpdate = (id: string, patch: Partial<SurveyResponse>) => {
    setResponses((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
    setActiveResponse((prev) =>
      prev && prev.id === id ? { ...prev, ...patch } : prev
    );
  };

  const removeLocalResponse = (id: string) => {
    setResponses((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    setActiveResponse((prev) => (prev && prev.id === id ? null : prev));
  };

  const performActionOnId = async (
    id: string,
    action: 'mark_test' | 'mark_invalid' | 'restore' | 'delete'
  ) => {
    if (action === 'delete') {
      const res = await fetch(`/api/admin/survey-responses/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Feil ved sletting av svar:', text);
        setError('Kunne ikke slette ett eller flere svar.');
        return;
      }
      removeLocalResponse(id);
      return;
    }

    const res = await fetch(`/api/admin/survey-responses/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Feil ved oppdatering av svar:', text);
      setError('Kunne ikke oppdatere ett eller flere svar.');
      return;
    }

    if (action === 'mark_test') {
      applyLocalUpdate(id, { is_test: true, is_invalid: false });
    } else if (action === 'mark_invalid') {
      applyLocalUpdate(id, { is_invalid: true });
    } else if (action === 'restore') {
      applyLocalUpdate(id, { is_test: false, is_invalid: false });
    }
  };

  const handleRowAction = async (
    id: string,
    action: 'mark_test' | 'mark_invalid' | 'restore' | 'delete'
  ) => {
    if (action === 'delete') {
      const confirmed = window.confirm(
        'Er du sikker på at du vil slette dette svaret permanent?'
      );
      if (!confirmed) return;
    }
    setActionLoading(true);
    try {
      await performActionOnId(id, action);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (
    action: 'mark_test' | 'mark_invalid' | 'restore' | 'delete'
  ) => {
    if (!selectedIds.length) return;
    if (action === 'delete') {
      const confirmed = window.confirm(
        `Er du sikker på at du vil slette ${selectedIds.length} valgte svar permanent?`
      );
      if (!confirmed) return;
    }
    setActionLoading(true);
    try {
      for (const id of selectedIds) {
        await performActionOnId(id, action);
      }
    } finally {
      setSelectedIds([]);
      setActionLoading(false);
    }
  };

  const handleDeleteAllTestData = async () => {
    if (!responses.some((r) => r.is_test)) return;
    const confirmed = window.confirm(
      'Er du sikker på at du vil slette alle svar som er markert som testdata?'
    );
    if (!confirmed) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/survey-responses/delete-test', {
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Feil ved sletting av testdata:', text);
        setError('Kunne ikke slette testdata.');
        return;
      }
      setResponses((prev) => prev.filter((r) => !r.is_test));
      setSelectedIds([]);
      setActiveResponse((prev) =>
        prev && prev.is_test ? null : prev
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Laster resultater fra behovsanalysen...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-[#111827] text-white py-6 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Tilbake til admin
            </Link>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-white">
              {profile?.full_name || 'Administrator'}
            </div>
            <div className="text-xs text-purple-300">Behovsanalyse</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Resultater – Behovsanalyse for LEK-Biens Vokter™️ 2.0
            </h1>
            <p className="text-sm text-gray-600">
              Oversikt over svar, nøkkeltall og administrasjon av datasettet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={generatePdfReport}
              disabled={!responses.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60"
            >
              <BarChart2 className="w-4 h-4" />
              Last ned rapport (PDF)
            </button>
            <button
              onClick={exportCsv}
              disabled={!responses.length}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60"
            >
              <FileDown className="w-4 h-4" />
              Eksporter til CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Skriv ut
            </button>
          </div>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Antall svar
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Pilotinteresserte
            </p>
            <p className="text-2xl font-bold text-honey-600">{pilotCount}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Andel med sykdomserfaring
            </p>
            <p className="text-2xl font-bold text-red-600">
              {stats.total
                ? Math.round((stats.experiencedDisease / stats.total) * 100)
                : 0}
              %
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Andel medlem i Norges Birøkterlag
            </p>
            <p className="text-2xl font-bold text-honey-600">
              {stats.total
                ? Math.round((stats.memberCount / stats.total) * 100)
                : 0}
              %
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-honey-600" />
                Svar på hovedspørsmål – ville du brukt systemet?
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              {[
                {
                  label: 'Ja',
                  value: stats.wouldUse.yes,
                  color: 'bg-honey-500',
                },
                {
                  label: 'Ja, hvis det er enkelt å bruke',
                  value: stats.wouldUse.yesIfEasy,
                  color: 'bg-green-500',
                },
                {
                  label: 'Vet ikke',
                  value: stats.wouldUse.unsure,
                  color: 'bg-yellow-500',
                },
                {
                  label: 'Nei',
                  value: stats.wouldUse.no,
                  color: 'bg-red-500',
                },
              ].map((item) => {
                const percent = stats.total
                  ? Math.round((item.value / stats.total) * 100)
                  : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span>{item.label}</span>
                      <span className="text-xs text-gray-500">
                        {item.value} svar ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-honey-600" />
                Snittscore – digitale verktøy (1–5)
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              {[
                {
                  label: 'Automatisk smittevarsling',
                  value: stats.avgWarning,
                },
                {
                  label: 'Varsel til nærliggende bigårder',
                  value: stats.avgNearby,
                },
                {
                  label: 'Enkel rapportering til Mattilsynet',
                  value: stats.avgReporting,
                },
                {
                  label: 'Bedre oversikt over egen bigård',
                  value: stats.avgOverview,
                },
              ].map((item) => {
                const percent = (item.value / 5) * 100;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span>{item.label}</span>
                      <span className="text-xs text-gray-500">
                        {item.value.toFixed(1)} / 5
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-honey-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Tabelloversikt over svar
              </h2>
              <p className="text-xs text-gray-500">
                Viser inntil {visibleResponses.length} svar basert på valgt filter.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-full px-2 py-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2 py-1 rounded-full ${
                    filter === 'all'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilter('valid')}
                  className={`px-2 py-1 rounded-full ${
                    filter === 'valid'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Gyldige
                </button>
                <button
                  onClick={() => setFilter('test')}
                  className={`px-2 py-1 rounded-full ${
                    filter === 'test'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Testdata
                </button>
                <button
                  onClick={() => setFilter('invalid')}
                  className={`px-2 py-1 rounded-full ${
                    filter === 'invalid'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Ugyldige
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">
                  {selectedIds.length} valgt
                </span>
                <button
                  onClick={() => handleBulkAction('mark_test')}
                  disabled={!selectedIds.length || actionLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Flag className="w-3 h-3" />
                  Test
                </button>
                <button
                  onClick={() => handleBulkAction('mark_invalid')}
                  disabled={!selectedIds.length || actionLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Flag className="w-3 h-3" />
                  Ugyldig
                </button>
                <button
                  onClick={() => handleBulkAction('restore')}
                  disabled={!selectedIds.length || actionLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Undo2 className="w-3 h-3" />
                  Gjenopprett
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={!selectedIds.length || actionLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Slett
                </button>
                <button
                  onClick={handleDeleteAllTestData}
                  disabled={
                    !responses.some((r) => r.is_test) || actionLoading
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Slett alle testdata
                </button>
              </div>
            </div>
          </div>

          {actionLoading && (
            <div className="mb-3 text-xs text-gray-500">
              Behandler endringer i valgte svar...
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    <button
                      onClick={selectAllVisible}
                      className="inline-flex items-center justify-center"
                    >
                      {visibleResponses.length &&
                      selectedIds.length === visibleResponses.length ? (
                        <CheckSquare className="w-4 h-4 text-gray-800" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Dato
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Fylke
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Kuber
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Erfaring
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Medlem N.B.
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Sykdom siste 3 år
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Ville brukt systemet?
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 hidden lg:table-cell">
                    Største utfordring
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleResponses.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  const isInvalid = r.is_invalid === true;
                  const isTest = r.is_test === true;
                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        isInvalid
                          ? 'bg-red-50/50'
                          : isTest
                          ? 'bg-gray-50/80'
                          : ''
                      }`}
                      onClick={() => setActiveResponse(r)}
                    >
                      <td className="px-3 py-2 text-gray-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(r.id);
                          }}
                          className="inline-flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-gray-800" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {new Date(r.created_at).toLocaleDateString('nb-NO')}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.county}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.number_of_hives_category || r.number_of_hives}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.years_experience_category || r.years_experience}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.is_member_norwegian_beekeepers === null
                          ? 'Ubesvart'
                          : r.is_member_norwegian_beekeepers
                          ? 'Ja'
                          : 'Nei'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.experienced_disease === null
                          ? 'Ubesvart'
                          : r.experienced_disease
                          ? 'Ja'
                          : 'Nei'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.would_use_system_choice || '–'}
                      </td>
                      <td className="px-3 py-2 text-gray-700 hidden lg:table-cell max-w-xs truncate">
                        {r.biggest_challenge}
                      </td>
                      <td className="px-3 py-2">
                        {isInvalid ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                            Ugyldig
                          </span>
                        ) : isTest ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                            Testdata
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                            Gyldig
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleRowAction(r.id, 'mark_test')}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            title="Marker som testdata"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRowAction(r.id, 'mark_invalid')}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Marker som ugyldig"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRowAction(r.id, 'restore')}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            title="Gjenopprett"
                          >
                            <Undo2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleRowAction(r.id, 'delete')}
                            disabled={actionLoading}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                            title="Slett"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!visibleResponses.length && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-3 py-6 text-center text-gray-500"
                    >
                      Ingen svar registrert for valgt filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {activeResponse && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Detaljer for valgt svar
                </h2>
                <p className="text-xs text-gray-500">
                  Oppsummert visning av alle felter for rask kontroll.
                </p>
              </div>
              <button
                onClick={() => setActiveResponse(null)}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Lukk
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500">Registrert</div>
                  <div>
                    {new Date(
                      activeResponse.created_at
                    ).toLocaleString('nb-NO')}
                  </div>
                </div>
                {activeResponse.submitted_at && (
                  <div>
                    <div className="text-xs text-gray-500">
                      Innsendt tidspunkt
                    </div>
                    <div>
                      {new Date(
                        activeResponse.submitted_at
                      ).toLocaleString('nb-NO')}
                    </div>
                  </div>
                )}
                {activeResponse.ip_address && (
                  <div>
                    <div className="text-xs text-gray-500">
                      IP-adresse (spamkontroll)
                    </div>
                    <div>{activeResponse.ip_address}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Fylke</div>
                  <div>{activeResponse.county || 'Ikke oppgitt'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Antall kuber</div>
                  <div>
                    {activeResponse.number_of_hives_category ||
                      activeResponse.number_of_hives ||
                      'Ikke oppgitt'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    Erfaring som birøkter
                  </div>
                  <div>
                    {activeResponse.years_experience_category ||
                      activeResponse.years_experience ||
                      'Ikke oppgitt'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    Medlem i Norges Birøkterlag
                  </div>
                  <div>
                    {activeResponse.is_member_norwegian_beekeepers === null
                      ? 'Ubesvart'
                      : activeResponse.is_member_norwegian_beekeepers
                      ? 'Ja'
                      : 'Nei'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500">
                    Sykdom siste 3 år
                  </div>
                  <div>
                    {activeResponse.experienced_disease === null
                      ? 'Ubesvart'
                      : activeResponse.experienced_disease
                      ? 'Ja'
                      : 'Nei'}
                  </div>
                </div>
                {activeResponse.disease_types && (
                  <div>
                    <div className="text-xs text-gray-500">
                      Type sykdommer
                    </div>
                    <div>{activeResponse.disease_types}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">
                    Metode for dokumentasjon
                  </div>
                  <div>
                    {activeResponse.current_record_method || 'Ikke oppgitt'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    Tid brukt på dokumentasjon per uke
                  </div>
                  <div>
                    {activeResponse.time_spent_documentation || 'Ikke oppgitt'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    Ville brukt systemet?
                  </div>
                  <div>
                    {activeResponse.would_use_system_choice || 'Ikke oppgitt'}
                  </div>
                </div>
                {activeResponse.willingness_to_pay && (
                  <div>
                    <div className="text-xs text-gray-500">
                      Betalingsvillighet (per år)
                    </div>
                    <div>{activeResponse.willingness_to_pay}</div>
                  </div>
                )}
              </div>
            </div>
            {activeResponse.biggest_challenge && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-1">
                  Største utfordring i birøkterhverdagen
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-line bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  {activeResponse.biggest_challenge}
                </div>
              </div>
            )}
            {activeResponse.feature_wishes && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-1">
                  Ønsker til funksjoner
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-line bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  {activeResponse.feature_wishes}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
