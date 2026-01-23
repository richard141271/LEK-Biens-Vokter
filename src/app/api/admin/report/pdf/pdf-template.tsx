import React from 'react';
import ReactDOMServer from 'react-dom/server';

// --- Icons (Simplified SVGs) ---
const Icons = {
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Award: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>,
  ShieldCheck: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>,
  Target: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  BarChart3: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>,
  PieIcon: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
};

// --- Components for Server Rendering ---
const ScoreCard = ({ title, value, subtext, iconName, color }: any) => {
  const Icon = Icons[iconName as keyof typeof Icons];
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between relative overflow-hidden break-inside-avoid" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <div className="relative z-10 max-w-[80%]">
        <h3 className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1 break-words">{title}</h3>
        <div className="text-4xl font-bold text-gray-900 mb-2">{value}</div>
        <p className={`text-sm text-${color}-600 font-medium flex items-center gap-1`}>
          {subtext}
        </p>
      </div>
      <div className={`p-3 bg-${color}-50 rounded-xl text-${color}-600`}>
        <Icon />
      </div>
    </div>
  );
};

const SimpleBarChart = ({ data }: any) => {
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
              className="h-full rounded-full"
              style={{ 
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color 
              }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ data, total }: any) => {
  let accumulatedAngle = 0;
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
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 px-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg 
              key={star}
              className={`w-4 h-4 ${star <= score ? 'text-yellow-500' : 'text-gray-200'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="text-sm font-bold text-gray-900 w-8 text-right">{score.toFixed(1)}</span>
      </div>
    </div>
  );
};

const GrowthChart = ({ submissions }: { submissions: any[] }) => {
  const sorted = [...submissions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  if (sorted.length < 2) return null;
  
  const points: {x: number, y: number}[] = [];
  let count = 0;
  const startTime = new Date(sorted[0].created_at).getTime();
  const endTime = new Date().getTime();
  const timeRange = endTime - startTime || 1;
  
  sorted.forEach((sub, i) => {
    count++;
    const time = new Date(sub.created_at).getTime();
    const x = ((time - startTime) / timeRange) * 100;
    points.push({ x, y: count });
  });
  points.push({ x: 100, y: count });
  
  const maxVal = count;
  const getY = (val: number) => 100 - ((val / maxVal) * 80);
  let pathD = `M 0 ${100}`;
  points.forEach(p => pathD += ` L ${p.x} ${getY(p.y)}`);
  pathD += ` L 100 100 Z`;
  
  let lineD = `M 0 ${getY(0)}`;
  if (points.length > 0) {
    lineD = `M ${points[0].x} ${getY(points[0].y)}`;
    points.forEach(p => lineD += ` L ${p.x} ${getY(p.y)}`);
  }
  
  return (
    <div className="w-full h-32 relative">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={pathD} fill="url(#growthGradient)" />
        <path d={lineD} fill="none" stroke="#F59E0B" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0).map((p, i) => (
          <circle key={i} cx={p.x} cy={getY(p.y)} r="1.5" fill="white" stroke="#F59E0B" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="absolute bottom-0 left-0 text-[10px] text-gray-400">Start</div>
      <div className="absolute bottom-0 right-0 text-[10px] text-gray-400">Nå</div>
    </div>
  );
};

export function generatePdfHtml(currentData: any[], totalAnswers: number, type: 'BEEKEEPER' | 'NON_BEEKEEPER') {
  // Stats
  const pilotInterestCount = currentData.filter(s => ['ja', 'kanskje'].includes(s.answers.pilot_interest)).length;
  const pilotInterestPercent = totalAnswers > 0 ? Math.round((pilotInterestCount / totalAnswers) * 100) : 0;
  
  const nblMemberCount = currentData.filter(s => s.answers.nbl_member === 'ja').length;
  const nblMemberPercent = totalAnswers > 0 ? Math.round((nblMemberCount / totalAnswers) * 100) : 0;
  
  const diseaseCount = currentData.filter(s => s.answers.disease_last_3y === true).length;
  const diseasePercent = totalAnswers > 0 ? Math.round((diseaseCount / totalAnswers) * 100) : 0;

  const wouldUseKey = type === 'BEEKEEPER' ? 'would_use_system' : 'digital_tool_interest';
  const wouldUseCounts = {
    ja: currentData.filter(s => ['ja', 'Ja'].includes(s.answers[wouldUseKey])).length,
    ja_enkelt: currentData.filter(s => ['ja_enkelt', 'Ja, hvis det er enkelt å bruke', 'JA, hvis jeg får hjelp til birøkten'].includes(s.answers[wouldUseKey])).length,
    kanskje: currentData.filter(s => ['kanskje', 'Kanskje', 'usikker', 'Usikker'].includes(s.answers[wouldUseKey])).length,
    nei: currentData.filter(s => ['nei', 'Nei'].includes(s.answers[wouldUseKey])).length,
  };
  const totalPositive = wouldUseCounts.ja + wouldUseCounts.ja_enkelt;
  const positivePercent = totalAnswers > 0 ? Math.round((totalPositive / totalAnswers) * 100) : 0;

  // Pie Data
  const pieData = [
    { label: "Ja", value: wouldUseCounts.ja, color: "#F59E0B" },
    { label: "Ja, hvis enkelt", value: wouldUseCounts.ja_enkelt, color: "#FCD34D" },
    { label: "Kanskje/Usikker", value: wouldUseCounts.kanskje, color: "#E5E7EB" },
    { label: "Nei", value: wouldUseCounts.nei, color: "#EF4444" },
  ].filter(d => d.value > 0);

  // Avg Scores
  const avgScores = type === 'BEEKEEPER' ? [
    { label: "Automatisk smittevarsling", key: "value_automatic_alert" },
    { label: "Varsel til nærliggende bigårder", key: "value_nearby_alert" },
    { label: "Enkel rapportering til Mattilsynet", key: "value_reporting" },
    { label: "Bedre oversikt over egen bigård", key: "value_overview" },
  ].map(item => {
    const validScores = currentData.map(s => s.answers[item.key]).filter(v => typeof v === 'number' && v > 0);
    const sum = validScores.reduce((a, b) => a + b, 0);
    const avg = validScores.length > 0 ? sum / validScores.length : 0;
    return { label: item.label, score: avg };
  }) : [];

  const overallAvg = avgScores.length > 0 ? (avgScores.reduce((a, b) => a + b.score, 0) / avgScores.length).toFixed(1) : "0.0";

  const challenges = type === 'BEEKEEPER' ? currentData.map(s => s.answers.biggest_challenge).filter(s => s && s.length > 3).slice(0, 5) : [];

  // --- Render HTML Parts ---
  const scoreCardsHtml = ReactDOMServer.renderToStaticMarkup(
    <div className="grid grid-cols-4 gap-4 mb-8 break-inside-avoid" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <ScoreCard title="Antall Svar" value={totalAnswers} subtext="Verifiserte respondenter" iconName="Users" color="blue" />
      <ScoreCard title="Pilotinteresse" value={pilotInterestCount} subtext={`${pilotInterestPercent}% ønsker å delta`} iconName="Award" color="green" />
      {type === 'BEEKEEPER' ? (
        <>
          <ScoreCard title="Sykdomserfaring" value={`${diseasePercent}%`} subtext="Har opplevd sykdom" iconName="ShieldCheck" color="red" />
          <ScoreCard title="NBL Medlemmer" value={`${nblMemberPercent}%`} subtext="Er organisert" iconName="Target" color="yellow" />
        </>
      ) : (
        <>
           <ScoreCard title="Positiv Holdning" value={`${positivePercent}%`} subtext="Ville brukt systemet" iconName="TrendingUp" color="purple" />
           <ScoreCard title="Honning-elskere" value={`${Math.round((currentData.filter(s => s.answers.nb_eats_honey === 'ja').length / totalAnswers) * 100)}%`} subtext="Spiser mye honning" iconName="Target" color="yellow" />
        </>
      )}
    </div>
  );

  const barChartHtml = ReactDOMServer.renderToStaticMarkup(<SimpleBarChart data={[
    { label: "Ja, absolutt", value: wouldUseCounts.ja, percentage: Math.round((wouldUseCounts.ja/totalAnswers)*100), color: "#059669" },
    { label: "Ja, hvis enkelt / med hjelp", value: wouldUseCounts.ja_enkelt, percentage: Math.round((wouldUseCounts.ja_enkelt/totalAnswers)*100), color: "#3B82F6" },
    { label: "Kanskje / Usikker", value: wouldUseCounts.kanskje, percentage: Math.round((wouldUseCounts.kanskje/totalAnswers)*100), color: "#E5E7EB" },
    { label: "Nei", value: wouldUseCounts.nei, percentage: Math.round((wouldUseCounts.nei/totalAnswers)*100), color: "#EF4444" },
  ]} />);

  const donutChartHtml = ReactDOMServer.renderToStaticMarkup(<DonutChart data={pieData} total={totalAnswers} />);
  
  const ratingsHtml = type === 'BEEKEEPER' ? ReactDOMServer.renderToStaticMarkup(
    <div className="space-y-1">
      {avgScores.map((item, idx) => <FeatureRating key={idx} label={item.label} score={item.score} />)}
    </div>
  ) : '';

  const growthChartHtml = ReactDOMServer.renderToStaticMarkup(<GrowthChart submissions={currentData} />);

  const challengesHtml = challenges.length > 0 ? ReactDOMServer.renderToStaticMarkup(
    <ul className="space-y-3">
        {challenges.map((c, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700 italic bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <span className="text-yellow-400 font-serif text-xl">"</span>
                {c}
            </li>
        ))}
    </ul>
  ) : '';

  return `
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          theme: {
            extend: {
              colors: {
                honey: { 50: '#fffbeb', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' }
              }
            }
          }
        }
      </script>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: ui-sans-serif, system-ui, sans-serif; -webkit-print-color-adjust: exact; }
        .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body class="bg-white text-gray-800">
      
      <!-- Header -->
      <div class="bg-gray-900 text-white p-8 rounded-2xl mb-8 relative overflow-hidden break-inside-avoid">
        <div class="flex justify-between items-center relative z-10">
          <div>
            <h1 class="text-3xl font-bold tracking-tight mb-1">Behovsanalyse</h1>
            <p class="text-honey-400 font-medium uppercase tracking-wider text-sm">
              Administratorsammendrag &ndash; ${type === 'BEEKEEPER' ? 'Birøktere' : 'Samfunn & Marked'}
            </p>
          </div>
          <div class="text-right">
            <div class="text-xs text-gray-400 uppercase tracking-wider mb-1">Generert</div>
            <div class="font-mono text-sm">${new Date().toLocaleDateString('no-NO')}</div>
          </div>
        </div>
      </div>

      <!-- Score Cards Row -->
      ${scoreCardsHtml}

      <!-- Acceptance & Stats Row -->
      <div class="grid grid-cols-1 gap-8 mb-8 break-inside-avoid" style="page-break-inside: avoid; break-inside: avoid;">
        <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm break-inside-avoid" style="page-break-inside: avoid; break-inside: avoid;">
             <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl font-bold text-gray-900">Aksept: Ville du brukt systemet?</h2>
                    <p class="text-sm text-gray-500 mt-1">Fordeling av svar på spørsmål om interesse.</p>
                </div>
                <div class="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold border border-green-100">
                    ${positivePercent}% Positiv
                </div>
            </div>
            ${barChartHtml}
        </div>
      </div>

      <!-- Ratings & Growth Row -->
      ${type === 'BEEKEEPER' ? `
      <div class="grid grid-cols-2 gap-8 mb-8 break-inside-avoid" style="page-break-inside: avoid; break-inside: avoid;">
          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm break-inside-avoid" style="page-break-inside: avoid; break-inside: avoid;">
             <h2 class="text-xl font-bold text-gray-900 mb-4">Verdivurdering (1-5)</h2>
             ${ratingsHtml}
          </div>
          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between break-inside-avoid" style="page-break-inside: avoid; break-inside: avoid;">
             <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                Interessevekst
             </h2>
             <div class="mt-4">
               ${growthChartHtml}
             </div>
             <div class="text-xs text-gray-400 mt-2">Akkumulert antall svar over tid</div>
          </div>
      </div>
      ` : ''}

      <!-- Bottom Row: Challenges & Key Stats -->
      <div class="grid grid-cols-3 gap-8 break-inside-avoid" style="page-break-inside: avoid; break-inside: avoid;">
        
        <!-- Challenges (2/3 width) -->
        <div class="col-span-2 break-inside-avoid" style="page-break-inside: avoid; break-inside: avoid;">
            ${challenges.length > 0 ? `
            <div class="bg-gray-50 rounded-2xl p-6 border border-gray-200 h-full">
                <h2 class="text-lg font-bold text-gray-900 mb-4">Utvalgte utfordringer</h2>
                ${challengesHtml}
            </div>
            ` : ''}
        </div>

        <!-- Key Stats / Donut (1/3 width) -->
        <div class="col-span-1 break-inside-avoid" style="page-break-inside: avoid; break-inside: avoid;">
            <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full flex flex-col justify-center">
                <h2 class="text-lg font-bold text-gray-900 mb-6 text-center">Nøkkelstatistikk</h2>
                <div class="mb-6">
                ${donutChartHtml}
                </div>
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                        <div class="text-xs text-gray-500 uppercase font-bold">Snitt Verdi</div>
                        <div class="text-2xl font-bold text-gray-900">${overallAvg} <span class="text-sm text-gray-400 font-normal">/ 5.0</span></div>
                    </div>
                    <div class="h-10 w-10 bg-honey-100 rounded-full flex items-center justify-center text-honey-600 font-bold">
                        ${overallAvg}
                    </div>
                </div>
            </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="mt-12 text-center text-gray-400 text-sm pt-8 border-t border-gray-100 break-inside-avoid">
        En del av LEK-Biens Vokters™️ Pilotprogram - 2026
      </div>

    </body>
    </html>
  `;
}
