'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Activity, ArrowLeft, BarChart2, FileDown } from 'lucide-react';

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
};

export default function SurveyResultsAdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [pilotCount, setPilotCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        Laster resultater fra behovsanalysen...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-red-100 rounded-xl px-6 py-4 text-sm text-red-700 max-w-md text-center">
          {error}
        </div>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Resultater – Behovsanalyse for LEK-Biens Vokter™️ 2.0
            </h1>
            <p className="text-sm text-gray-600">
              Oversikt over svar, nøkkeltall og enkel eksport til videre analyse.
            </p>
          </div>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Eksporter til CSV
          </button>
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

        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">
              Tabelloversikt over svar
            </h2>
            <p className="text-xs text-gray-500">
              Viser de siste {Math.min(responses.length, 50)} svarene.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-50">
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
                </tr>
              </thead>
              <tbody>
                {responses.slice(0, 50).map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
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
                  </tr>
                ))}
                {!responses.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-gray-500"
                    >
                      Ingen svar registrert ennå.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
