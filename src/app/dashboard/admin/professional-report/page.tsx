'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Download, BarChart3, PieChart as PieIcon, TrendingUp, Users, ShieldCheck, Mail, Award, Target, Info } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface Submission {
  id: string;
  is_beekeeper: boolean;
  answers: Record<string, any>;
  created_at: string;
}

// Components
const ScoreCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all duration-300 report-card`}>
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
      <Icon size={80} className={`text-${color}-500`} />
    </div>
    <div className="relative z-10 max-w-[80%]">
      <h3 className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1 break-words">{title}</h3>
      <div className="text-4xl font-bold text-gray-900 mb-2">{value}</div>
      <p className={`text-sm text-${color}-600 font-medium flex items-center gap-1`}>
        {subtext}
      </p>
    </div>
    <div className={`p-3 bg-${color}-50 rounded-xl text-${color}-600 group-hover:scale-110 transition-transform`}>
      <Icon size={24} />
    </div>
  </div>
);

const SimpleBarChart = ({ data, color = "honey" }: any) => {
  const max = Math.max(...data.map((d: any) => d.value));
  
  return (
    <div className="space-y-4">
      {data.map((item: any, idx: number) => (
        <div key={idx} className="group">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">{item.label}</span>
            <span className="text-gray-500 font-mono">{item.value} ({item.percentage}%)</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out group-hover:opacity-80 relative`}
              style={{ 
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color || (color === 'honey' ? '#F59E0B' : '#10B981') 
              }}
            >
                <div className="absolute inset-0 bg-white/20 animate-pulse hidden group-hover:block"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ data, total }: any) => {
  let accumulatedAngle = 0;
  
  // Calculate stroke dash array for SVG circle
  // Circumference = 2 * PI * r
  // r = 40 => C ≈ 251.2
  const r = 40;
  const C = 2 * Math.PI * r;

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
        {data.map((item: any, idx: number) => {
          const percentage = item.value / total;
          const strokeDasharray = `${percentage * C} ${C}`;
          const strokeDashoffset = -accumulatedAngle * C;
          accumulatedAngle += percentage;
          
          return (
            <circle
              key={idx}
              cx="50"
              cy="50"
              r={r}
              fill="transparent"
              stroke={item.color}
              strokeWidth="20"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 hover:opacity-80 cursor-pointer"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-3xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-500 uppercase font-medium">Svar</span>
      </div>
    </div>
  );
};

const FeatureRating = ({ label, score }: any) => {
    // Score is 1-5
    const percentage = (score / 5) * 100;
    
    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 group hover:bg-gray-50 px-2 rounded-lg transition-colors">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="relative">
                            <svg 
                                className={`w-4 h-4 ${star <= score ? 'text-honey-500' : 'text-gray-200'}`} 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                            >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {/* Partial star logic could go here if needed */}
                        </div>
                    ))}
                </div>
                <span className="text-sm font-bold text-gray-900 w-8 text-right">{score.toFixed(1)}</span>
            </div>
        </div>
    );
};

const GrowthChart = ({ submissions }: { submissions: Submission[] }) => {
    // Sort by date
    const sorted = [...submissions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    if (sorted.length < 2) return null;

    // Create cumulative data points
    const points: {x: number, y: number}[] = [];
    let count = 0;
    
    // Normalize time to 0-100 scale
    const startTime = new Date(sorted[0].created_at).getTime();
    const endTime = new Date().getTime(); // or last submission time
    const timeRange = endTime - startTime || 1;

    sorted.forEach((sub, i) => {
        count++;
        const time = new Date(sub.created_at).getTime();
        const x = ((time - startTime) / timeRange) * 100;
        points.push({ x, y: count });
    });

    // Add current time point if not exists
    points.push({ x: 100, y: count });

    const maxVal = count;
    
    // Generate SVG path
    // Scale Y to 0-100 (inverted for SVG where 0 is top)
    const getY = (val: number) => 100 - ((val / maxVal) * 80); // Keep some padding at bottom
    
    let pathD = `M 0 ${100}`; // Start at bottom left
    points.forEach(p => {
        pathD += ` L ${p.x} ${getY(p.y)}`;
    });
    pathD += ` L 100 100 Z`; // Close path to bottom right

    // Line only path
    let lineD = `M 0 ${getY(0)}`; // Approximate start
    if (points.length > 0) {
        lineD = `M ${points[0].x} ${getY(points[0].y)}`;
        points.forEach(p => {
            lineD += ` L ${p.x} ${getY(p.y)}`;
        });
    }

    return (
        <div className="w-full h-32 relative group">
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Gradient Definition */}
                <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
                    </linearGradient>
                </defs>
                
                {/* Area */}
                <path d={pathD} fill="url(#growthGradient)" className="transition-all duration-1000 ease-in-out" />
                
                {/* Line */}
                <path d={lineD} fill="none" stroke="#F59E0B" strokeWidth="2" vectorEffect="non-scaling-stroke" className="drop-shadow-sm" />
                
                {/* Points */}
                {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0).map((p, i) => (
                    <circle key={i} cx={p.x} cy={getY(p.y)} r="1.5" fill="white" stroke="#F59E0B" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                ))}
            </svg>
            <div className="absolute bottom-0 left-0 text-[10px] text-gray-400">Start</div>
            <div className="absolute bottom-0 right-0 text-[10px] text-gray-400">Nå</div>
        </div>
    );
};

export default function InnovationNorwayReport() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BEEKEEPER' | 'NON_BEEKEEPER'>('BEEKEEPER');

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/survey-responses', { cache: 'no-store' });
        const data = await res.json();
        const allResponses = data.responses || [];
        
        const mappedSubmissions = allResponses.map((row: any) => ({
          id: row.id,
          is_beekeeper: row.is_beekeeper,
          created_at: row.created_at,
          answers: mapResponseToAnswers(row, row.is_beekeeper ? "BEEKEEPER" : "NON_BEEKEEPER")
        }));
        
        setSubmissions(mappedSubmissions);
      } catch (error) {
        console.error("Error fetching survey responses:", error);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  const mapResponseToAnswers = (row: any, type: "BEEKEEPER" | "NON_BEEKEEPER") => {
    // Reuse mapping logic (simplified for this report)
    if (type === "BEEKEEPER") {
      return {
        hives_count: row.number_of_hives_category,
        nbl_member: row.is_member_norwegian_beekeepers ? 'ja' : 'nei',
        disease_last_3y: row.experienced_disease,
        value_automatic_alert: row.value_warning_system,
        value_nearby_alert: row.value_nearby_alert,
        value_reporting: row.value_reporting,
        value_overview: row.value_better_overview,
        would_use_system: row.would_use_system_choice,
        pilot_interest: row.pilot_answer,
        biggest_challenge: row.biggest_challenge,
      };
    } else {
      return {
        rental_interest: row.rental_interest,
        pollinator_importance: row.pollinator_importance,
        digital_tool_interest: row.digital_tool_interest,
        disease_awareness: row.disease_awareness,
        pilot_interest: row.pilot_answer,
        // Map other fields as needed for specific charts
        nb_eats_honey: row.eats_honey,
      };
    }
  };

  const currentData = submissions.filter(s => 
    activeTab === 'BEEKEEPER' ? s.is_beekeeper : !s.is_beekeeper
  );

  // Statistics Calculation
  const totalAnswers = currentData.length;
  
  // Pilot Interest
  const pilotInterestCount = currentData.filter(s => 
    ['ja', 'kanskje'].includes(s.answers.pilot_interest)
  ).length;
  const pilotInterestPercent = totalAnswers > 0 ? Math.round((pilotInterestCount / totalAnswers) * 100) : 0;

  // Specific Stats for Beekeeper
  const nblMemberCount = currentData.filter(s => s.answers.nbl_member === 'ja').length;
  const nblMemberPercent = totalAnswers > 0 ? Math.round((nblMemberCount / totalAnswers) * 100) : 0;
  
  const diseaseCount = currentData.filter(s => s.answers.disease_last_3y === true).length;
  const diseasePercent = totalAnswers > 0 ? Math.round((diseaseCount / totalAnswers) * 100) : 0;

  // "Would use system" logic
  const wouldUseKey = activeTab === 'BEEKEEPER' ? 'would_use_system' : 'digital_tool_interest';
  const wouldUseCounts = {
    ja: currentData.filter(s => ['ja', 'Ja'].includes(s.answers[wouldUseKey])).length,
    ja_enkelt: currentData.filter(s => ['ja_enkelt', 'Ja, hvis det er enkelt å bruke', 'JA, hvis jeg får hjelp til birøkten'].includes(s.answers[wouldUseKey])).length,
    kanskje: currentData.filter(s => ['kanskje', 'Kanskje', 'usikker', 'Usikker'].includes(s.answers[wouldUseKey])).length,
    nei: currentData.filter(s => ['nei', 'Nei'].includes(s.answers[wouldUseKey])).length,
  };

  const totalPositive = wouldUseCounts.ja + wouldUseCounts.ja_enkelt;
  const positivePercent = totalAnswers > 0 ? Math.round((totalPositive / totalAnswers) * 100) : 0;

  // Average Scores (Beekeeper only)
  const avgScores = activeTab === 'BEEKEEPER' ? [
    { label: "Automatisk smittevarsling", key: "value_automatic_alert" },
    { label: "Varsel til nærliggende bigårder", key: "value_nearby_alert" },
    { label: "Enkel rapportering til Mattilsynet", key: "value_reporting" },
    { label: "Bedre oversikt over egen bigård", key: "value_overview" },
  ].map(item => {
    const validScores = currentData
        .map(s => s.answers[item.key])
        .filter(v => typeof v === 'number' && v > 0);
    const sum = validScores.reduce((a, b) => a + b, 0);
    const avg = validScores.length > 0 ? sum / validScores.length : 0;
    return { label: item.label, score: avg };
  }) : [];

  const overallAvg = avgScores.length > 0 
    ? (avgScores.reduce((a, b) => a + b.score, 0) / avgScores.length).toFixed(1)
    : "0.0";

  // Pie Chart Data
  const pieData = [
    { label: "Ja", value: wouldUseCounts.ja, color: "#F59E0B" }, // honey-500
    { label: "Ja, hvis enkelt", value: wouldUseCounts.ja_enkelt, color: "#FCD34D" }, // honey-300
    { label: "Kanskje/Usikker", value: wouldUseCounts.kanskje, color: "#E5E7EB" }, // gray-200
    { label: "Nei", value: wouldUseCounts.nei, color: "#EF4444" }, // red-500
  ].filter(d => d.value > 0);

  // Challenges (Top 5 strings)
  const challenges = activeTab === 'BEEKEEPER' 
    ? currentData
        .map(s => s.answers.biggest_challenge)
        .filter(s => s && s.length > 3)
        .slice(0, 5)
    : [];

  const handleDownloadPdf = () => {
    window.location.href = `/api/admin/report/pdf?type=${activeTab}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      {/* Navigation & Controls */}
      <div className="max-w-[210mm] mx-auto mb-8 flex justify-between items-center">
        <Link href="/dashboard/admin/survey-results-v2" className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tilbake
        </Link>
        <div className="flex gap-4">
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('BEEKEEPER')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'BEEKEEPER' ? 'bg-honey-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Birøktere
            </button>
            <button
              onClick={() => setActiveTab('NON_BEEKEEPER')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'NON_BEEKEEPER' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Ikke-Birøktere
            </button>
          </div>
          <button onClick={handleDownloadPdf} className="flex h-9 items-center gap-2 px-4 bg-white text-gray-700 font-medium rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50">
            <Download size={18} />
            Last ned PDF-rapport
          </button>
        </div>
      </div>

      {/* A4 Page Container */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl min-h-[297mm] relative overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-1/3 -translate-y-1/3 blur-3xl"></div>
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-6">
              <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/20">
                <Image 
                    src="/BILDER/LEK-Biens vokter våpen.png" 
                    alt="LEK-Biens Vokter Våpenskjold" 
                    width={80} 
                    height={80} 
                    className="drop-shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">Behovsanalyse</h1>
                <p className="text-honey-400 font-medium uppercase tracking-wider text-sm">
                  Administratorsammendrag &ndash; {activeTab === 'BEEKEEPER' ? 'Birøktere' : 'Samfunn & Marked'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Generert</div>
              <div className="font-mono text-sm">{new Date().toLocaleDateString('no-NO')}</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="p-8 space-y-8">
          
          {/* Top Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreCard 
                title="Antall Svar" 
                value={totalAnswers} 
                subtext="Verifiserte respondenter" 
                icon={Users}
                color="blue"
            />
            <ScoreCard 
                title="Pilotinteresse" 
                value={pilotInterestCount} 
                subtext={`${pilotInterestPercent}% ønsker å delta`} 
                icon={Award}
                color="green"
            />
            {activeTab === 'BEEKEEPER' ? (
                <>
                    <ScoreCard 
                        title="Sykdomserfaring" 
                        value={`${diseasePercent}%`} 
                        subtext="Har opplevd sykdom" 
                        icon={ShieldCheck}
                        color="red"
                    />
                    <ScoreCard 
                        title="NBL Medlemmer" 
                        value={`${nblMemberPercent}%`} 
                        subtext="Er organisert" 
                        icon={Target}
                        color="honey"
                    />
                </>
            ) : (
                <>
                   <ScoreCard 
                        title="Positiv Holdning" 
                        value={`${positivePercent}%`} 
                        subtext="Ville brukt systemet" 
                        icon={TrendingUp}
                        color="purple"
                    />
                    <ScoreCard 
                        title="Honning-elskere" 
                        value={`${Math.round((currentData.filter(s => s.answers.nb_eats_honey === 'ja').length / totalAnswers) * 100)}%`} 
                        subtext="Spiser mye honning" 
                        icon={Target}
                        color="honey"
                    />
                </>
            )}
          </div>

          {/* Main Analysis Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Acceptance & Chart */}
            <div className="md:col-span-2 space-y-8">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm report-card">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <BarChart3 className="text-honey-500" />
                            Aksept: Ville du brukt systemet?
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Fordeling av svar på spørsmål om interesse for digitalt smittevernverktøy.
                        </p>
                    </div>
                    <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-100">
                        {positivePercent}% Positiv
                    </div>
                </div>
                
                <SimpleBarChart 
                    data={[
                        { label: "Ja, absolutt", value: wouldUseCounts.ja, percentage: Math.round((wouldUseCounts.ja/totalAnswers)*100), color: "#059669" },
                        { label: "Ja, hvis enkelt / med hjelp", value: wouldUseCounts.ja_enkelt, percentage: Math.round((wouldUseCounts.ja_enkelt/totalAnswers)*100), color: "#3B82F6" },
                        { label: "Kanskje / Usikker", value: wouldUseCounts.kanskje, percentage: Math.round((wouldUseCounts.kanskje/totalAnswers)*100), color: "#E5E7EB" },
                        { label: "Nei", value: wouldUseCounts.nei, percentage: Math.round((wouldUseCounts.nei/totalAnswers)*100), color: "#EF4444" },
                    ]} 
                />
              </div>

              {/* Feature Ratings (Only for Beekeepers) */}
              {activeTab === 'BEEKEEPER' && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm report-card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="text-honey-500" />
                        Verdivurdering (1-5)
                    </h2>
                    <div className="space-y-1">
                        {avgScores.map((item, idx) => (
                            <FeatureRating key={idx} label={item.label} score={item.score} />
                        ))}
                    </div>
                  </div>
              )}

               {/* Qualitative Feedback */}
               {activeTab === 'BEEKEEPER' && challenges.length > 0 && (
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200 report-card">
                      <h2 className="text-lg font-bold text-gray-900 mb-4">Utvalgte utfordringer fra birøktere</h2>
                      <ul className="space-y-3">
                          {challenges.map((c, i) => (
                              <li key={i} className="flex gap-3 text-sm text-gray-700 italic bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                  <span className="text-honey-400 font-serif text-xl">"</span>
                                  {c}
                              </li>
                          ))}
                      </ul>
                  </div>
              )}
            </div>

            {/* Right Column: Key Stats & Pie */}
            <div className="space-y-8">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm report-card">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <PieIcon className="text-blue-500" />
                        Nøkkelstatistikk
                    </h2>
                    
                    <div className="mb-8">
                        <DonutChart data={pieData} total={totalAnswers} />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold">Gjennomsnittlig Verdi</div>
                                <div className="text-2xl font-bold text-gray-900">{overallAvg} <span className="text-sm text-gray-400 font-normal">/ 5.0</span></div>
                            </div>
                            <div className="h-10 w-10 bg-honey-100 rounded-full flex items-center justify-center text-honey-600 font-bold">
                                {overallAvg}
                            </div>
                        </div>
                    </div>
                </div>

                 {/* Growth Chart */}
                 <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm report-card">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-green-500" />
                        Interessevekst
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">Akkumulert antall svar over tid</p>
                    <GrowthChart submissions={currentData} />
                </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-0 w-full p-8 text-center text-gray-400 text-sm border-t border-gray-100">
            En del av LEK-Biens Vokters™️ Pilotprogram - 2026
        </div>
      </div>
    </div>
  );
}
