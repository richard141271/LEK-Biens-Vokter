'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Map, LogOut, Bell, FileText, Activity } from 'lucide-react';
import Link from 'next/link';

export default function MattilsynetDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
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
      setLoading(false);
    };

    checkUser();
  }, []);

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
                <h3 className="text-2xl font-bold text-gray-900">0</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">Ingen nye utbrudd rapportert i dag</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inspeksjoner i år</p>
                <h3 className="text-2xl font-bold text-gray-900">12</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">Opp 2 fra forrige uke</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Registrerte Bigårder</p>
                <h3 className="text-2xl font-bold text-gray-900">156</h3>
              </div>
            </div>
            <p className="text-xs text-gray-400">Totalt i din region</p>
          </div>
        </div>

        {/* Tools Grid */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Verktøy og Tjenester</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Link href="#" className="block group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all h-full">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Søk i register</h3>
              <p className="text-sm text-gray-600">Finn bigårder, birøktere og bikuber basert på ID, navn eller lokasjon.</p>
            </div>
          </Link>

          <Link href="#" className="block group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-red-500 hover:shadow-md transition-all h-full">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">Smittekart</h3>
              <p className="text-sm text-gray-600">Se geografisk oversikt over sykdomsutbrudd og definer sikringssoner.</p>
            </div>
          </Link>

          <Link href="#" className="block group">
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
