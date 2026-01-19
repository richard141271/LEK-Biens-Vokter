'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Activity, ArrowLeft, BarChart2, FileDown, Printer, Flag, Trash2, Undo2, CheckSquare, Square, Users, Bug } from 'lucide-react';
import { jsPDF } from 'jspdf';

type SurveyResponse = {
  id: string;
  created_at: string;
  is_beekeeper: boolean;
  county: string | null;
  pilot_answer: string | null;
  pilot_interest: boolean | null;
  is_test: boolean | null;
  is_invalid: boolean | null;
  submitted_at: string | null;
  ip_address: string | null;

  // Beekeeper specific
  number_of_hives_category: string | null;
  years_experience_category: string | null;
  is_member_norwegian_beekeepers: boolean | null;
  experienced_disease: boolean | null;
  disease_types: string | null;
  current_record_method: string | null;
  time_spent_documentation: string | null;
  value_warning_system: number | null;
  value_nearby_alert: number | null;
  value_reporting: number | null;
  value_better_overview: number | null;
  would_use_system_choice: string | null;
  willingness_to_pay: string | null;
  biggest_challenge: string | null;
  feature_wishes: string | null;

  // Non-beekeeper specific
  eats_honey: string | null;
  rental_interest: string | null;
  rental_price: string | null;
  pollinator_importance: string | null;
  digital_tool_interest: string | null;
  disease_awareness: string | null;
  knowledge_about_beekeeping: string | null;
  considered_starting_beekeeping: string | null;
};

type FilterType = 'all' | 'valid' | 'test' | 'invalid';
type TabType = 'beekeeper' | 'non_beekeeper';

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
  const [activeTab, setActiveTab] = useState<TabType>('beekeeper');

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
    let base = responses;
    
    // Filter by tab
    if (activeTab === 'beekeeper') {
      base = base.filter(r => r.is_beekeeper === true);
    } else {
      base = base.filter(r => r.is_beekeeper === false);
    }

    // Filter by status
    if (filter === 'test') {
      return base.filter((r) => r.is_test === true);
    }
    if (filter === 'invalid') {
      return base.filter((r) => r.is_invalid === true);
    }
    if (filter === 'valid') {
      return base.filter((r) => r.is_test !== true && r.is_invalid !== true);
    }
    return base;
  }, [responses, filter, activeTab]);

  const visibleResponses = useMemo(
    () => filteredResponses.slice(0, 200),
    [filteredResponses]
  );

  const beekeeperStats = useMemo(() => {
    const relevant = responses.filter(r => r.is_beekeeper === true && r.is_test !== true && r.is_invalid !== true);
    if (!relevant.length) {
      return {
        total: 0,
        experiencedDisease: 0,
        memberCount: 0,
        avgWarning: 0,
        avgNearby: 0,
        avgReporting: 0,
        avgOverview: 0,
        wouldUse: { yes: 0, yesIfEasy: 0, unsure: 0, no: 0 },
      };
    }

    const total = relevant.length;
    let experiencedDisease = 0;
    let memberCount = 0;
    let sumWarning = 0; let countWarning = 0;
    let sumNearby = 0; let countNearby = 0;
    let sumReporting = 0; let countReporting = 0;
    let sumOverview = 0; let countOverview = 0;
    let yes = 0; let yesIfEasy = 0; let unsure = 0; let no = 0;

    relevant.forEach((r) => {
      if (r.experienced_disease) experiencedDisease += 1;
      if (r.is_member_norwegian_beekeepers) memberCount += 1;
      if (r.value_warning_system != null) { sumWarning += r.value_warning_system; countWarning += 1; }
      if (r.value_nearby_alert != null) { sumNearby += r.value_nearby_alert; countNearby += 1; }
      if (r.value_reporting != null) { sumReporting += r.value_reporting; countReporting += 1; }
      if (r.value_better_overview != null) { sumOverview += r.value_better_overview; countOverview += 1; }

      const choice = (r.would_use_system_choice || '').toLowerCase();
      if (choice === 'ja') yes += 1;
      else if (choice.startsWith('ja, hvis')) yesIfEasy += 1;
      else if (choice.startsWith('vet')) unsure += 1;
      else if (choice === 'nei') no += 1;
    });

    const avg = (sum: number, count: number) => count ? Math.round((sum / count) * 10) / 10 : 0;

    return {
      total,
      experiencedDisease,
      memberCount,
      avgWarning: avg(sumWarning, countWarning),
      avgNearby: avg(sumNearby, countNearby),
      avgReporting: avg(sumReporting, countReporting),
      avgOverview: avg(sumOverview, countOverview),
      wouldUse: { yes, yesIfEasy, unsure, no },
    };
  }, [responses]);

  const nonBeekeeperStats = useMemo(() => {
    const relevant = responses.filter(r => r.is_beekeeper === false && r.is_test !== true && r.is_invalid !== true);
    if (!relevant.length) {
      return {
        total: 0,
        eatsHoney: { yes: 0, no: 0, unsure: 0 },
        rentalInterest: { yes: 0, no: 0, unsure: 0, maybe: 0 },
        pollinatorImportance: { yes: 0, no: 0, unsure: 0 },
        digitalToolInterest: { yes: 0, no: 0, unsure: 0 },
      };
    }

    const total = relevant.length;
    const eatsHoney = { yes: 0, no: 0, unsure: 0 };
    const rentalInterest = { yes: 0, no: 0, unsure: 0, maybe: 0 };
    const pollinatorImportance = { yes: 0, no: 0, unsure: 0 };
    const digitalToolInterest = { yes: 0, no: 0, unsure: 0 };

    relevant.forEach((r) => {
      if (r.eats_honey === 'ja') eatsHoney.yes++;
      else if (r.eats_honey === 'nei') eatsHoney.no++;
      else if (r.eats_honey === 'vet_ikke') eatsHoney.unsure++;

      if (r.rental_interest === 'ja') rentalInterest.yes++;
      else if (r.rental_interest === 'nei') rentalInterest.no++;
      else if (r.rental_interest === 'vet_ikke') rentalInterest.unsure++;
      else if (r.rental_interest === 'kanskje') rentalInterest.maybe++;

      if (r.pollinator_importance === 'ja') pollinatorImportance.yes++;
      else if (r.pollinator_importance === 'nei') pollinatorImportance.no++;
      else if (r.pollinator_importance === 'vet_ikke') pollinatorImportance.unsure++;

      if (r.digital_tool_interest === 'ja') digitalToolInterest.yes++;
      else if (r.digital_tool_interest === 'nei') digitalToolInterest.no++;
      else if (r.digital_tool_interest === 'vet_ikke') digitalToolInterest.unsure++;
    });

    return { total, eatsHoney, rentalInterest, pollinatorImportance, digitalToolInterest };
  }, [responses]);

  const challengeQuotes = useMemo(() => {
    const source = responses.filter(
      (r) => r.is_beekeeper === true && r.is_test !== true && r.is_invalid !== true
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
      'id', 'created_at', 'is_beekeeper', 'county', 'pilot_answer', 'pilot_interest',
      'is_test', 'is_invalid', 'ip_address',
      // Beekeeper
      'number_of_hives_category', 'years_experience_category', 'is_member_norwegian_beekeepers',
      'experienced_disease', 'disease_types', 'current_record_method', 'time_spent_documentation',
      'value_warning_system', 'value_nearby_alert', 'value_reporting', 'value_better_overview',
      'would_use_system_choice', 'willingness_to_pay', 'biggest_challenge', 'feature_wishes',
      // Non-beekeeper
      'eats_honey', 'rental_interest', 'rental_price', 'pollinator_importance',
      'digital_tool_interest', 'disease_awareness', 'knowledge_about_beekeeping', 'considered_starting_beekeeping'
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

  const generatePdfReport = async () => {
    if (!responses.length) return;
    
    // Create new document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Helper for text
    const addText = (text: string, fontSize = 12, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      // Handle multi-line
      const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
      doc.text(lines, margin, y);
      y += (lines.length * fontSize * 0.5) + 4; // Spacing based on font size
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    };

    // Title
    addText(`Rapport: Behovsanalyse - ${activeTab === 'beekeeper' ? 'Birøktere' : 'Ikke-birøktere'}`, 18, true);
    addText(`Generert: ${new Date().toLocaleDateString('no-NO')}`, 10);
    y += 10;

    if (activeTab === 'beekeeper') {
      addText(`Antall svar totalt: ${beekeeperStats.total}`, 14, true);
      y += 5;
      
      addText(`Erfart sykdom: ${beekeeperStats.experiencedDisease} (${beekeeperStats.total ? Math.round(beekeeperStats.experiencedDisease / beekeeperStats.total * 100) : 0}%)`);
      addText(`Medlem i NBL: ${beekeeperStats.memberCount} (${beekeeperStats.total ? Math.round(beekeeperStats.memberCount / beekeeperStats.total * 100) : 0}%)`);
      y += 5;
      
      addText('Verdivurdering (Snitt 1-5):', 12, true);
      addText(`- Automatisk smittevarsling: ${beekeeperStats.avgWarning}`);
      addText(`- Varsel til nærliggende: ${beekeeperStats.avgNearby}`);
      addText(`- Enkel rapportering: ${beekeeperStats.avgReporting}`);
      addText(`- Bedre oversikt: ${beekeeperStats.avgOverview}`);
      y += 5;

      addText('Ville brukt systemet:', 12, true);
      addText(`- Ja: ${beekeeperStats.wouldUse.yes}`);
      addText(`- Ja, hvis enkelt: ${beekeeperStats.wouldUse.yesIfEasy}`);
      addText(`- Vet ikke: ${beekeeperStats.wouldUse.unsure}`);
      addText(`- Nei: ${beekeeperStats.wouldUse.no}`);

    } else {
      addText(`Antall svar totalt: ${nonBeekeeperStats.total}`, 14, true);
      y += 5;
      
      addText('Interesse for å leie bikube:', 12, true);
      addText(`- Ja: ${nonBeekeeperStats.rentalInterest.yes}`);
      addText(`- Kanskje: ${nonBeekeeperStats.rentalInterest.maybe}`);
      addText(`- Nei: ${nonBeekeeperStats.rentalInterest.no}`);
      if (nonBeekeeperStats.rentalInterest.unsure > 0) {
        addText(`- Vet ikke (gammelt): ${nonBeekeeperStats.rentalInterest.unsure}`);
      }
      y += 5;

      addText('Spiser honning:', 12, true);
      addText(`- Ja: ${nonBeekeeperStats.eatsHoney.yes}`);
      addText(`- Nei: ${nonBeekeeperStats.eatsHoney.no}`);
      addText(`- Vet ikke: ${nonBeekeeperStats.eatsHoney.unsure}`);
      y += 5;
      
      addText('Viktighet av pollinatorer:', 12, true);
      addText(`- Ja: ${nonBeekeeperStats.pollinatorImportance.yes}`);
      addText(`- Nei: ${nonBeekeeperStats.pollinatorImportance.no}`);
      addText(`- Vet ikke: ${nonBeekeeperStats.pollinatorImportance.unsure}`);
      y += 5;

      addText('Interesse for digitalt verktøy:', 12, true);
      addText(`- Ja: ${nonBeekeeperStats.digitalToolInterest.yes}`);
      addText(`- Nei: ${nonBeekeeperStats.digitalToolInterest.no}`);
      addText(`- Vet ikke: ${nonBeekeeperStats.digitalToolInterest.unsure}`);
    }

    // Save
    doc.save(`behovsanalyse_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
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
        console.error('Feil ved sletting av svar:', await res.text());
        setError('Kunne ikke slette ett eller flere svar.');
        return;
      }
      setResponses((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    const res = await fetch(`/api/admin/survey-responses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      console.error('Feil ved oppdatering av svar:', await res.text());
      setError('Kunne ikke oppdatere ett eller flere svar.');
      return;
    }

    const patch = 
      action === 'mark_test' ? { is_test: true, is_invalid: false } :
      action === 'mark_invalid' ? { is_invalid: true } :
      { is_test: false, is_invalid: false };
    
    setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
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
            <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-gray-300 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" />
              Tilbake til admin
            </Link>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-white">{profile?.full_name || 'Administrator'}</div>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Resultater – Behovsanalyse</h1>
            <p className="text-sm text-gray-600">Oversikt over svar fra både birøktere og ikke-birøktere.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportCsv} disabled={!responses.length} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60">
              <FileDown className="w-4 h-4" />
              Eksporter til CSV
            </button>
            <button onClick={generatePdfReport} disabled={!responses.length} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-60">
              <Printer className="w-4 h-4" />
              Last ned PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          <button
            onClick={() => setActiveTab('beekeeper')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'beekeeper'
                ? 'border-honey-500 text-honey-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bug className="w-4 h-4" />
            Birøktere ({responses.filter(r => r.is_beekeeper).length})
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
            Ikke-birøktere ({responses.filter(r => !r.is_beekeeper).length})
          </button>
        </div>

        {activeTab === 'beekeeper' ? (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Antall svar</p>
                <p className="text-2xl font-bold text-gray-900">{beekeeperStats.total}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Sykdomserfaring</p>
                <p className="text-2xl font-bold text-red-600">
                  {beekeeperStats.total ? Math.round((beekeeperStats.experiencedDisease / beekeeperStats.total) * 100) : 0}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Medlem i NBL</p>
                <p className="text-2xl font-bold text-honey-600">
                  {beekeeperStats.total ? Math.round((beekeeperStats.memberCount / beekeeperStats.total) * 100) : 0}%
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-honey-600" />
                  Ville du brukt systemet?
                </h2>
                <div className="space-y-3">
                  {[
                    { label: 'Ja', value: beekeeperStats.wouldUse.yes, color: 'bg-honey-500' },
                    { label: 'Ja, hvis enkelt', value: beekeeperStats.wouldUse.yesIfEasy, color: 'bg-green-500' },
                    { label: 'Vet ikke', value: beekeeperStats.wouldUse.unsure, color: 'bg-yellow-500' },
                    { label: 'Nei', value: beekeeperStats.wouldUse.no, color: 'bg-red-500' },
                  ].map((item) => {
                     const total = beekeeperStats.wouldUse.yes + beekeeperStats.wouldUse.yesIfEasy + beekeeperStats.wouldUse.unsure + beekeeperStats.wouldUse.no;
                     const percent = total ? Math.round((item.value / total) * 100) : 0;
                     return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>{item.label}</span>
                          <span className="text-gray-500">{item.value} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Verdivurdering (Snitt 1-5)</h2>
                <div className="space-y-4">
                  {[
                    { label: 'Automatisk smittevarsling', value: beekeeperStats.avgWarning },
                    { label: 'Varsel til nærliggende', value: beekeeperStats.avgNearby },
                    { label: 'Enkel rapportering', value: beekeeperStats.avgReporting },
                    { label: 'Bedre oversikt', value: beekeeperStats.avgOverview },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span>{item.label}</span>
                        <span className="font-bold">{item.value}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(item.value / 5) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

             <section className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-10">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Utvalgte utfordringer (Fritekst)</h3>
                <div className="flex gap-2">
                  <button onClick={() => setChallengeFilter('all')} className={`px-3 py-1 text-xs rounded-full ${challengeFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600'}`}>Alle</button>
                  <button onClick={() => setChallengeFilter('disease')} className={`px-3 py-1 text-xs rounded-full ${challengeFilter === 'disease' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white border text-gray-600'}`}>Sykdom/Smitte</button>
                </div>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {challengeQuotes.length > 0 ? (
                  challengeQuotes.map((quote, i) => (
                    <div key={i} className="p-4 text-sm text-gray-600 italic">"{quote}"</div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">Ingen sitater funnet med valgt filter.</div>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Non-Beekeeper Stats */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Antall svar</p>
                <p className="text-2xl font-bold text-gray-900">{nonBeekeeperStats.total}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Interesse for leie</p>
                <p className="text-2xl font-bold text-honey-600">
                  {nonBeekeeperStats.total ? Math.round((nonBeekeeperStats.rentalInterest.yes / nonBeekeeperStats.total) * 100) : 0}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Spiser honning (Ja)</p>
                <p className="text-2xl font-bold text-honey-600">
                  {nonBeekeeperStats.total ? Math.round((nonBeekeeperStats.eatsHoney.yes / nonBeekeeperStats.total) * 100) : 0}%
                </p>
              </div>
            </section>

             <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
              <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Interesse for å leie bikube</h2>
                 <div className="space-y-3">
                  {[
                    { label: 'Ja', value: nonBeekeeperStats.rentalInterest.yes, color: 'bg-honey-500' },
                    { label: 'Kanskje', value: nonBeekeeperStats.rentalInterest.maybe, color: 'bg-orange-300' },
                    { label: 'Nei', value: nonBeekeeperStats.rentalInterest.no, color: 'bg-gray-300' },
                    ...(nonBeekeeperStats.rentalInterest.unsure > 0 ? [{ label: 'Vet ikke (gammelt)', value: nonBeekeeperStats.rentalInterest.unsure, color: 'bg-yellow-500' }] : []),
                  ].map((item) => {
                     const total = nonBeekeeperStats.rentalInterest.yes + nonBeekeeperStats.rentalInterest.no + nonBeekeeperStats.rentalInterest.unsure + nonBeekeeperStats.rentalInterest.maybe;
                     const percent = total ? Math.round((item.value / total) * 100) : 0;
                     return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>{item.label}</span>
                          <span className="text-gray-500">{item.value} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>

               <div className="bg-white p-5 rounded-xl border border-gray-200">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Viktighet av pollinatorer</h2>
                 <div className="space-y-3">
                  {[
                    { label: 'Ja', value: nonBeekeeperStats.pollinatorImportance.yes, color: 'bg-green-500' },
                    { label: 'Nei', value: nonBeekeeperStats.pollinatorImportance.no, color: 'bg-red-500' },
                    { label: 'Vet ikke', value: nonBeekeeperStats.pollinatorImportance.unsure, color: 'bg-yellow-500' },
                  ].map((item) => {
                     const total = nonBeekeeperStats.pollinatorImportance.yes + nonBeekeeperStats.pollinatorImportance.no + nonBeekeeperStats.pollinatorImportance.unsure;
                     const percent = total ? Math.round((item.value / total) * 100) : 0;
                     return (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>{item.label}</span>
                          <span className="text-gray-500">{item.value} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>
             </section>
          </>
        )}

        {/* Detailed List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Alle svar ({visibleResponses.length})</h3>
            <div className="flex gap-2">
               <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  filter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setFilter('valid')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  filter === 'valid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Gyldige
              </button>
              <button
                onClick={() => setFilter('test')}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  filter === 'test' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Testdata
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Dato</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Fylke</th>
                  {activeTab === 'beekeeper' ? (
                     <>
                        <th className="px-4 py-3">Kuber</th>
                        <th className="px-4 py-3">Sykdom?</th>
                        <th className="px-4 py-3">Pilot?</th>
                     </>
                  ) : (
                     <>
                        <th className="px-4 py-3">Leie?</th>
                        <th className="px-4 py-3">Spiser honning?</th>
                        <th className="px-4 py-3">Pilot?</th>
                     </>
                  )}
                  <th className="px-4 py-3 text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleResponses.map((r) => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${r.is_test ? 'bg-yellow-50/50' : ''} ${r.is_invalid ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {new Date(r.created_at).toLocaleDateString('no-NO')}
                    </td>
                    <td className="px-4 py-3">
                       {r.is_beekeeper ? (
                         <span className="px-2 py-1 bg-honey-100 text-honey-700 rounded-full text-xs">Birøkter</span>
                       ) : (
                         <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Ikke-birøkter</span>
                       )}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{r.county || '–'}</td>
                    {activeTab === 'beekeeper' ? (
                       <>
                         <td className="px-4 py-3">{r.number_of_hives_category || '–'}</td>
                         <td className="px-4 py-3">
                           {r.experienced_disease ? (
                             <span className="text-red-600 font-medium">Ja</span>
                           ) : (
                             <span className="text-green-600">Nei</span>
                           )}
                         </td>
                       </>
                    ) : (
                       <>
                         <td className="px-4 py-3">{r.rental_interest || '–'}</td>
                         <td className="px-4 py-3">{r.eats_honey || '–'}</td>
                       </>
                    )}
                    <td className="px-4 py-3">
                       {r.pilot_interest ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Interessert</span>
                       ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                       <button onClick={() => performActionOnId(r.id, 'delete')} className="text-gray-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
