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
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    mattilsynet: 0,
    beekeepers: 0
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

    if (profileData?.role !== 'admin') {
      await supabase.auth.signOut();
      router.push('/admin'); // Redirect to admin login if not admin
      return;
    }

    setProfile(profileData);
  };

  const fetchStats = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('role');

      if (profiles) {
        setStats({
          totalUsers: profiles.length,
          admins: profiles.filter(p => p.role === 'admin').length,
          mattilsynet: profiles.filter(p => p.role === 'mattilsynet').length,
          beekeepers: profiles.filter(p => p.role === 'beekeeper' || !p.role).length
        });
      }
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
        
        {/* Quick Actions Grid */}
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

          {/* Database/System Status (Placeholder) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 opacity-75">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Database className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Systemstatus</h3>
            <p className="text-sm text-gray-500">
              Overvåk database, lagring og API-ytelse. (Kommer snart)
            </p>
          </div>

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

        </div>

        {/* Stats Overview */}
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Statistikk
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>

      </main>
    </div>
  );
}
