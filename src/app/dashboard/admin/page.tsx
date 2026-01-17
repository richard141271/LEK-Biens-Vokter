'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Shield, 
  Database,
  Settings, 
  LogOut,
  ChevronRight,
  Activity,
  UserCheck,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  BarChart2,
  FileText,
  Mail
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    mattilsynet: 0,
    beekeepers: 0,
    activeAlerts: 0
  });
  const [profile, setProfile] = useState<any>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkUser();
    fetchStats();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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
      router.push('/admin'); // Redirect to admin login if not admin
      return;
    }

    setProfile(profileData);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        console.error('Feil ved henting av admin-stats:', await res.text());
        setLoading(false);
        return;
      }

      const data = await res.json();

      setStats({
        totalUsers: data.totalUsers || 0,
        admins: data.admins || 0,
        mattilsynet: data.mattilsynet || 0,
        beekeepers: data.beekeepers || 0,
        activeAlerts: data.activeAlerts || 0
      });
      setLoading(false);
    } catch (e) {
      console.error('Error fetching stats:', e);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Laster systemoversikt...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* Header */}
      <header className="bg-[#111827] text-white py-6 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Systemadministrasjon</h1>
              <p className="text-gray-400 text-sm">Overordnet kontrollpanel</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-white">{profile?.full_name}</div>
                <div className="text-xs text-purple-300">Superbruker</div>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logg ut</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          
          {/* User Management Card */}
          <Link href="/dashboard/admin/users" className="group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Brukeradministrasjon</h3>
              <p className="text-sm text-gray-500 mb-4">
                Administrer brukere, tildel roller (Admin, Mattilsynet) og styr tilganger.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                <UserCheck className="w-4 h-4" />
                <span>{stats.totalUsers} registrerte brukere</span>
              </div>
            </div>
          </Link>

          {/* Shop Management Card */}
          <Link href="/dashboard/admin/shop" className="group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-orange-500 hover:shadow-md transition-all h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Nettbutikk</h3>
              <p className="text-sm text-gray-500 mb-4">
                Administrer produkter, lagerbeholdning og bestillinger.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                <Settings className="w-4 h-4" />
                <span>Administrasjon</span>
              </div>
            </div>
          </Link>

          {/* Data Management Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Database className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Datahåndtering</h3>
            <p className="text-sm text-gray-500 mb-4">
              Masse-import av data og systemvedlikehold.
            </p>
            <button 
                onClick={() => alert('Masse-import fra Excel/CSV kommer snart! Her vil du kunne laste opp lister med kuber.')}
                className="w-full bg-blue-50 text-blue-700 font-bold py-2 rounded-lg hover:bg-blue-100 transition-colors text-xs flex items-center justify-center gap-2"
            >
                <Database className="w-4 h-4" />
                Importer data (CSV)
            </button>
          </div>

          {/* Survey Results Card */}
          <Link href="/dashboard/admin/survey-results" className="group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-honey-500 hover:shadow-md transition-all h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-honey-50 text-honey-600 rounded-lg group-hover:bg-honey-600 group-hover:text-white transition-colors">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-honey-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Behovsanalyse
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Se resultater, generer rapporter og rydde i svarene.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-honey-700 bg-honey-50 px-3 py-2 rounded-lg">
                <Activity className="w-4 h-4" />
                <span>Spørreundersøkelse for LEK-Biens Vokter™️</span>
              </div>
            </div>
          </Link>

          {/* Meeting Notes Admin */}
          <Link href="/dashboard/admin/meeting-notes" className="group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-honey-500 hover:shadow-md transition-all h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-honey-50 text-honey-600 rounded-lg group-hover:bg-honey-600 group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-honey-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Referater</h3>
              <p className="text-sm text-gray-500 mb-4">
                Se alle møtereferater, rediger titler og slett ved behov.
              </p>
            </div>
          </Link>

          {/* Pilot-interesser */}
          <Link href="/dashboard/admin/pilot-interesser" className="group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-emerald-500 hover:shadow-md transition-all h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Mail className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Pilotprogram</h3>
              <p className="text-sm text-gray-500 mb-4">
                Se e-postene til birøktere som vil teste LEK-Biens Vokter.
              </p>
            </div>
          </Link>

          {/* Settings (Placeholder) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 opacity-75">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-50 text-gray-600 rounded-lg">
                <Settings className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Globale Innstillinger</h3>
            <p className="text-sm text-gray-500">
              Konfigurer applikasjonsinnstillinger. (Kommer snart)
            </p>
          </div>

          {/* LEK-Honning™️ Link */}
          <Link href="/honey-exchange" className="group">
            <div className="bg-gradient-to-br from-honey-50 to-yellow-50 p-6 rounded-xl shadow-sm border border-honey-200 hover:border-honey-500 hover:shadow-md transition-all h-full">
                <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-honey-100 text-honey-600 rounded-lg group-hover:bg-honey-600 group-hover:text-white transition-colors">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-honey-300 group-hover:text-honey-500" />
                </div>
                <h3 className="text-lg font-bold text-honey-900 mb-2">LEK-Honning™️</h3>
                <p className="text-sm text-honey-800 mb-4">
                Administrer honningbørsen og megler-registreringer.
                </p>
                <div className="flex items-center gap-2 text-xs font-medium text-honey-600 bg-white/50 px-3 py-2 rounded-lg">
                <ArrowRight className="w-4 h-4" />
                <span>Gå til børsen</span>
                </div>
            </div>
          </Link>

        </div>

        {/* Stats Overview */}
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Statistikk
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Totalt Brukere</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Administratorer</p>
                <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Mattilsynet</p>
                <p className="text-2xl font-bold text-blue-600">{stats.mattilsynet}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Birøktere</p>
                <p className="text-2xl font-bold text-green-600">{stats.beekeepers}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Aktive sykdomsvarsler</p>
                <p className="text-2xl font-bold text-red-600">{stats.activeAlerts}</p>
            </div>
        </div>

      </main>
    </div>
  );
}
