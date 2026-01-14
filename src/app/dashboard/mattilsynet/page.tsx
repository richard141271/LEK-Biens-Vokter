'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Map, LogOut, Bell, FileText, Activity } from 'lucide-react';
import Link from 'next/link';

export default function MattilsynetDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    alerts: 0,
    inspections: 0,
    apiaries: 0
  });
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/mattilsynet');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData?.role !== 'mattilsynet') {
        await supabase.auth.signOut();
        router.push('/mattilsynet');
        return;
      }

      setProfile(profileData);
      await fetchData();
      setLoading(false);
    };

    checkUser();
  }, []);

  async function fetchData() {
    try {
        // Fetch Active Alerts (Sickness reports)
        // Try with admin_status filter first
        let alertsData: any[] = [];
        
        const { data: alerts, error: alertsError } = await supabase
            .from('hive_logs')
            .select(`
                *,
                reporter:user_id (
                    full_name,
                    email,
                    phone_number
                ),
                hives (
                     hive_number,
                     apiaries (
                         name,
                         location
                     )
                 )
             `)
            .eq('action', 'SYKDOM')
            .eq('admin_status', 'pending')
            .order('created_at', { ascending: false });
        
        if (alertsError) {
             console.warn("Could not filter by admin_status, fetching all sickness reports instead.", alertsError);
             // Fallback: fetch all SYKDOM logs if admin_status column is missing
             const { data: allAlerts } = await supabase
                .from('hive_logs')
                .select(`
                    *,
                    reporter:user_id (
                        full_name,
                        email,
                        phone_number
                    ),
                    hives (
                         hive_number,
                         apiaries (
                             name,
                             location
                         )
                     )
                 `)
                .eq('action', 'SYKDOM')
                .order('created_at', { ascending: false });
            
            alertsData = allAlerts || [];
        } else {
            alertsData = alerts || [];
        }
        
        setActiveAlerts(alertsData);

        // Fetch Stats
        const { count: apiaryCount } = await supabase
            .from('apiaries')
            .select('*', { count: 'exact', head: true });

        const { count: inspectionCount } = await supabase
            .from('hive_logs')
            .select('*', { count: 'exact', head: true })
            .eq('action', 'INSPEKSJON');

        setStats({
            alerts: alertsData.length,
            inspections: inspectionCount || 0,
            apiaries: apiaryCount || 0
        });

    } catch (e) {
        console.error("Error fetching mattilsynet data:", e);
    }
  };

  const handleResolveAlert = async (logId: string) => {
      const { error } = await supabase
          .from('hive_logs')
          .update({ admin_status: 'resolved' })
          .eq('id', logId);
      
      if (!error) {
          // Remove from local state
          setActiveAlerts(prev => prev.filter(a => a.id !== logId));
          setStats(prev => ({ ...prev, alerts: prev.alerts - 1 }));
      } else {
          console.error("Failed to resolve alert:", error);
          alert('Kunne ikke oppdatere status i databasen (kolonnen mangler kanskje). Fjerner den fra visningen lokalt.');
          // Optimistic update
          setActiveAlerts(prev => prev.filter(a => a.id !== logId));
          setStats(prev => ({ ...prev, alerts: prev.alerts - 1 }));
      }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/mattilsynet');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">Laster...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-green-400" />
            <span className="font-bold text-xl">Mattilsynet Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-300">
              Logget inn som: <span className="text-white font-medium">{profile?.full_name || profile?.email}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              title="Logg ut"
            >
              <LogOut className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          
          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Bell className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Aktive Varsler</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.alerts}</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">
                {stats.alerts > 0 ? 'Krever oppfølging!' : 'Ingen nye utbrudd'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inspeksjoner</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.inspections}</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">Registrert totalt i systemet</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Registrerte Bigårder</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.apiaries}</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">Totalt i din region</p>
          </div>
        </div>

        {/* ACTIVE ALERTS LIST */}
        {activeAlerts.length > 0 && (
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-600" />
                    Nye Varsler & Rapporter
                </h2>
                <div className="space-y-4">
                    {activeAlerts.map(alert => (
                        <div key={alert.id} className="bg-white rounded-xl p-4 border-l-4 border-red-500 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase">Sykdom</span>
                                        <span className="text-sm font-bold text-gray-900">
                                            {new Date(alert.created_at).toLocaleString('no-NO')}
                                        </span>
                                    </div>
                                    <p className="text-gray-800 font-medium mb-2 whitespace-pre-wrap">{alert.details}</p>
                                    
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                                        <div>
                                            <span className="font-bold block text-gray-500 uppercase text-[10px]">Birøkter</span>
                                            {alert.reporter?.full_name || 'Ukjent'}
                                            <br />
                                            {alert.reporter?.phone_number || alert.reporter?.email}
                                        </div>
                                        <div>
                                            <span className="font-bold block text-gray-500 uppercase text-[10px]">Bigård / Lokasjon</span>
                                            {alert.hives?.apiaries?.name || 'Ukjent'} ({alert.hives?.apiaries?.location || 'Ingen lokasjon'})
                                        </div>
                                        <div>
                                            <span className="font-bold block text-gray-500 uppercase text-[10px]">Kube ID</span>
                                            {alert.hives?.hive_number || 'Generell melding'}
                                        </div>
                                    </div>

                                    {alert.ai_analysis_result && (
                                        <div className="mt-3 text-xs bg-purple-50 text-purple-800 p-2 rounded border border-purple-100">
                                            🤖 <strong>AI Analyse:</strong> {alert.ai_analysis_result.detected} ({alert.ai_analysis_result.confidence}% sikkerhet)
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleResolveAlert(alert.id)}
                                    className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold border border-green-200 transition-colors"
                                >
                                    Marker som løst
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Tools Grid */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Verktøy og Tjenester</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Link href="/dashboard/mattilsynet/registry" className="block group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all h-full">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Søk i register</h3>
              <p className="text-sm text-gray-600">Finn bigårder, birøktere og bikuber basert på ID, navn eller lokasjon.</p>
            </div>
          </Link>

          <Link href="/dashboard/mattilsynet/map" className="block group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-red-500 hover:shadow-md transition-all h-full">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Smittekart</h3>
              <p className="text-sm text-gray-600">Se geografisk oversikt over sykdomsutbrudd og definer sikringssoner.</p>
            </div>
          </Link>

          <Link href="/dashboard/mattilsynet/reports" className="block group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-green-500 hover:shadow-md transition-all h-full">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Rapporter</h3>
              <p className="text-sm text-gray-600">Generer statusrapporter og statistikk for forvaltning.</p>
            </div>
          </Link>

        </div>
      </main>
    </div>
  );
}
