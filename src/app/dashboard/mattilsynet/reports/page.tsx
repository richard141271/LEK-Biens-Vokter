'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, BarChart3, AlertTriangle, CheckCircle, Users, Box as BoxIcon, Download } from 'lucide-react';
import Link from 'next/link';
import { jsPDF } from 'jspdf';

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalBeekeepers: 0,
    totalApiaries: 0,
    totalHives: 0,
    activeSickness: 0,
    resolvedSickness: 0,
    totalInspections: 0
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Use RPC function for accurate stats bypassing RLS
      const { data, error } = await supabase.rpc('get_mattilsynet_stats');
      
      if (error) throw error;

      if (data && data[0]) {
        setStats({
          totalBeekeepers: parseInt(data[0].total_beekeepers),
          totalApiaries: parseInt(data[0].total_apiaries),
          totalHives: parseInt(data[0].total_hives),
          activeSickness: parseInt(data[0].active_sickness),
          resolvedSickness: parseInt(data[0].resolved_sickness),
          totalInspections: parseInt(data[0].total_inspections)
        });
      }

    } catch (e) {
      console.error(e);
      // Fallback to manual counts if RPC fails
      try {
        const { count: beekeeperCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'beekeeper');
        const { count: apiaryCount } = await supabase.from('apiaries').select('*', { count: 'exact', head: true });
        const { count: hiveCount } = await supabase.from('hives').select('*', { count: 'exact', head: true });
        const { count: activeSick } = await supabase.from('hive_logs').select('*', { count: 'exact', head: true }).eq('action', 'SYKDOM').eq('admin_status', 'pending');
        const { count: resolvedSick } = await supabase.from('hive_logs').select('*', { count: 'exact', head: true }).eq('action', 'SYKDOM').eq('admin_status', 'resolved');
        const { count: inspections } = await supabase.from('hive_logs').select('*', { count: 'exact', head: true }).eq('action', 'INSPEKSJON');
  
        setStats({
          totalBeekeepers: beekeeperCount || 0,
          totalApiaries: apiaryCount || 0,
          totalHives: hiveCount || 0,
          activeSickness: activeSick || 0,
          resolvedSickness: resolvedSick || 0,
          totalInspections: inspections || 0
        });
      } catch (err) {
        console.error("Fallback stats failed:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('no-NO');

    // Header
    doc.setFontSize(22);
    doc.text('Årsrapport 2025', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(100);
    doc.text('Mattilsynet - Birøkterregisteret', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generert dato: ${date}`, 105, 38, { align: 'center' });

    // Line separator
    doc.setDrawColor(200);
    doc.line(20, 45, 190, 45);

    // Stats Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Nøkkeltall', 20, 60);

    const startY = 70;
    const lineHeight = 10;
    
    doc.setFontSize(12);
    doc.text(`Totalt antall birøktere: ${stats.totalBeekeepers}`, 20, startY);
    doc.text(`Totalt antall bigårder: ${stats.totalApiaries}`, 20, startY + lineHeight);
    doc.text(`Totalt antall bikuber: ${stats.totalHives}`, 20, startY + lineHeight * 2);
    
    doc.text(`Aktive sykdomsutbrudd: ${stats.activeSickness}`, 20, startY + lineHeight * 4);
    doc.text(`Løste sykdomssaker: ${stats.resolvedSickness}`, 20, startY + lineHeight * 5);
    doc.text(`Utførte inspeksjoner: ${stats.totalInspections}`, 20, startY + lineHeight * 6);

    // Simple Bar Chart Visualization
    doc.text('Visuell Oversikt', 20, startY + lineHeight * 9);
    
    const chartY = startY + lineHeight * 10;
    const maxVal = Math.max(stats.totalBeekeepers, stats.totalApiaries, stats.totalHives, 10);
    const scale = 150 / maxVal; // Scale to fit width

    // Beekeepers bar
    doc.setFontSize(10);
    doc.text('Birøktere', 20, chartY + 5);
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(50, chartY, stats.totalBeekeepers * scale, 6, 'F');
    doc.text(stats.totalBeekeepers.toString(), 50 + stats.totalBeekeepers * scale + 2, chartY + 5);

    // Apiaries bar
    doc.text('Bigårder', 20, chartY + 15);
    doc.setFillColor(34, 197, 94); // Green
    doc.rect(50, chartY + 10, stats.totalApiaries * scale, 6, 'F');
    doc.text(stats.totalApiaries.toString(), 50 + stats.totalApiaries * scale + 2, chartY + 15);

    // Hives bar
    doc.text('Bikuber', 20, chartY + 25);
    doc.setFillColor(249, 115, 22); // Orange
    doc.rect(50, chartY + 20, stats.totalHives * scale, 6, 'F');
    doc.text(stats.totalHives.toString(), 50 + stats.totalHives * scale + 2, chartY + 25);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Denne rapporten er generert automatisk fra Biens Vokter systemet.', 105, 280, { align: 'center' });

    doc.save(`aarsrapport_mattilsynet_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-2xl font-bold text-gray-900">{value}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    </div>
  );

  const chartData = [
    { label: 'Birøktere', value: stats.totalBeekeepers, color: 'bg-blue-500' },
    { label: 'Bigårder', value: stats.totalApiaries, color: 'bg-green-500' },
    { label: 'Bikuber', value: stats.totalHives, color: 'bg-orange-500' },
    { label: 'Aktive utbrudd', value: stats.activeSickness, color: 'bg-red-500' },
    { label: 'Løste saker', value: stats.resolvedSickness, color: 'bg-emerald-500' }
  ];

  const maxValue = Math.max(1, ...chartData.map((d) => d.value || 0));

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/mattilsynet" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Rapporter & Statistikk
                </h1>
            </div>
            <button 
                onClick={generatePDF}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                Last ned Årsrapport (PDF)
            </button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard 
                title="Registrerte Birøktere" 
                value={stats.totalBeekeepers} 
                icon={Users} 
                color="bg-blue-50 text-blue-600" 
            />
            <StatCard 
                title="Totalt Antall Bigårder" 
                value={stats.totalApiaries} 
                icon={BarChart3} 
                color="bg-green-50 text-green-600" 
            />
            <StatCard 
                title="Totalt Antall Bikuber" 
                value={stats.totalHives} 
                icon={Box} 
                color="bg-orange-50 text-orange-600" 
            />
            <StatCard 
                title="Aktive Sykdomsutbrudd" 
                value={stats.activeSickness} 
                icon={AlertTriangle} 
                color="bg-red-50 text-red-600" 
            />
            <StatCard 
                title="Løste Sykdomssaker" 
                value={stats.resolvedSickness} 
                icon={CheckCircle} 
                color="bg-teal-50 text-teal-600" 
            />
            <StatCard 
                title="Utørte Inspeksjoner (i år)" 
                value={stats.totalInspections} 
                icon={FileText} 
                color="bg-purple-50 text-purple-600" 
            />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Årsrapport 2025 (Forhåndsvisning)</h2>
            <p className="text-gray-600 mb-4">
                Denne seksjonen vil inneholde detaljerte grafer og PDF-eksportmuligheter for årsrapportering til Landbruksdirektoratet.
            </p>
            <div className="h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 flex flex-col">
              <div className="flex-1 flex items-end gap-3">
                {chartData.map((item) => (
                  <div key={item.label} className="flex-1 flex flex-col items-center justify-end gap-2">
                    <div className="w-full max-w-[32px] rounded-md overflow-hidden bg-gray-200 flex items-end">
                      <div
                        className={`${item.color} w-full`}
                        style={{ height: `${(item.value / maxValue) * 100 || 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-600 text-center leading-tight">
                      {item.label}
                    </span>
                    <span className="text-xs font-semibold text-gray-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-gray-500">
                Tallene hentes direkte fra systemet og gir et raskt overblikk over situasjonen i 2025.
              </div>
            </div>
        </div>
      </main>
    </div>
  );
}

// Icon helper
function Box(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22v-9" />
      </svg>
    )
}
