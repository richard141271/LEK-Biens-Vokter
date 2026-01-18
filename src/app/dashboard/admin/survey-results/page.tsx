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
  pilot_answer: string | null;
  pilot_interest: boolean | null;
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
  const [challengeFilter, setChallengeFilter] = useState<'all' | 'disease'>('all');

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

  const challengeQuotes = useMemo(() => {
    const source = responses.filter(
      (r) => r.is_test !== true && r.is_invalid !== true
    );
    const texts = source
      .map((r) => r.biggest_challenge)
      .filter((v): v is string => !!v && !!v.trim());

    const filtered =
      challengeFilter === 'disease'
        ? texts.filter((t) => {
            const lower = t.toLowerCase();
            return lower.includes('smitte') || lower.includes('sykdom');
          })
        : texts;

    const unique: string[] = [];
    filtered.forEach((t) => {
      const normalized = t.trim();
      if (!unique.some((u) => u === normalized)) {
        unique.push(normalized);
      }
    });

    return unique.slice(0, 10);
  }, [responses, challengeFilter]);

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

  const loadImageAsDataUrl = async (src: string) => {
    const res = await fetch(src);
    if (!res.ok) {
      throw new Error('Kunne ikke laste bilde');
    }
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const generatePdfReport = async () => {
    if (!responses.length) return;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    let logoDataUrl: string | null = null;
    try {
      logoDataUrl = await loadImageAsDataUrl('/våpen.png');
    } catch (e) {
      logoDataUrl = null;
    }

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', margin, 10, 38, 26);
    }

    doc.setTextColor(20, 20, 20);
    doc.setFontSize(18);
    doc.text('Behovsanalyse', margin + 44, 20);
    doc.setFontSize(12);
    doc.text('Administratorsammendrag', margin + 44, 28);

    doc.setFontSize(10);
    const generated = new Date().toLocaleString('nb-NO');
    doc.text(`Generert: ${generated}`, pageWidth - margin, 18, { align: 'right' });

    const cardWidth = (pageWidth - margin * 2 - 12 * 3) / 4;
    const cardHeight = 26;
    const cardY = 46;

    const drawCard = (
      index: number,
      title: string,
      value: string,
      subtitle: string
    ) => {
      const x = margin + index * (cardWidth + 12);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text(title, x + 6, cardY + 8);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(16);
      doc.text(value, x + 6, cardY + 17);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(9);
      doc.text(subtitle, x + 6, cardY + 24);
    };

    const diseasePercent = stats.total
      ? Math.round((stats.experiencedDisease / stats.total) * 100)
      : 0;
    const memberPercent = stats.total
      ? Math.round((stats.memberCount / stats.total) * 100)
      : 0;
    const pilotPercent = stats.total
      ? Math.round((pilotCount / stats.total) * 100)
      : 0;

    drawCard(
      0,
      'Antall svar',
      String(stats.total),
      'Totalt antall svar'
    );
    drawCard(
      1,
      'Pilotinteresse',
      String(pilotCount),
      stats.total ? `${pilotPercent}% av svarene` : 'Andel som ønsker pilot'
    );
    drawCard(
      2,
      'Sykdomserfaring',
      stats.total ? `${diseasePercent}%` : '–',
      'Andel med sykdomserfaring'
    );
    drawCard(
      3,
      'Medlem i NBL',
      stats.total ? `${memberPercent}%` : '–',
      'Andel medlem i Norges Birøkterlag'
    );

    const sectionTop = cardY + cardHeight + 18;

    const totalWouldUse =
      stats.wouldUse.yes +
      stats.wouldUse.yesIfEasy +
      stats.wouldUse.unsure +
      stats.wouldUse.no;

    const totalPositive = stats.wouldUse.yes + stats.wouldUse.yesIfEasy;

    const leftX = margin;
    const rightX = pageWidth / 2 + 4;

    // Aksept-tabell
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text('Aksept: Ville du brukt systemet?', leftX, sectionTop);

    doc.setFontSize(10);
    if (totalWouldUse > 0) {
      const answered = totalWouldUse;
      const yesPercent = Math.round((stats.wouldUse.yes / answered) * 100);
      const yesEasyPercent = Math.round(
        (stats.wouldUse.yesIfEasy / answered) * 100
      );
      const unsurePercent = Math.round(
        (stats.wouldUse.unsure / answered) * 100
      );
      const noPercent = Math.round((stats.wouldUse.no / answered) * 100);
      const positivePercent = Math.round(
        (totalPositive / answered) * 100
      );

      const tableY = sectionTop + 4;
      const rowHeight = 7;
      const rows = [
        ['Ja', String(stats.wouldUse.yes), `${yesPercent}%`],
        [
          'Ja, hvis det er enkelt å bruke',
          String(stats.wouldUse.yesIfEasy),
          `${yesEasyPercent}%`,
        ],
        ['Vet ikke', String(stats.wouldUse.unsure), `${unsurePercent}%`],
        ['Nei', String(stats.wouldUse.no), `${noPercent}%`],
        [
          'Samlet positiv holdning',
          String(totalPositive),
          `${positivePercent}%`,
        ],
      ];

      const col1Width = 70;
      const col2Width = 18;
      const col3Width = 24;
      const tableWidth = col1Width + col2Width + col3Width;

      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.1);

      // Ytre ramme
      doc.rect(leftX, tableY, tableWidth, rowHeight * (rows.length + 1));

      // Horisontale linjer
      for (let i = 1; i <= rows.length; i++) {
        const y = tableY + rowHeight * i;
        doc.line(leftX, y, leftX + tableWidth, y);
      }

      // Vertikale linjer
      const col1X = leftX + col1Width;
      const col2X = col1X + col2Width;
      doc.line(col1X, tableY, col1X, tableY + rowHeight * (rows.length + 1));
      doc.line(col2X, tableY, col2X, tableY + rowHeight * (rows.length + 1));

      // Header
      doc.setTextColor(55, 65, 81);
      doc.text('Svaralternativ', leftX + 2, tableY + 4.5);
      doc.text('Antall', col1X + 2, tableY + 4.5);
      doc.text('Prosent', col2X + 2, tableY + 4.5);

      // Rader
      rows.forEach((row, index) => {
        const y = tableY + rowHeight * (index + 1) + 4.5;
        doc.text(row[0], leftX + 2, y);
        doc.text(row[1], col1X + 2, y);
        doc.text(row[2], col2X + 2, y);
      });
    } else {
      doc.setTextColor(107, 114, 128);
      doc.text('Ingen gyldige svar registrert ennå.', leftX, sectionTop + 8);
    }

    // Snittscore-tabell
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text('Snittscore digitale verktøy (1–5)', rightX, sectionTop);

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    const scores = [
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
    ];
    const scoreTableY = sectionTop + 4;
    const scoreRowHeight = 7;
    const scoreCol1Width = 70;
    const scoreCol2Width = 24;
    const scoreTableWidth = scoreCol1Width + scoreCol2Width;

    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.1);
    doc.rect(rightX, scoreTableY, scoreTableWidth, scoreRowHeight * (scores.length + 1));

    for (let i = 1; i <= scores.length; i++) {
      const y = scoreTableY + scoreRowHeight * i;
      doc.line(rightX, y, rightX + scoreTableWidth, y);
    }

    const scoreCol1X = rightX + scoreCol1Width;
    doc.line(
      scoreCol1X,
      scoreTableY,
      scoreCol1X,
      scoreTableY + scoreRowHeight * (scores.length + 1)
    );

    doc.setTextColor(55, 65, 81);
    doc.text('Funksjon', rightX + 2, scoreTableY + 4.5);
    doc.text('Snitt', scoreCol1X + 2, scoreTableY + 4.5);

    scores.forEach((s, index) => {
      const y = scoreTableY + scoreRowHeight * (index + 1) + 4.5;
      const valueText =
        s.value && s.value > 0 ? s.value.toFixed(1).replace('.', ',') : '–';
      doc.text(s.label, rightX + 2, y);
      doc.text(valueText, scoreCol1X + 2, y);
    });

    // Utfordringer-tabell
    const challengesTop = sectionTop + 4 + scoreRowHeight * (scores.length + 1) + 14;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text('Eksempler på største utfordringer', leftX, challengesTop);

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);

    const challenges = responses
      .map((r) => r.biggest_challenge)
      .filter((v): v is string => !!v)
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aMatch =
          aLower.includes('smitte') || aLower.includes('sykdom');
        const bMatch =
          bLower.includes('smitte') || bLower.includes('sykdom');
        if (aMatch === bMatch) return 0;
        return aMatch ? -1 : 1;
      })
      .slice(0, 8);

    if (challenges.length) {
      const challengeRowHeight = 6;
      const challengeWidth = pageWidth - margin * 2;
      const tableHeight = challengeRowHeight * (challenges.length + 1);

      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.1);
      const tableY = challengesTop + 4;
      doc.rect(leftX, tableY, challengeWidth, tableHeight);

      for (let i = 1; i <= challenges.length; i++) {
        const y = tableY + challengeRowHeight * i;
        doc.line(leftX, y, leftX + challengeWidth, y);
      }

      doc.setTextColor(55, 65, 81);
      doc.text('Utfordring', leftX + 2, tableY + 4.5);

      challenges.forEach((c, index) => {
        const y = tableY + challengeRowHeight * (index + 1) + 4;
        const text = `${index + 1}. ${c}`;
        const wrapped = doc.splitTextToSize(
          text,
          challengeWidth - 4
        );
        doc.text(wrapped, leftX + 2, y);
      });
    } else {
      doc.text('Ingen tekstsvar registrert.', leftX, challengesTop + 6);
    }

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
            <p className="text-xs text-gray-500 mt-1">
              {stats.total
                ? `${Math.round((pilotCount / stats.total) * 100)}% av svarene`
                : 'Ingen svar ennå'}
            </p>
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
                const answered =
                  stats.wouldUse.yes +
                  stats.wouldUse.yesIfEasy +
                  stats.wouldUse.unsure +
                  stats.wouldUse.no;
                const percent = answered
                  ? Math.round((item.value / answered) * 100)
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
              <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
                <span className="font-semibold">Samlet positiv holdning: </span>
                {(() => {
                  const positiveCount =
                    stats.wouldUse.yes + stats.wouldUse.yesIfEasy;
                  const answered =
                    stats.wouldUse.yes +
                    stats.wouldUse.yesIfEasy +
                    stats.wouldUse.unsure +
                    stats.wouldUse.no;
                  const positivePercent = answered
                    ? Math.round((positiveCount / answered) * 100)
                    : 0;
                  return `${positiveCount} svar (${positivePercent}%)`;
                })()}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">
                Rapporterte utfordringer
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>Filter:</span>
                <select
                  value={challengeFilter}
                  onChange={(e) =>
                    setChallengeFilter(e.target.value as 'all' | 'disease')
                  }
                  className="border border-gray-300 rounded-full px-2 py-1 bg-white text-xs"
                >
                  <option value="all">Alle</option>
                  <option value="disease">Smitte/sykdom først</option>
                </select>
              </div>
            </div>
            {challengeQuotes.length === 0 ? (
              <p className="text-xs text-gray-500">
                Ingen utfordringer registrert ennå.
              </p>
            ) : (
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                {challengeQuotes.map((text, index) => (
                  <li key={index}>{text}</li>
                ))}
              </ol>
            )}
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
