'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, LogOut, Activity, Database, ExternalLink, Settings, Plus, X, ChevronDown, QrCode, Users, ChevronRight } from 'lucide-react';
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
  
  // Create Hive State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedApiaryId, setSelectedApiaryId] = useState('');
  const [availableApiaries, setAvailableApiaries] = useState<any[]>([]);

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardApiaryName, setWizardApiaryName] = useState('');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData().catch(e => {
        console.error("Dashboard fetch error:", e);
        setLoading(false);
    });
  }, []);

  const fetchData = async () => {
    try {
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

        // Fetch Apiaries for dropdown
        const { data: apiariesData } = await supabase
        .from('apiaries')
        .select('id, name, type')
        .order('name');
        
        if (apiariesData) {
            setAvailableApiaries(apiariesData);
            if (apiariesData.length > 0) setSelectedApiaryId(apiariesData[0].id);
        }

        // Trigger Wizard if no apiaries
        if ((apiaryCount || 0) === 0) {
            setIsWizardOpen(true);
        }
    } catch (e) {
        console.error("Critical error in dashboard fetch:", e);
    } finally {
        setLoading(false);
    }
  };

  const handleWizardCreateApiary = async () => {
    if (!wizardApiaryName) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Generate number (simplified)
        const apiaryNumber = `BG-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        const { data, error } = await supabase
            .from('apiaries')
            .insert({
                user_id: user.id,
                name: wizardApiaryName,
                apiary_number: apiaryNumber,
                type: 'bigård', // Default
                location: 'Hjemme'
            })
            .select()
            .single();

        if (error) throw error;
        
        // Refresh apiaries
        setStats(prev => ({ ...prev, apiaries: prev.apiaries + 1 }));
        setAvailableApiaries(prev => [...prev, { id: data.id, name: data.name, type: data.type }]);
        setSelectedApiaryId(data.id);
        
        // Go to next step
        setWizardStep(2);

    } catch (e: any) {
        alert('Feil: ' + e.message);
    }
  };

  const handleCreateSubmit = async () => {
    if (!selectedApiaryId) {
        alert('Du må velge en bigård/lokasjon først.');
        return;
    }
    
    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all hive numbers for this user to determine the next available number safely
      const { data: hivesData, error: hivesError } = await supabase
        .from('hives')
        .select('hive_number')
        .eq('user_id', user.id);
      
      if (hivesError) throw hivesError;

      let maxNum = 0;
      if (hivesData && hivesData.length > 0) {
        maxNum = hivesData.reduce((max, hive) => {
          // Extract number from "KUBE-XXX"
          const match = hive.hive_number?.match(/KUBE-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, 0);
      }
      
      let startNum = maxNum + 1;
      const newHives = [];

      for (let i = 0; i < createCount; i++) {
        const hiveNumber = `KUBE-${(startNum + i).toString().padStart(3, '0')}`;
        newHives.push({
          user_id: user.id,
          apiary_id: selectedApiaryId,
          hive_number: hiveNumber,
          status: 'aktiv'
        });
      }

      const { error } = await supabase.from('hives').insert(newHives);
      if (error) throw error;
      
      // Update stats locally
      setStats(prev => ({
          ...prev,
          hives: prev.hives + createCount,
          activeHives: prev.activeHives + createCount
      }));

      setIsCreateModalOpen(false);
      setCreateCount(1);
      alert(`${createCount} nye kuber opprettet!`);
      
    } catch (error: any) {
      alert('Feil ved opprettelse: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return <div className="p-8 text-center">Laster oversikt...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      
      <main className="p-4 space-y-6 max-w-lg mx-auto">
          
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center text-honey-600">
                      <User className="w-6 h-6" />
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-gray-900">{profile?.full_name || 'Laster...'}</h2>
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
          <div className="space-y-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full bg-honey-500 hover:bg-honey-600 text-white p-4 rounded-xl shadow-md flex items-center justify-center gap-2 font-bold text-lg transition-transform active:scale-95"
              >
                <Plus className="w-6 h-6" />
                REGISTRER NYE KUBER
              </button>

              <button
                onClick={() => alert('QR-skanner kommer snart! Her vil du kunne skanne kuber direkte fra butikk.')}
                className="w-full bg-white border-2 border-honey-100 hover:border-honey-500 text-honey-600 p-4 rounded-xl shadow-sm flex items-center justify-center gap-2 font-bold text-lg transition-transform active:scale-95"
              >
                <QrCode className="w-6 h-6" />
                SKANN QR-KODE
              </button>

              <div className="grid grid-cols-2 gap-4">
                  <Link href="/apiaries" className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 p-6 rounded-xl shadow-sm text-center transition-transform active:scale-95">
                      <div className="font-bold text-lg mb-1">BIGÅRDER</div>
                      <div className="text-gray-500 text-sm">Lokasjoner</div>
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

      {/* CREATE HIVE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Registrer nye kuber</h3>
              <button onClick={() => setIsCreateModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Velg lokasjon (Bigård)</label>
                    <div className="relative">
                        <select
                            value={selectedApiaryId}
                            onChange={(e) => setSelectedApiaryId(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg appearance-none font-medium text-gray-900 pr-10"
                        >
                            <option value="" disabled>Velg en bigård...</option>
                            {availableApiaries.map(apiary => (
                                <option key={apiary.id} value={apiary.id}>
                                    {apiary.name} ({apiary.type || 'Standard'})
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                    {availableApiaries.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">Du må opprette en bigård først.</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Antall kuber</label>
                    <div className="flex items-center justify-center gap-6">
                        <button 
                            onClick={() => setCreateCount(Math.max(1, createCount - 1))}
                            className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
                        >
                            -
                        </button>
                        <span className="text-3xl font-bold text-honey-600">{createCount}</span>
                        <button 
                            onClick={() => setCreateCount(createCount + 1)}
                            className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold hover:bg-gray-200"
                        >
                            +
                        </button>
                    </div>
                </div>

                <button
                onClick={handleCreateSubmit}
                disabled={isCreating || !selectedApiaryId}
                className="w-full bg-honey-500 text-white font-bold py-3 rounded-xl hover:bg-honey-600 disabled:opacity-50 mt-4"
                >
                {isCreating ? 'Oppretter...' : `Opprett ${createCount} kuber`}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Startup Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Velkommen til LEK-Biens Vokter! 🐝</h2>
            <p className="text-gray-600 mb-8">La oss sette opp din første bigård så du kan komme i gang.</p>
            
            {wizardStep === 1 && (
                <div className="space-y-4">
                <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hva heter bigården din?</label>
                    <input 
                        type="text" 
                        value={wizardApiaryName}
                        onChange={(e) => setWizardApiaryName(e.target.value)}
                        placeholder="F.eks. Hjemmehagen"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none"
                    />
                </div>
                <button 
                    onClick={handleWizardCreateApiary}
                    disabled={!wizardApiaryName}
                    className="w-full bg-honey-500 text-white font-bold py-3 rounded-xl hover:bg-honey-600 disabled:opacity-50"
                >
                    Opprett Bigård
                </button>
                </div>
            )}

            {wizardStep === 2 && (
                <div className="space-y-4">
                <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
                    Bigård opprettet! 🎉
                </div>
                <p className="text-sm text-gray-600">Nå kan du registrere dine første kuber.</p>
                <button 
                    onClick={() => {
                        setIsWizardOpen(false);
                        setIsCreateModalOpen(true);
                    }}
                    className="w-full bg-honey-500 text-white font-bold py-3 rounded-xl hover:bg-honey-600"
                >
                    Registrer Kuber
                </button>
                <button 
                    onClick={() => setIsWizardOpen(false)}
                    className="text-gray-400 text-sm hover:underline mt-4"
                >
                    Hopp over for nå
                </button>
                </div>
            )}
            </div>
        </div>
      )}
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
