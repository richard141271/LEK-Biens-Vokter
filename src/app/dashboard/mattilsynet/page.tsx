'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Map, LogOut, Bell, FileText, Activity, Mail, ArrowRight, Archive } from 'lucide-react';
import Link from 'next/link';

import { getMattilsynetDashboardData } from '@/app/actions/mattilsynet';

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

  const getStatusLabel = (status: string | null | undefined) => {
    if (!status || status === 'pending') return 'VENT';
    if (status === 'investigating') return 'SMITTE PÅVIST';
    if (status === 'resolved') return 'AVSLUTTET';
    return status.toUpperCase();
  };

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

      if (profileData?.role !== 'mattilsynet' && profileData?.role !== 'admin' && user.email !== 'richard141271@gmail.com' && user.email !== 'richard141271@gmail.no') {
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
        const result = await getMattilsynetDashboardData();
        
        if (result.error) {
            console.error("Error fetching mattilsynet data:", result.error);
            return;
        }
        
        if (result.alerts && result.stats) {
            setActiveAlerts(result.alerts);
            setStats(result.stats);
        }
    } catch (e) {
        console.error("Error fetching mattilsynet data:", e);
    }
  };

  const handleUpdateStatus = async (alert: any, newStatus: string, actionLabel: string) => {
    try {
      const baseDetails = alert.details || '';
      const separator = baseDetails && baseDetails.trim().length > 0 ? '\n\n' : '';
      const actor = profile?.role === 'mattilsynet' ? 'MATTILSYNET' : 'ADMIN';
      const who = profile ? ` av ${profile.full_name || profile.email}` : '';
      const note = `[${actor}] ${actionLabel} ${new Date().toLocaleString('no-NO')}${who}`;
      const updatedDetails = `${baseDetails}${separator}${note}`;

      const { error } = await supabase
        .from('hive_logs')
        .update({ admin_status: newStatus, details: updatedDetails })
        .eq('id', alert.id);

      if (error) {
        console.error('Failed to update alert:', error);
        alert('Kunne ikke oppdatere varselstatus. Prøv igjen.');
        return;
      }

      await fetchData();
    } catch (e) {
      console.error('Unexpected error updating alert:', e);
      alert('Uventet feil ved oppdatering av varsel.');
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
        {activeAlerts.length > 0 ? (
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-600" />
                    Nye Varsler & Rapporter
                </h2>
                <div className="space-y-4">
                    {/* Show only the newest alert prominently */}
                    {activeAlerts.slice(0, 1).map(alert => (
                        <div key={alert.id} className="bg-white rounded-xl p-6 border-l-4 border-red-600 shadow-md ring-1 ring-red-100">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                                            ⚠️ Kritisk Varsel
                                        </span>
                                        <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                            {getStatusLabel(alert.admin_status)}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            ID: #{alert.id.slice(0, 8)}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                        Mulig utbrudd av {alert.details?.split('Sykdom: ')[1]?.split(',')[0] || 'Ukjent sykdom'}
                                    </h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                        <Map className="w-4 h-4" />
                                        {alert.hives?.apiaries?.location || 'Ukjent sted'} &bull; {new Date(alert.created_at).toLocaleString('nb-NO')}
                                    </p>
                                </div>
                                <Link 
                                    href={`/dashboard/mattilsynet/alert/${alert.id}`}
                                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                                >
                                    Åpne Beredskapsrom
                                    <Activity className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Rapportert av</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                                            {alert.reporter?.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{alert.reporter?.full_name || 'Ukjent'}</p>
                                            <div className="flex gap-2 text-xs">
                                                {alert.reporter?.phone_number && (
                                                    <a href={`tel:${alert.reporter.phone_number}`} className="text-blue-600 hover:underline">
                                                        {alert.reporter.phone_number}
                                                    </a>
                                                )}
                                                <span className="text-gray-300">|</span>
                                                {alert.reporter?.email && (
                                                    <a href={`mailto:${alert.reporter.email}`} className="text-blue-600 hover:underline">
                                                        {alert.reporter.email}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Detaljer</h4>
                                    <p className="text-sm text-gray-700 line-clamp-2">{alert.details}</p>
                                    {alert.ai_analysis_result && (
                                        <div className="mt-2 text-xs text-purple-700 font-medium flex items-center gap-1">
                                            🤖 AI: {alert.ai_analysis_result.detected} ({alert.ai_analysis_result.confidence}%)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Summary of other alerts */}
                    {activeAlerts.length > 1 && (
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-700">
                                    Andre aktive varsler
                                </span>
                                {activeAlerts.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                        Viser 2 av {activeAlerts.length - 1}
                                    </span>
                                )}
                            </div>
                            <div className="divide-y divide-slate-100">
                                {activeAlerts.slice(1, 3).map(alert => (
                                    <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {alert.details?.split('Sykdom: ')[1]?.split(',')[0] || 'Sykdomsvarsel'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {alert.hives?.apiaries?.location || 'Ukjent sted'} &bull; {new Date(alert.created_at).toLocaleDateString('nb-NO')}
                                                </p>
                                            </div>
                                        </div>
                                        <Link 
                                            href={`/dashboard/mattilsynet/alert/${alert.id}`}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            Se detaljer &rarr;
                                        </Link>
                                    </div>
                                ))}
                            </div>
                            {activeAlerts.length > 3 && (
                                <div className="p-3 bg-slate-50 text-center border-t border-slate-200">
                                    <Link href="/dashboard/mattilsynet/alerts" className="text-xs font-bold text-gray-600 hover:text-gray-900">
                                        Se alle {activeAlerts.length} varsler
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <ShieldCheck className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-green-900">Ingen aktive sykdomsvarsler</h3>
                <p className="text-green-700 text-sm mt-1">Det er ikke rapportert noen pågående utbrudd i øyeblikket.</p>
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

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rapporter</p>
                <h3 className="text-xl font-bold text-gray-900">Statistikk</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
                Generer statusrapporter og statistikk for forvaltning.
            </p>
            <Link 
                href="/dashboard/mattilsynet/reports" 
                className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1"
            >
                Åpne rapporter <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-slate-100 rounded-lg">
                <Archive className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Varslingsarkiv</p>
                <h3 className="text-xl font-bold text-gray-900">Alle Saker</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
                Se historikk over alle varsler, både aktive og løste saker.
            </p>
            <Link 
                href="/dashboard/mattilsynet/alerts" 
                className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1"
            >
                Gå til arkiv <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
