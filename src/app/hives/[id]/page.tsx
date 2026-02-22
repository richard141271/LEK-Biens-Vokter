'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Truck, Calendar, Activity, X, Check, Printer, ChevronDown, ChevronUp, History, AlertTriangle, Trash2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { Warehouse, Store } from 'lucide-react';

export default function HiveDetailsPage({ params }: { params: { id: string } }) {
  const [hive, setHive] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInspectionId, setExpandedInspectionId] = useState<string | null>(null);
  
  // Move Modal State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [targetApiaryId, setTargetApiaryId] = useState('');
  const [moving, setMoving] = useState(false);

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveType, setArchiveType] = useState<'SOLGT' | 'DESTRUERT' | null>(null);
  const [destructionReason, setDestructionReason] = useState<'ØDELAGT' | 'SYKDOM' | null>(null);
  const [diseaseDetails, setDiseaseDetails] = useState('');
  const [archiving, setArchiving] = useState(false);

  // Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFilter, setPrintFilter] = useState<{
      limit: 'last5' | 'all' | 'dateRange',
      dateRange: { start: string, end: string }
  }>({
      limit: 'last5',
      dateRange: { start: '', end: '' }
  });

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchHiveDetails();
  }, [params.id]);

  const fetchHiveDetails = async () => {
    // 0. Check Offline Cache FIRST (if no network)
    if (!navigator.onLine) {
        try {
            const offlineData = localStorage.getItem('offline_data');
            if (offlineData) {
                const parsed = JSON.parse(offlineData);
                const foundHive = parsed.hives?.find((h: any) => h.id === params.id);
                
                if (foundHive) {
                    console.log('📦 Loaded hive details from offline cache', foundHive);
                    // Reconstruct structure expected by page
                    // Apiary info might be flattened or separate, let's try to attach it
                    const foundApiary = parsed.apiaries?.find((a: any) => a.id === foundHive.apiary_id);
                    
                    setHive({
                        ...foundHive,
                        apiaries: foundApiary ? {
                            name: foundApiary.name,
                            location: foundApiary.location,
                            type: foundApiary.type
                        } : undefined
                    });

                    // We might not have logs/inspections in the light cache
                    // If we want them offline, we need to cache them in apiaries/page.tsx too
                    // For now, at least show the hive info so page doesn't crash
                }
            }
        } catch (e) {
            console.error('Offline cache load failed', e);
        }
        setLoading(false);
        return;
    }

    // Fetch Hive with Apiary info
    const { data: hiveData, error: hiveError } = await supabase
      .from('hives')
      .select('*, apiaries(name, location, type, apiary_number)')
      .eq('id', params.id)
      .single();

    if (hiveError) {
      console.error('Error fetching hive:', hiveError);
      return;
    }

    setHive({
      ...hiveData,
    });

    // Fetch Logs
    const { data: logsData } = await supabase
      .from('hive_logs')
      .select('*')
      .eq('hive_id', params.id)
      .order('created_at', { ascending: false });

    if (logsData) setLogs(logsData);

    // Fetch Inspections
    const { data: inspectionsData } = await supabase
      .from('inspections')
      .select('*')
      .eq('hive_id', params.id)
      .order('inspection_date', { ascending: false });

    if (inspectionsData) setInspections(inspectionsData);

    setLoading(false);
  };

  const moveHive = async () => {
    const { data, error } = await supabase.from('apiaries').select('*').order('name');
    if (error) {
        console.error('Error fetching apiaries:', error);
        alert('Kunne ikke hente bigårder.');
        return;
    }
    
    // Use hive.apiary_id which is on the hive object itself
    // Filter to only allow moving to Bigård (or Utleie)
    const otherApiaries = data ? data.filter(a => 
      a.id !== hive.apiary_id && 
      (!a.type || ['bigård', 'utleie'].includes(a.type))
    ) : [];

    setApiaries(otherApiaries);
    setIsMoveModalOpen(true);
  };

  const handleMoveSubmit = async () => {
    if (!targetApiaryId) return;
    setMoving(true);

    try {
      const targetApiary = apiaries.find(a => a.id === targetApiaryId);
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Update hive location
      const { error: updateError } = await supabase
        .from('hives')
        .update({ apiary_id: targetApiaryId })
        .eq('id', params.id);

      if (updateError) throw updateError;

      // 2. Log movement
      const { error: logError } = await supabase
        .from('hive_logs')
        .insert({
          hive_id: params.id,
          user_id: user?.id,
          action: 'FLYTTET',
          details: `Flyttet fra ${hive.apiaries?.name || 'Ukjent'} til ${targetApiary?.name} (${targetApiary?.apiary_number})`
        });

      if (logError) throw logError;

      // 3. Refresh and close
      await fetchHiveDetails();
      setIsMoveModalOpen(false);
      setTargetApiaryId('');
      alert('Kuben er flyttet!');

    } catch (error: any) {
      alert('Feil ved flytting: ' + error.message);
    } finally {
      setMoving(false);
    }
  };

  const handleTypeChange = async (type: string) => {
    // Optimistic update
    setHive({ ...hive, type });

    const { error } = await supabase
      .from('hives')
      .update({ type })
      .eq('id', params.id);

    if (error) {
      console.error('Failed to update type', error);
      alert('Kunne ikke oppdatere kubetype');
      fetchHiveDetails(); // Revert on error
    }
  };

  const handleActiveToggle = async () => {
    const isCurrentlyActive = hive.active !== false; // Default true if undefined

    let updates: any = { active: !isCurrentlyActive };
    let logAction = '';
    let logDetails = '';

    if (!isCurrentlyActive) {
      // REACTIVATING
      const confirm = window.confirm('Vil du gjenaktivere denne kuben? (F.eks. tilbakekjøpt eller feilregistrert)');
      if (!confirm) return;

      updates.archive_reason = null;
      updates.archived_at = null;
      
      // Reset status if it was an end-state
      if (hive?.status && ['SOLGT', 'DESTRUERT', 'DØD', 'SYKDOM'].includes(hive.status)) {
           updates.status = 'OK';
      }

      logAction = 'GJENAKTIVERT';
      logDetails = 'Kuben er aktivert igjen (tilbakekjøpt/angret)';

    } else {
      // DEACTIVATING (Manual toggle, not via archive modal)
      const confirm = window.confirm('Er du sikker på at du vil sette kuben inaktiv manuelt? Bruk heller "Avslutt / Slett" knappen for å arkivere korrekt.');
      if (!confirm) return;
      
      logAction = 'DEAKTIVERT';
      logDetails = 'Satt inaktiv manuelt';
    }

    // Optimistic update
    setHive({ ...hive, ...updates });

    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
        .from('hives')
        .update(updates)
        .eq('id', params.id);

        if (error) throw error;

        // Log it
        if (logAction) {
            await supabase.from('hive_logs').insert({
                hive_id: params.id,
                user_id: user?.id,
                action: logAction,
                details: logDetails
            });
        }
        
        // Refresh to be safe
        fetchHiveDetails();

    } catch (error) {
      console.error('Failed to update active status', error);
      alert('Kunne ikke endre status');
      fetchHiveDetails(); // Revert
    }
  };

  const handleDeleteInspection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling expansion
    
    if (!confirm('Er du sikker på at du vil slette denne inspeksjonen?')) return;

    const { error } = await supabase
      .from('inspections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting inspection:', error);
      alert('Kunne ikke slette inspeksjon: ' + error.message);
      return;
    }

    // Update local state
    setInspections(prev => prev.filter(i => i.id !== id));
    if (expandedInspectionId === id) setExpandedInspectionId(null);
  };

  const toggleInspection = (id: string) => {
    if (expandedInspectionId === id) {
      setExpandedInspectionId(null);
    } else {
      setExpandedInspectionId(id);
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const executePrint = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => {
        window.print();
    }, 100);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lager': return Warehouse;
      case 'butikk': return Store;
      case 'bil': return Truck;
      default: return MapPin;
    }
  };

  const getStatusColor = (hive: any) => {
    // Handle null/undefined input safely
    if (!hive) return 'bg-gray-100 text-gray-500 border-gray-200';

    // Handle if input is just the status string (e.g. from inspection.status)
    const status = typeof hive === 'string' ? hive : hive.status;
    const active = typeof hive === 'object' ? hive.active : undefined;

    // Check specific statuses first, even if inactive
    if (status === 'SOLGT') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (status === 'AVSLUTTET') return 'bg-gray-100 text-gray-800 border-gray-200';
    
    if (active === false) return 'bg-gray-100 text-gray-500 border-gray-200';
    
    switch (status) {
      case 'DØD':
      case 'SYKDOM': // Case sensitive match fix
      case 'Sykdom':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'SVAK':
      case 'Svak':
      case 'Bytt dronning':
      case 'Sverming':
      case 'Varroa mistanke':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'AKTIV':
      case 'OK':
      case 'Mottatt fôr':
      case 'Skiftet rammer':
      case 'Byttet voks':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200'; // Default to active green
    }
  };

  const getStatusText = (hive: any) => {
    if (!hive) return '-';
    // Handle string input
    if (typeof hive === 'string') return hive;
    
    if (hive.status === 'SOLGT') return 'SOLGT';
    if (hive.status === 'AVSLUTTET') return 'AVSLUTTET';
    if (hive.active === false) return 'AVSLUTTET'; 
    return hive.status || 'AKTIV';
  };

  const handleArchiveSubmit = async () => {
    if (!archiveType) return;
    if (archiveType === 'DESTRUERT' && !destructionReason) return;
    if (archiveType === 'DESTRUERT' && destructionReason === 'SYKDOM' && !diseaseDetails) return;

    setArchiving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let details = '';
      if (archiveType === 'SOLGT') {
        details = 'Solgt';
      } else if (archiveType === 'DESTRUERT') {
        details = `Destruert: ${destructionReason === 'ØDELAGT' ? 'Ødelagt/Utdatert' : `Sykdom (${diseaseDetails})`}`;
      }

      // 1. Update hive status
      const { error: updateError } = await supabase
        .from('hives')
        .update({ 
          status: archiveType,
          active: false,
          archive_reason: archiveType === 'DESTRUERT' ? destructionReason : archiveType,
          archived_at: new Date().toISOString()
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      // 2. Log archival
      const { error: logError } = await supabase
        .from('hive_logs')
        .insert({
          hive_id: params.id,
          user_id: user?.id,
          action: archiveType,
          details: details
        });

      if (logError) throw logError;

      alert(`Kube markert som ${archiveType.toLowerCase()}!`);
      router.push('/hives'); // Go back to list

    } catch (error: any) {
      alert('Feil ved arkivering: ' + error.message);
    } finally {
      setArchiving(false);
      setIsArchiveModalOpen(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Laster bikube...</div>;
  if (!hive) return <div className="p-8 text-center">Fant ikke bikube</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 print:bg-white print:pb-0 print:min-h-0 print:h-auto">
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5cm;
            size: auto;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          /* Hide everything by default, only show what we want if needed, 
             but here we rely on tailwind 'print:hidden' classes */
        }
      `}</style>

      {/* Page Title & Actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 font-mono tracking-tight">
                {hive.hive_number}
              </h1>
              {hive.name && hive.name !== hive.hive_number && (
                <p className="text-sm text-gray-600">
                  {hive.name}
                </p>
              )}
              {hive.core_hive_id && (
                <p className="text-[11px] text-gray-500 font-mono mt-1">
                  Core: {hive.core_hive_id}
                </p>
              )}
            </div>
          </div>
          <button onClick={handlePrint} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block p-8 pb-0">
        <h1 className="text-3xl font-bold">{hive.name} (#{hive.hive_number})</h1>
        <p>Utskrift dato: {new Date().toLocaleDateString()}</p>
      </div>

      <main className="p-4 space-y-6 print:p-8">
        
        {/* Status Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm print:border-black">
          <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center text-honey-600 print:hidden">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Status: {hive.name}</h2>
                  <div className="flex gap-2 mt-1">
                    <span className={`font-medium px-2 py-0.5 rounded-full text-sm border ${getStatusColor(hive)}`}>
                        {getStatusText(hive)}
                    </span>
                    <button 
                        onClick={handleActiveToggle}
                        className={`font-medium px-2 py-0.5 rounded-full text-sm border transition-colors ${
                            hive.active !== false // Default to true if undefined
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                        {hive.active !== false ? 'Aktiv' : 'Avsluttet'}
                    </button>
                  </div>
                </div>
             </div>
          </div>

          {/* Hive Type Selection */}
          <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 print:hidden">
            <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Kubetype</span>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="hiveType" 
                        checked={hive.type === 'PRODUKSJON' || !hive.type} // Default
                        onChange={() => handleTypeChange('PRODUKSJON')}
                        className="text-honey-600 focus:ring-honey-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Produksjonskube</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="hiveType" 
                        checked={hive.type === 'AVLEGGER'}
                        onChange={() => handleTypeChange('AVLEGGER')}
                        className="text-honey-600 focus:ring-honey-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Avlegger</span>
                </label>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-4 print:border-gray-300">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 print:hidden" />
              <div>
                <p className="text-sm font-medium text-gray-900">Nåværende lokasjon</p>
                <p className="text-gray-600">{hive.apiaries?.name || 'Ukjent'}</p>
                <p className="text-xs text-gray-500">{hive.apiaries?.location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions (Hidden on Print) */}
        <div className="grid grid-cols-2 gap-4 print:hidden">
          <button 
            onClick={moveHive}
            className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Truck className="w-8 h-8 text-blue-500" />
            <span className="font-medium text-gray-900">Flytt kube</span>
          </button>
          
          <Link 
            href={`/hives/${hive.id}/new-inspection`}
            className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-8 h-8 text-honey-500" />
            <span className="font-medium text-gray-900">Ny inspeksjon</span>
          </Link>

          <button 
            onClick={() => setIsArchiveModalOpen(true)}
            className="col-span-2 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors text-red-700 mt-2"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">Avslutt / Slett kube</span>
          </button>
        </div>

        {/* Inspections History - Screen View */}
        <div className="print:hidden">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Inspeksjonshistorikk</h3>
          <div className="space-y-3">
            {inspections.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Ingen inspeksjoner enda.</p>
            ) : (
              inspections.map((inspection) => (
                <div 
                  key={inspection.id} 
                  className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all ${
                    expandedInspectionId === inspection.id ? 'ring-2 ring-honey-500' : ''
                  }`}
                >
                  <button 
                    type="button"
                    onClick={() => toggleInspection(inspection.id)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 p-2 rounded-lg text-center min-w-[3rem]">
                        <div className="text-xs text-gray-500 uppercase font-bold">{new Date(inspection.inspection_date).toLocaleString('default', { month: 'short' })}</div>
                        <div className="text-lg font-bold text-gray-900">{new Date(inspection.inspection_date).getDate()}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(inspection.status)}`}>
                             {inspection.status}
                           </span>
                           {inspection.weather && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{inspection.weather}</span>}
                           {inspection.image_url && <ImageIcon className="w-4 h-4 text-gray-400" />}
                        </div>
                        <p className="text-sm text-gray-500 truncate max-w-[200px] mt-1">
                          {inspection.notes || 'Ingen notater'}
                        </p>
                      </div>
                    </div>
                    {expandedInspectionId === inspection.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  <div className={`${expandedInspectionId === inspection.id ? 'block' : 'hidden'} px-4 pb-4 pt-0 bg-gray-50 border-t border-gray-100`}>
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase">Dronning</span>
                        <span className={inspection.queen_seen ? 'text-green-600 font-bold' : 'text-gray-400'}>
                          {inspection.queen_seen ? 'Observert' : 'Ikke sett'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase">Egg</span>
                        <span className={inspection.eggs_seen ? 'text-green-600 font-bold' : 'text-gray-400'}>
                          {inspection.eggs_seen ? 'Observert' : 'Ikke sett'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase">Gemytt</span>
                        <span className="capitalize">{inspection.temperament}</span>
                      </div>
                       <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase">Yngel</span>
                        <span className="capitalize">{inspection.brood_condition}</span>
                      </div>
                       <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase">Fôr</span>
                        <span className="capitalize">{inspection.honey_stores}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-500 uppercase">Temperatur</span>
                        <span>{inspection.temperature ? `${inspection.temperature}°C` : '-'}</span>
                      </div>
                    </div>
                    {inspection.notes && (
                      <div className="mt-4 bg-white p-3 rounded border border-gray-200">
                        <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Notater</span>
                        <p className="text-gray-800 whitespace-pre-wrap">{inspection.notes}</p>
                      </div>
                    )}
                    {(() => {
                      // Collect images: primary + any URLs inside notes
                      const images: string[] = [];
                      if (inspection.image_url) images.push(inspection.image_url);
                      if (inspection.notes) {
                        const iter = inspection.notes.matchAll(/https?:\/\/[^\s)'"`]+/g) as Iterable<RegExpMatchArray>;
                        const urls = Array.from(iter).map(m => m[0]);
                        // Keep only inspection-images bucket URLs to avoid noise
                        urls.forEach(u => {
                          if (u.includes('/inspection-images/')) images.push(u);
                        });
                      }
                      const uniq = Array.from(new Set(images));
                      return uniq.length > 0 ? (
                        <div className="mt-4">
                          <span className="block text-xs font-bold text-gray-500 uppercase mb-2">Bilder</span>
                          <div className="grid grid-cols-2 gap-3">
                            {uniq.map((src) => (
                              <div key={src} className="rounded-lg overflow-hidden border border-gray-200">
                                <img src={src} alt="Inspeksjon" className="w-full h-auto object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={(e) => handleDeleteInspection(inspection.id, e)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Slett inspeksjon
                        </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inspections History - Print View */}
        <div className="hidden print:block mt-6">
            <h3 className="text-lg font-bold text-black mb-4 border-b-2 border-black pb-2">INSPEKSJONSHISTORIKK</h3>
            <table className="w-full text-sm text-left">
                <thead>
                    <tr className="border-b border-black">
                        <th className="py-2">Dato</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Notater</th>
                        <th className="py-2">Detaljer</th>
                    </tr>
                </thead>
                <tbody>
                    {inspections
                        .filter(insp => {
                            if (printFilter.limit === 'all') return true;
                            if (printFilter.limit === 'dateRange') {
                                if (!printFilter.dateRange.start && !printFilter.dateRange.end) return true;
                                const date = new Date(insp.inspection_date);
                                const start = printFilter.dateRange.start ? new Date(printFilter.dateRange.start) : new Date(0);
                                const end = printFilter.dateRange.end ? new Date(printFilter.dateRange.end) : new Date(8640000000000000);
                                if (printFilter.dateRange.end) end.setHours(23, 59, 59, 999);
                                return date >= start && date <= end;
                            }
                            return true;
                        })
                        .slice(0, printFilter.limit === 'last5' ? 5 : undefined)
                        .map((inspection) => (
                        <tr key={inspection.id} className="border-b border-gray-300">
                            <td className="py-2 align-top">{new Date(inspection.inspection_date).toLocaleDateString()}</td>
                            <td className="py-2 align-top">{inspection.status}</td>
                            <td className="py-2 align-top max-w-[200px]">{inspection.notes || '-'}</td>
                            <td className="py-2 align-top text-xs">
                                <div className="grid grid-cols-2 gap-x-2">
                                    <span>{inspection.queen_seen ? '👑 Dronning' : '-'}</span>
                                    <span>{inspection.eggs_seen ? '🥚 Egg' : '-'}</span>
                                    {inspection.honey_stores && <span>🍯 {inspection.honey_stores}</span>}
                                    {inspection.temperament && <span>😡 {inspection.temperament}</span>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {inspections.length === 0 && <p className="text-gray-500 italic mt-2">Ingen inspeksjoner.</p>}
        </div>

        {/* Logs Section (Restored & Filtered for Movements/Important Events) */}
        {logs.length > 0 && (
            <div className="print:hidden">
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-5 h-5" /> Logg
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {logs.map((log) => (
                        <div key={log.id} className="p-4 border-b border-gray-100 last:border-none flex items-start gap-3">
                            <div className={`mt-1 rounded-full p-1.5 ${
                                log.action === 'FLYTTET' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {log.action === 'FLYTTET' ? <Truck className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{log.action}</p>
                                <p className="text-sm text-gray-600">{log.details}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(log.created_at).toLocaleString('no-NO', { 
                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>

      {/* Move Hive Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-honey-50">
              <h3 className="font-bold text-lg text-gray-900">Flytt {hive.name}</h3>
              <button 
                onClick={() => setIsMoveModalOpen(false)}
                className="p-1 hover:bg-honey-100 rounded-full text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">Velg hvor du vil flytte kuben:</p>
              
              {apiaries.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-gray-500 mb-4">Du har ingen andre bigårder å flytte til.</p>
                    <Link href="/apiaries" className="text-honey-600 font-bold hover:underline">
                        Opprett en ny bigård
                    </Link>
                </div>
              ) : (
                <>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4">
                    {apiaries.map((apiary) => {
                    const Icon = getIcon(apiary.type);
                    const isSelected = targetApiaryId === apiary.id;
                    
                    return (
                        <button
                        key={apiary.id}
                        onClick={() => setTargetApiaryId(apiary.id)}
                        className={`w-full p-3 rounded-lg border flex items-center gap-3 transition-all ${
                            isSelected 
                            ? 'border-honey-500 bg-honey-50 ring-1 ring-honey-500' 
                            : 'border-gray-200 hover:border-honey-300'
                        }`}
                        >
                        <div className={`p-2 rounded-full ${isSelected ? 'bg-honey-100 text-honey-600' : 'bg-gray-100 text-gray-500'}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-medium text-gray-900">{apiary.name}</div>
                            <div className="text-xs text-gray-500">{apiary.apiary_number}</div>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-honey-600" />}
                        </button>
                    );
                    })}
                </div>

                <button
                    onClick={handleMoveSubmit}
                    disabled={!targetApiaryId || moving}
                    className="w-full bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {moving ? 'Flytter...' : 'Bekreft flytting'}
                </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Archive Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Avslutt bikube</h3>
            
            {!archiveType ? (
              <div className="space-y-3">
                <p className="text-gray-600 mb-4">Hva vil du gjøre med kuben?</p>
                <button
                  onClick={() => setArchiveType('SOLGT')}
                  className="w-full p-4 rounded-lg border border-gray-200 hover:border-honey-500 hover:bg-honey-50 flex items-center gap-3 transition-colors text-left"
                >
                  <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Solgt</div>
                    <div className="text-sm text-gray-500">Kuben er solgt til en annen birøkter</div>
                  </div>
                </button>

                <button
                  onClick={() => setArchiveType('DESTRUERT')}
                  className="w-full p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors text-left"
                >
                  <div className="bg-red-100 p-2 rounded-full text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Destruert</div>
                    <div className="text-sm text-gray-500">Kuben er ødelagt eller har sykdom</div>
                  </div>
                </button>
              </div>
            ) : archiveType === 'DESTRUERT' && !destructionReason ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="text-sm font-medium">Hvorfor skal kuben destrueres?</p>
                </div>
                
                <button
                  onClick={() => setDestructionReason('ØDELAGT')}
                  className="w-full p-4 rounded-lg border border-gray-200 hover:border-gray-400 flex items-center gap-3 transition-colors text-left"
                >
                  <div className="font-bold text-gray-900">Ødelagt / Utdatert</div>
                </button>

                <button
                  onClick={() => setDestructionReason('SYKDOM')}
                  className="w-full p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors text-left"
                >
                  <div className="font-bold text-gray-900">Sykdom</div>
                </button>
              </div>
            ) : archiveType === 'DESTRUERT' && destructionReason === 'SYKDOM' ? (
               <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="text-sm font-medium">Spesifiser sykdomsårsak</p>
                </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Hvilken sykdom/årsak?</label>
                   <input
                     type="text"
                     value={diseaseDetails}
                     onChange={(e) => setDiseaseDetails(e.target.value)}
                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                     placeholder="F.eks. Lukket yngelråte, Kalkyngel..."
                   />
                 </div>
               </div>
            ) : (
              <div className="space-y-4">
                 <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Du er i ferd med å markere kuben som:</p>
                    <p className="text-lg font-bold text-gray-900">
                      {archiveType}
                      {archiveType === 'DESTRUERT' && (
                        <span className="text-sm font-normal text-gray-500 block">
                          Årsak: {destructionReason === 'ØDELAGT' ? 'Ødelagt/Utdatert' : `Sykdom (${diseaseDetails})`}
                        </span>
                      )}
                    </p>
                 </div>
                 <p className="text-sm text-gray-500">
                   Kuben vil bli markert som inaktiv og fjernet fra den daglige oversikten, men historikken beholdes.
                 </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (destructionReason === 'SYKDOM') {
                    setDestructionReason(null);
                    setDiseaseDetails('');
                  } else if (destructionReason) {
                    setDestructionReason(null);
                  } else if (archiveType) {
                    setArchiveType(null);
                  } else {
                    setIsArchiveModalOpen(false);
                  }
                }}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
              >
                {archiveType ? 'Tilbake' : 'Avbryt'}
              </button>
              
              {(archiveType === 'SOLGT' || (archiveType === 'DESTRUERT' && destructionReason === 'ØDELAGT') || (archiveType === 'DESTRUERT' && destructionReason === 'SYKDOM' && diseaseDetails)) && (
                <button
                  onClick={handleArchiveSubmit}
                  disabled={archiving}
                  className={`flex-1 py-3 px-4 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    archiveType === 'DESTRUERT' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {archiving ? 'Lagrer...' : 'Bekreft'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Print Options Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4">Utskriftsvalg</h3>
                
                <div className="space-y-4 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="radio"
                            name="printLimit"
                            checked={printFilter.limit === 'last5'}
                            onChange={() => setPrintFilter({...printFilter, limit: 'last5'})}
                            className="w-4 h-4 text-honey-600"
                        />
                        <span className="text-sm">Siste 5 inspeksjoner (Standard)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="radio"
                            name="printLimit"
                            checked={printFilter.limit === 'all'}
                            onChange={() => setPrintFilter({...printFilter, limit: 'all'})}
                            className="w-4 h-4 text-honey-600"
                        />
                        <span className="text-sm">Alle inspeksjoner</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                            type="radio"
                            name="printLimit"
                            checked={printFilter.limit === 'dateRange'}
                            onChange={() => setPrintFilter({...printFilter, limit: 'dateRange'})}
                            className="w-4 h-4 text-honey-600"
                        />
                        <span className="text-sm">Velg periode</span>
                    </label>

                    {printFilter.limit === 'dateRange' && (
                        <div className="grid grid-cols-2 gap-2 pl-7">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Fra</label>
                                <input 
                                    type="date"
                                    value={printFilter.dateRange.start}
                                    onChange={e => setPrintFilter({
                                        ...printFilter, 
                                        dateRange: {...printFilter.dateRange, start: e.target.value}
                                    })}
                                    className="w-full text-sm p-1.5 border rounded"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Til</label>
                                <input 
                                    type="date"
                                    value={printFilter.dateRange.end}
                                    onChange={e => setPrintFilter({
                                        ...printFilter, 
                                        dateRange: {...printFilter.dateRange, end: e.target.value}
                                    })}
                                    className="w-full text-sm p-1.5 border rounded"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsPrintModalOpen(false)}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg"
                    >
                        Avbryt
                    </button>
                    <button
                        onClick={executePrint}
                        className="flex-1 py-2 bg-honey-500 hover:bg-honey-600 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Skriv ut
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
