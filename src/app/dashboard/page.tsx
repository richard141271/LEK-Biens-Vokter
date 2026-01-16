'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jsPDF } from 'jspdf';
import { ShieldCheck, User, LogOut, Activity, Database, ExternalLink, Settings, Plus, X, ChevronDown, QrCode, ClipboardCheck, Camera, Check, ShieldAlert } from 'lucide-react';
import WeatherWidget from '@/components/WeatherWidget';
import SicknessRegistrationModal from '@/components/SicknessRegistrationModal';
import InspectionModal from '@/components/InspectionModal';

const RENTAL_CONTRACT_TEXT = `
LEIEAVTALE – LEK-HONNING™️ / LEIE AV BIKUBE

Denne avtalen inngås mellom:

Utleier:
AI Innovate AS® / LEK-Honning™️
Org.nr: 935 460 387
Adresse: Rascheprangen 1, 1767 Halden
Daglig leder AI-identitet: Aurora
Representert av: Jørn Thoresen

Leietaker (bruker/gruppe):
Navn: [LEIETAKER_NAVN]
Representerer (klasse/lag/familie osv.): [LEIETAKER_NAVN] (Privat)
Adresse: [LEIETAKER_ADRESSE]
Telefon: [LEIETAKER_TLF]
E-post: [LEIETAKER_EPOST]

1. Avtalens formål
Leietaker får disponere [ANTALL] stk LEK-sertifisert bikube med bifolk for læring, observasjon og eventuelle sesongoppgaver, i et trygt og strukturert LEK-opplegg.

2. Leieperiode
Startdato: [DAGENS DATO]
Sluttdato: [SESONG SLUTT]
(Leieavtalen fornyes automatisk om den ikke sies opp. Den må sies opp minimum 3 mnd før innvintring. Innvintring skjer normalt i midten av Oktober. Man binder seg til minimum en sesong av gangen, grunnet kompleksiteten i å flytte en bikube som er i drift)

3. Pris og Betaling
Leiepris: [PRIS_MND] kr per måned (faktureres sesongvis forskudd: [PRIS_TOTAL] kr).

4. Inkludert i leien (kryss av)
[x] Full kube med bifolk + tavler
[x] Oppstartsfôr 2–3 kg
[x] Deltakelse i honningslynging
[x] Honning-tapping og etikett-opplæring
[x] Salg på Honningbørsen med rapport
[x] LEK-sertifisering etter fullført sesong (kun for barn)
[x] Forsikring inkludert i perioden

5. Ansvar og sikkerhet
- Utleier har ansvar for at kuben er sertifisert, trygg og sykdomskontrollert ved utlevering
- Leietaker har ansvar for forsvarlig bruk og å følge sikkerhetsinstrukser
- Barn/medlemmer skal ikke åpne kube uten tilsyn av godkjent, Sertifisert LEK-birøkter
- Ved skade på utstyr som skyldes uforsvarlig bruk, kan erstatning kreves
- Ved sykdomstegn skal dette rapporteres umiddelbart i LEK-appen

6. Honning og inntektsfordeling
Hvis honningproduksjon og salg er del av leien, fordeles inntekten slik:
Leietaker betaler en fast lav pris for kjøp av honning fra leide kuber, og har forkjøpsrett til ALL honning i de leide kubene. Honningprisen blir beregnet hvert år ved sesongens slutt, og offentliggjøres på LEK-Honning™️ sine nettsider, og i appen.
Alle salg skal dokumenteres og gjennomføres i appen

7. Allergi og helse
Leietaker bekrefter at gruppen har sjekket allergier:
[x] Ingen kjent allergi (bekreftet ved signering)
Utleier anbefaler at Epipen eller førstehjelpsplan finnes i gruppen, men det er ikke krav fra utleier

8. Databruk og innhold i app
Leietaker godkjenner at:
Observasjonsbilder og kubelogger kan brukes i anonymisert form i LEK-systemet
Ingen persondata publiseres uten samtykke
[x] Godkjent

Tilleggsnotat:
\"AI Innovate er ikke bare et selskap – det er et kunstverk i seg selv.\" – Dette er et verdibasert LEK-opplæringsprogram, ikke økonomisk rådgivning.

Angrerett og Avbestilling:
Da det er levende dyr, som klargjøres spesielt til hver enkelt leietaker, er det INGEN angrefrist på bestilling av bikube. Skulle man angre seg, vil det derimot bli krevd et ekstra gebyr på ca. 3000 for den ekstra kostnaden birøkteren får, ved å måtte enten drifte kuben selv, eller sette jobben bort til andre som kan ta seg av dem.
`;

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

  const [nearbyAlerts, setNearbyAlerts] = useState<any[]>([]); // New State for Alerts

  // Sickness Modal
  const [isSicknessModalOpen, setIsSicknessModalOpen] = useState(false);

  // Inspection Modal
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  
  // Rental & Mission State
  const [activeRental, setActiveRental] = useState<any>(null);
  const [latestHiveLog, setLatestHiveLog] = useState<any>(null); // New State for Tenant Log
  const [pendingMissionsCount, setPendingMissionsCount] = useState(0);

  // Data State
  const [allHives, setAllHives] = useState<any[]>([]);

  const supabase = createClient();
  const router = useRouter();

  const getSeasonEndDate = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    if (currentMonth >= 6) {
      return `Oktober ${now.getFullYear() + 1}`;
    }
    return `Oktober ${now.getFullYear()}`;
  };

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
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

        const { data: hivesData } = await supabase
        .from('hives')
        .select('id, hive_number, active')
        .eq('user_id', user.id);

        const totalHives = hivesData?.length || 0;
        const activeHives = hivesData?.filter(h => h.active).length || 0;
        
        if (hivesData) setAllHives(hivesData);

        setStats({
        apiaries: apiaryCount || 0,
        hives: totalHives,
        activeHives: activeHives
        });

        // Fetch Pending Rentals (Missions)
        if (profileData?.role === 'beekeeper' || profileData?.role === 'admin') {
            const { count: pendingCount } = await supabase
                .from('rentals')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')
                .is('apiary_id', null);
            
            setPendingMissionsCount(pendingCount || 0);
        }


        // Fetch Recent Activity (Logs)
        const { data: logs } = await supabase
        .from('hive_logs')
        .select('*, hives(hive_number)')
        .order('created_at', { ascending: false })
        .limit(5);

        if (logs) setRecentLogs(logs);

        // Fetch Nearby Alerts (Pilot: Just fetch recent SYKDOM logs generally)
        const { data: alerts } = await supabase
        .from('hive_logs')
        .select('*, hives(apiaries(location))')
        .eq('action', 'SYKDOM')
        .neq('admin_status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(3);

        if (alerts) setNearbyAlerts(alerts);

        const { data: rental } = await supabase
            .from('rentals')
            .select(`
                *,
                assigned_beekeeper:assigned_beekeeper_id (
                    full_name,
                    phone_number,
                    email
                )
            `)
            .eq('user_id', user.id)
            .in('status', ['pending', 'assigned', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (rental) {
            setActiveRental(rental);

            if (rental.apiary_id) {
                 const { data: hives } = await supabase
                    .from('hives')
                    .select('id')
                    .eq('apiary_id', rental.apiary_id);
                 
                 if (hives && hives.length > 0) {
                     const hiveIds = hives.map(h => h.id);
                     const { data: log } = await supabase
                        .from('hive_logs')
                        .select('*')
                        .in('hive_id', hiveIds)
                        .eq('action', 'INSPEKSJON')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    
                    if (log) setLatestHiveLog(log);
                 }
            }
        }

        // Fetch Pending Missions (For Beekeepers)
        if (profileData?.role === 'beekeeper' || profileData?.role === 'admin') {
            const { count } = await supabase
                .from('rentals')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')
                .is('apiary_id', null);
            
            setPendingMissionsCount(count || 0);
        }

        // Fetch Apiaries for dropdown
        const { data: apiariesData } = await supabase
        .from('apiaries')
        .select('id, name, type')
        .eq('user_id', user.id)
        .order('name');
        
        if (apiariesData) {
            setAvailableApiaries(apiariesData);
            if (apiariesData.length > 0) setSelectedApiaryId(apiariesData[0].id);
        }

        // Trigger Wizard if no apiaries (Only for Beekeepers)
        if ((apiaryCount || 0) === 0 && profileData?.role !== 'tenant') {
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
      
      <main className="p-2 space-y-2 max-w-lg mx-auto">
          
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 relative">
              <button 
                onClick={handleSignOut}
                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                title="Logg ut"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-honey-100 rounded-full flex items-center justify-center text-honey-600">
                      <User className="w-4 h-4" />
                  </div>
                  <div>
                      <h2 className="text-sm font-bold text-gray-900">{profile?.full_name || 'Laster...'}</h2>
                      <p className="text-[10px] text-gray-500">Medlem #{profile?.member_number || 'Ikke registrert'}</p>
                  </div>
              </div>
              
              <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
                      <ShieldCheck className={`w-3 h-3 ${profile?.is_norges_birokterlag_member ? 'text-green-600' : 'text-gray-300'}`} />
                      <span className={profile?.is_norges_birokterlag_member ? 'text-gray-900' : 'text-gray-400'}>
                          Norges Birøkterlag
                      </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
                      <ShieldCheck className={`w-3 h-3 ${profile?.is_lek_honning_member ? 'text-green-600' : 'text-gray-300'}`} />
                      <span className={profile?.is_lek_honning_member ? 'text-gray-900' : 'text-gray-400'}>
                          LEK-Honning™
                      </span>
                  </div>
              </div>
          </div>

          {/* Honningstatus (Only for Beekeepers) */}
          {profile?.role !== 'tenant' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
              <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-honey-500" />
                      <h3 className="font-bold text-gray-900 text-xs">Honningstatus</h3>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      honeyStatus === 'Klar' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                      {honeyStatus}
                  </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setHoneyStatus('Klar')} 
                    className="py-1 px-2 bg-green-50 text-green-700 font-medium text-[10px] rounded-lg hover:bg-green-100 border border-green-200"
                  >
                    Sett Klar
                  </button>
                  <button 
                    onClick={() => setHoneyStatus('Ikke klar')} 
                    className="py-1 px-2 bg-gray-50 text-gray-700 font-medium text-[10px] rounded-lg hover:bg-gray-100 border border-gray-200"
                  >
                    Ikke klar
                  </button>
              </div>
          </div>
          )}

          {/* Tenant Hive Updates */}
          {profile?.role === 'tenant' && activeRental?.apiary_id && (
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                 <div className="flex items-center gap-1.5 mb-3">
                      <Activity className="w-3.5 h-3.5 text-honey-500" />
                      <h3 className="font-bold text-gray-900 text-xs">Siste nytt fra bikuben</h3>
                  </div>
                  
                  {latestHiveLog ? (
                      <div className="space-y-2">
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <p className="font-bold mb-1 text-gray-900">
                                  {new Date(latestHiveLog.created_at).toLocaleDateString('no-NO')} - Inspeksjon
                              </p>
                              <p className="italic">&quot;{latestHiveLog.details}&quot;</p>
                          </div>
                      </div>
                  ) : (
                      <p className="text-xs text-gray-500 italic">Ingen inspeksjoner registrert enda.</p>
                  )}
             </div>
          )}

          {/* ALERTS SECTION (Pilot Firewall) */}
          {nearbyAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-red-600" />
                    <h3 className="font-bold text-red-800 text-xs uppercase">Smittevarsel i området</h3>
                </div>
                <div className="space-y-2">
                    {nearbyAlerts.map((alert) => (
                        <div key={alert.id} className="bg-white/60 p-2 rounded-lg text-[10px] text-red-700">
                            <span className="font-bold block mb-0.5">⚠️ Mulig smitte oppdaget</span>
                            {alert.details}
                        </div>
                    ))}
                </div>
            </div>
          )}

          {/* RENTAL STATUS */}
          <div className="bg-white rounded-xl border border-honey-200 shadow-sm p-4 mb-2">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Min Leieavtale</h3>
                {activeRental ? (
                  <p className="text-xs text-gray-500">{activeRental.hive_count} Bikuber</p>
                ) : (
                  <p className="text-xs text-gray-500">Ingen leieavtale registrert på denne brukeren.</p>
                )}
              </div>
              {activeRental && (
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    activeRental.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : activeRental.status === "assigned"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {activeRental.status === "pending"
                    ? "Søker birøkter..."
                    : activeRental.status === "assigned"
                    ? "Birøkter tildelt"
                    : "Aktiv"}
                </span>
              )}
            </div>

            {!activeRental && (
              <div className="mt-1 flex justify-between items-center">
                <p className="text-[11px] text-gray-600">
                  For å opprette en leieavtale går du via «Lei en kube».
                </p>
                <button
                  onClick={() => router.push("/lei-en-kube")}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-honey-300 text-honey-700 font-bold hover:bg-honey-50"
                >
                  Lei en kube
                </button>
              </div>
            )}

            {activeRental && (
            <div className="bg-white rounded-xl border border-honey-200 shadow-sm p-4 mb-2">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Min Leieavtale</h3>
                        <p className="text-xs text-gray-500">{activeRental.hive_count} Bikuber</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        activeRental.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        activeRental.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                        {activeRental.status === 'pending' ? 'Søker birøkter...' :
                         activeRental.status === 'assigned' ? 'Birøkter tildelt' : 'Aktiv'}
                    </span>
                </div>

                {activeRental.status === 'pending' && (
                    <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded-lg">
                        <p>Vi sender forespørselen din til nærmeste ledige birøktere. Du får beskjed så snart noen tar oppdraget!</p>
                    </div>
                )}

                {(activeRental.status === 'assigned' || activeRental.status === 'active') && activeRental.assigned_beekeeper && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded-lg">
                        <User className="w-4 h-4 text-gray-400" />
                            <div>
                                <p className="font-bold">Din Birøkter:</p>
                                <p>{activeRental.assigned_beekeeper.full_name}</p>
                            </div>
                        </div>

                        <div className="text-xs">
                            <p className="font-bold text-gray-900 mb-1">Status:</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${activeRental.delivery_status === 'pending' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                                <p className="text-gray-600">
                                    {activeRental.delivery_status === 'pending' || !activeRental.delivery_status ? 'Kubene er under produksjon/klargjøring' :
                                     activeRental.delivery_status === 'assigned' ? 'Klargjøres for levering' :
                                     activeRental.delivery_status === 'delivered' ? 'Levert og installert!' : activeRental.delivery_status}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      if (!activeRental) return;
                      const doc = new jsPDF();

                      const monthlyPrice = Math.round((activeRental.total_price || 0) / 12);
                      const contractDate = activeRental.created_at
                        ? new Date(activeRental.created_at).toLocaleDateString('no-NO')
                        : new Date().toLocaleDateString('no-NO');

                      const contractText = RENTAL_CONTRACT_TEXT
                        .replace(/\[LEIETAKER_NAVN\]/g, activeRental.contact_name || '___________')
                        .replace('[LEIETAKER_ADRESSE]', activeRental.contact_address || '___________')
                        .replace('[LEIETAKER_TLF]', activeRental.contact_phone || '___________')
                        .replace('[LEIETAKER_EPOST]', activeRental.contact_email || '___________')
                        .replace('[ANTALL]', String(activeRental.hive_count || 1))
                        .replace('[DAGENS DATO]', contractDate)
                        .replace('[SESONG SLUTT]', getSeasonEndDate())
                        .replace(
                          'Representerer (klasse/lag/familie osv.): [LEIETAKER_NAVN] (Privat)',
                          `Representerer: ${activeRental.contact_organization || (activeRental.contact_name ? `${activeRental.contact_name} (Privat)` : '___________')}`
                        )
                        .replace('[PRIS_MND]', String(monthlyPrice))
                        .replace('[PRIS_TOTAL]', String(activeRental.total_price || 0));

                      doc.setFontSize(11);
                      const lines = doc.splitTextToSize(contractText, 180);
                      doc.text(lines, 15, 20);
                      doc.save('lek-honning-leieavtale.pdf');
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-lg border border-honey-300 text-honey-700 font-bold hover:bg-honey-50"
                  >
                    Last ned avtale (PDF)
                    </button>
                </div>
            </div>
            )}
          </div>

          {/* MISSIONS ALERT (For Beekeepers) */}
          {pendingMissionsCount > 0 && profile?.role === 'beekeeper' && (
              <Link href="/dashboard/beekeeper/rentals" className="block mb-2">
                <div className="bg-red-500 text-white rounded-xl p-4 shadow-lg flex items-center justify-between animate-pulse">
                    <div>
                        <h3 className="font-bold text-sm flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Nye Oppdrag Tilgjengelig!
                        </h3>
                        <p className="text-xs text-red-100 mt-1">{pendingMissionsCount} leietakere i ditt område venter på hjelp.</p>
                    </div>
                    <ChevronDown className="w-5 h-5 -rotate-90" />
                </div>
              </Link>
          )}

          {/* Navigation Cards (formerly Stats) */}
          <div className="grid grid-cols-2 gap-2">
              <Link href="/hives" className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-transform active:scale-95 block text-left">
                  <div className="font-bold text-sm text-gray-900 mb-0.5">BIKUBER</div>
                  <p className="text-gray-500 text-[10px] mb-0.5">Aktive kuber</p>
                  <div className="flex items-end gap-1">
                      <span className="text-lg font-bold text-gray-900">{stats.activeHives}</span>
                      <span className="text-gray-400 text-[10px] mb-1">/ {stats.hives} totalt</span>
                  </div>
              </Link>
              <Link href="/apiaries" className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-transform active:scale-95 block text-left">
                  <div className="font-bold text-sm text-gray-900 mb-0.5">BIGÅRDER</div>
                  <p className="text-gray-500 text-[10px] mb-0.5">Antall</p>
                  <div className="flex items-end gap-1">
                      <span className="text-lg font-bold text-gray-900">{stats.apiaries}</span>
                  </div>
              </Link>
          </div>
          
          {/* Weather Widget */}
          <WeatherWidget />

          {/* Quick Actions - Compact Grid */}
          <div className="grid grid-cols-2 gap-2">
              {profile?.role !== 'mattilsynet' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-honey-500 hover:bg-honey-600 text-white p-2 rounded-xl shadow-md flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 h-20"
              >
                <Plus className="w-5 h-5" />
                <span className="font-bold text-[10px] text-center leading-tight">NY KUBE</span>
              </button>
              )}

              <Link
                href="/scan"
                className="bg-white border-2 border-honey-100 hover:border-honey-500 text-honey-600 p-2 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 h-20"
              >
                <QrCode className="w-5 h-5" />
                <span className="font-bold text-[10px] text-center leading-tight">SKANN</span>
              </Link>

              <button
                onClick={() => setIsSicknessModalOpen(true)}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl shadow-md flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 h-20"
              >
                <Activity className="w-5 h-5" />
                <span className="font-bold text-[10px] text-center leading-tight">MELD SMITTE</span>
              </button>

              <Link
                href="/dashboard/smittevern"
                className="bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 p-2 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 h-20"
              >
                  <ShieldAlert className="w-5 h-5" />
                  <span className="font-bold text-[10px] text-center leading-tight">HELSE & AI</span>
              </Link>

              <Link href="/settings" className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 p-2 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 h-20">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <span className="font-bold text-[10px] text-center leading-tight">INNSTILLINGER</span>
              </Link>
          </div>



          {/* Birøkter Checklist Promo */}
          {profile?.role !== 'tenant' && profile?.role !== 'mattilsynet' && (
          <Link href="/dashboard/beekeeper/rentals" className="block mt-2">
            <div className={`rounded-xl p-4 text-white shadow-lg flex items-center justify-between transition-colors
                ${pendingMissionsCount > 0 ? 'bg-gradient-to-r from-red-600 to-red-500 animate-pulse' : 'bg-gradient-to-r from-gray-900 to-gray-800'}
            `}>
                <div>
                    <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-white" />
                        Birøkter-oppdrag
                    </h3>
                    <p className="text-[10px] text-white/90">
                        {pendingMissionsCount > 0 
                            ? `Du har ${pendingMissionsCount} nye oppdrag som venter!` 
                            : 'Ingen nye oppdrag for øyeblikket'}
                    </p>
                </div>
                <div className="bg-white/20 p-2 rounded-full">
                    <ClipboardCheck className="w-5 h-5" />
                </div>
            </div>
          </Link>
          )}

          {/* External Links (Moved Up) */}
          <div className="space-y-1 pt-1">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase px-1">Nyttige lenker</h3>
              <div className="grid grid-cols-3 gap-1.5">
                  <ExternalLinkButton href="https://richard141271.github.io/" label="LEK-HONNING" imageSrc="/images/logos/lek_honning.png" />
                  <ExternalLinkButton href="https://honning.no/" label="HC" imageSrc="/images/logos/hc.png" />
                  <ExternalLinkButton href="https://norges-birokterlag.no" label="BIRØKTERLAG" imageSrc="/images/logos/norbi.svg" />
                  <ExternalLinkButton href="https://honninglandet.no/nyheter/nm-i-honning-2025/" label="NM HONNING" imageSrc="/images/logos/honninglandet.png" />
                  <ExternalLinkButton href="https://mattilsynet.no" label="MATTILSYNET" imageSrc="/images/logos/mattilsynet.png" />
              </div>
          </div>

          {/* Recent Activity */}
          {recentLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                <div className="flex items-center gap-1.5 mb-2">
                    <Database className="w-3.5 h-3.5 text-honey-500" />
                    <h3 className="font-bold text-gray-900 text-xs">Siste Aktivitet</h3>
                </div>
                <div className="space-y-2">
                    {recentLogs.map((log) => (
                        <div key={log.id} className="flex gap-2 text-xs border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                            <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-honey-400 shrink-0" />
                            <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-gray-900 text-[10px]">{log.action}</span>
                                    {log.hives?.hive_number && (
                                        <span className="text-[9px] bg-gray-100 px-1 py-0.5 rounded text-gray-600 font-mono">
                                            {log.hives.hive_number}
                                        </span>
                                    )}
                                    {log.admin_status === 'resolved' && (
                                        <span className="text-[9px] bg-green-100 px-1 py-0.5 rounded text-green-700 font-bold uppercase">
                                            LØST
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-600 mt-0.5 text-[10px]">{log.details}</p>
                                <p className="text-gray-400 text-[9px] mt-0.5">
                                    {new Date(log.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          <p className="text-center text-gray-400 text-[9px] mt-2">© 2025 - LEK-Honning™ v1.0.0</p>
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
      
      {/* INSPECTION MODAL */}
      <InspectionModal 
        isOpen={isInspectionModalOpen} 
        onClose={() => setIsInspectionModalOpen(false)}
        allHives={allHives}
        onSuccess={() => {
            fetchData();
            setIsInspectionModalOpen(false);
        }}
      />

      {/* SICKNESS REPORT MODAL */}
      <SicknessRegistrationModal 
        isOpen={isSicknessModalOpen} 
        onClose={() => setIsSicknessModalOpen(false)}
        allHives={allHives}
        profile={profile}
        onSuccess={() => {
            fetchData();
            setIsSicknessModalOpen(false);
        }}
      />
    </div>
  );
}

function ExternalLinkButton({ href, label, imageSrc }: { href: string, label: string, imageSrc?: string }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center w-full bg-white border border-gray-200 text-gray-700 p-2 rounded-lg hover:bg-gray-50 transition-colors group text-center h-full relative overflow-hidden">
            {imageSrc ? (
                <div className="w-full h-8 flex items-center justify-center mb-1">
                     <img src={imageSrc} alt={label} className="max-w-full max-h-full object-contain" />
                </div>
            ) : (
                <span className="font-bold text-[9px] leading-tight mb-1">{label}</span>
            )}
             {imageSrc && <span className="text-[6px] text-gray-400 font-medium uppercase tracking-wider">{label}</span>}
            {!imageSrc && <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-honey-500 transition-colors shrink-0" />}
        </a>
    );
}
