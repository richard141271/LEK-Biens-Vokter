'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, BarChart3, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import Link from 'next/link';

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

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <Link href="/dashboard/mattilsynet" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Rapporter & Statistikk
            </h1>
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
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-300 text-gray-400">
                Grafikk kommer her...
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
