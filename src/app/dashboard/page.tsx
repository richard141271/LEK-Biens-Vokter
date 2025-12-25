'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map, Box, Activity, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ apiaries: 0, hives: 0, inspections: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch Profile Name
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);

    // Fetch Counts
    const { count: apiaryCount } = await supabase.from('apiaries').select('*', { count: 'exact', head: true });
    const { count: hiveCount } = await supabase.from('hives').select('*', { count: 'exact', head: true });
    // const { count: inspectionCount } = await supabase.from('inspections').select('*', { count: 'exact', head: true });

    setStats({
      apiaries: apiaryCount || 0,
      hives: hiveCount || 0,
      inspections: 0 // Placeholder until we have inspections
    });

    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Laster oversikt...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-honey-500 text-white px-6 py-8 rounded-b-3xl shadow-lg mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-honey-100 text-sm font-medium mb-1">Velkommen tilbake,</p>
            <h1 className="text-2xl font-bold">{profile?.full_name || 'Birøkter'}</h1>
          </div>
          <img src="/icon.png" alt="Logo" className="w-12 h-12 rounded-full bg-white p-1 shadow-md" />
        </div>
      </header>

      <main className="px-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/apiaries" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-honey-200 transition-colors">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
              <Map className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.apiaries}</div>
            <div className="text-xs text-gray-500 font-medium">Bigårder/Lokasjoner</div>
          </Link>

          <Link href="/hives" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-honey-200 transition-colors">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
              <Box className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.hives}</div>
            <div className="text-xs text-gray-500 font-medium">Bikuber totalt</div>
          </Link>
        </div>

        {/* Recent Activity / Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-honey-500" />
            Hurtighandlinger
          </h2>
          
          <div className="space-y-3">
            <Link href="/apiaries/new" className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <span className="font-medium text-gray-700">Registrer ny lokasjon</span>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                <Plus className="w-4 h-4" />
              </div>
            </Link>
            
            <Link href="/apiaries" className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <span className="font-medium text-gray-700">Inspiser en bigård</span>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                <Calendar className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
