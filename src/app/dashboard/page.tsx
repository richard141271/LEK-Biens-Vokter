'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, LogOut, Activity, Database, ExternalLink, Settings } from 'lucide-react';
import WeatherWidget from '@/components/WeatherWidget';

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [honeyStatus, setHoneyStatus] = useState('Ikke klar');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    apiaries: 0,
    hives: 0,
    activeHives: 0
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
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

    // Fetch Profile Data
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData || { full_name: user.user_metadata?.full_name || user.email });

    // Fetch Stats
    const { count: apiaryCount } = await supabase
      .from('apiaries')
      .select('*', { count: 'exact', head: true });

    const { data: hivesData } = await supabase
      .from('hives')
      .select('active');

    const totalHives = hivesData?.length || 0;
    const activeHives = hivesData?.filter(h => h.active).length || 0;

    setStats({
      apiaries: apiaryCount || 0,
      hives: totalHives,
      activeHives: activeHives
    });

    // Fetch Recent Activity (Logs)
    const { data: logs } = await supabase
      .from('hive_logs')
      .select('*, hives(hive_number)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logs) setRecentLogs(logs);

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="p-8 text-center">Laster oversikt...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header - Standard Clean Style */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Oversikt</h1>
                    <p className="text-sm text-gray-500">{profile?.full_name}</p>
                </div>
            </div>
            <button 
                onClick={handleSignOut}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-lg mx-auto">
          
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center text-honey-600">
                      <User className="w-6 h-6" />
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-gray-900">{profile?.full_name}</h2>
                      <p className="text-sm text-gray-500">Medlem #{profile?.member_number || 'Ikke registrert'}</p>
                  </div>
              </div>
              
              <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                      <ShieldCheck className={`w-4 h-4 ${profile?.is_norges_birokterlag_member ? 'text-green-600' : 'text-gray-300'}`} />
                      <span className={profile?.is_norges_birokterlag_member ? 'text-gray-900' : 'text-gray-400'}>
                          Norges Birøkterlag
                      </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                      <ShieldCheck className={`w-4 h-4 ${profile?.is_lek_honning_member ? 'text-green-600' : 'text-gray-300'}`} />
                      <span className={profile?.is_lek_honning_member ? 'text-gray-900' : 'text-gray-400'}>
                          LEK-Honning™
                      </span>
                  </div>
              </div>
          </div>

          {/* Honningstatus */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-honey-500" />
                      <h3 className="font-bold text-gray-900">Honningstatus</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      honeyStatus === 'Klar' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                      {honeyStatus}
                  </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setHoneyStatus('Klar')} 
                    className="py-2 px-3 bg-green-50 text-green-700 font-medium text-sm rounded-lg hover:bg-green-100 border border-green-200"
                  >
                    Sett Klar
                  </button>
                  <button 
                    onClick={() => setHoneyStatus('Ikke klar')} 
                    className="py-2 px-3 bg-gray-50 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-100 border border-gray-200"
                  >
                    Ikke klar
                  </button>
              </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Aktive kuber</p>
                  <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-gray-900">{stats.activeHives}</span>
                      <span className="text-gray-400 text-sm mb-1">/ {stats.hives} totalt</span>
                  </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-sm mb-1">Bigårder</p>
                  <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-gray-900">{stats.apiaries}</span>
                  </div>
              </div>
          </div>
          
          {/* Weather Widget */}
          <WeatherWidget />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
              <Link href="/apiaries" className="bg-honey-500 hover:bg-honey-600 text-white p-6 rounded-xl shadow-sm text-center transition-transform active:scale-95">
                  <div className="font-bold text-lg mb-1">BIGÅRDER</div>
                  <div className="text-honey-100 text-sm">Lokasjoner</div>
              </Link>
              <Link href="/hives" className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 p-6 rounded-xl shadow-sm text-center transition-transform active:scale-95">
                  <div className="font-bold text-lg mb-1">BIKUBER</div>
                  <div className="text-gray-500 text-sm">Alle kuber</div>
              </Link>
              <Link href="/settings" className="col-span-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 p-4 rounded-xl shadow-sm text-center transition-transform active:scale-95 flex items-center justify-center gap-2">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <div className="font-bold text-lg">INNSTILLINGER</div>
              </Link>
          </div>

          {/* Recent Activity */}
          {recentLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-honey-500" />
                    <h3 className="font-bold text-gray-900">Siste Aktivitet</h3>
                </div>
                <div className="space-y-4">
                    {recentLogs.map((log) => (
                        <div key={log.id} className="flex gap-3 text-sm border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-honey-400 shrink-0" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">{log.action}</span>
                                    {log.hives?.hive_number && (
                                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">
                                            {log.hives.hive_number}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-600 mt-0.5">{log.details}</p>
                                <p className="text-gray-400 text-xs mt-1">
                                    {new Date(log.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* External Links */}
          <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase px-1">Nyttige lenker</h3>
              <ExternalLinkButton href="https://richard141271.github.io/" label="LEK-HONNING™" />
              <ExternalLinkButton href="https://honning.no/" label="HONNINGCENTRALEN" />
              <ExternalLinkButton href="https://norges-birokterlag.no" label="NORGES BIRØKTERLAG" />
              <ExternalLinkButton href="https://honninglandet.no/nyheter/nm-i-honning-2025/" label="NM I HONNING" />
              <ExternalLinkButton href="https://mattilsynet.no" label="MATTILSYNET" />
          </div>

          <p className="text-center text-gray-400 text-xs mt-8">© 2025 - LEK-Honning™</p>
      </main>
    </div>
  );
}

function ExternalLinkButton({ href, label }: { href: string, label: string }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group">
            <span className="font-medium">{label}</span>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-honey-500 transition-colors" />
        </a>
    );
}
