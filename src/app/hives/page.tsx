'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Box, MapPin, Calendar, ArrowRight, Printer, QrCode } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

export default function AllHivesPage() {
  const [hives, setHives] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [rentalsMap, setRentalsMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Print State
  const [selectedHives, setSelectedHives] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [printLayout, setPrintLayout] = useState<'cards' | 'list' | 'qr' | null>(null);
  const [printData, setPrintData] = useState<{ [key: string]: { inspections: any[], logs: any[] } }>({});
  const [loadingPrintData, setLoadingPrintData] = useState(false);
  
  // Print Options Modal
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState({
      includeHistory: true,
      includeLogs: true,
      includeImages: true,
      includeNotes: true,
      inspectionLimit: 'last5',
      dateRange: { start: '', end: '' }
  });

  // Mass Action State
  const [isMassActionModalOpen, setIsMassActionModalOpen] = useState(false);
  const [massActionType, setMassActionType] = useState<'inspeksjon' | 'logg' | null>(null);
  const [isSubmittingMassAction, setIsSubmittingMassAction] = useState(false);
  
  // Mass Inspection Form
  const [massInspectionData, setMassInspectionData] = useState({
    queen_seen: false,
    eggs_seen: false,
    honey_stores: 'middels', // Changed from food_status to honey_stores
    temperament: 'rolig',
    notes: ''
  });

  // Mass Log Form
  const [massLogData, setMassLogData] = useState({
    action: 'BEHANDLING',
    details: ''
  });

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchHives();
  }, []);

  const fetchHives = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);

    let targetUserId: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      targetUserId = params.get('user_id');
    }

    // Fetch all hives with apiary info (valgfritt filtrert på spesifikk bruker)
    let hiveQuery = supabase
      .from('hives')
      .select('*, apiaries(name, location)')
      .neq('status', 'SOLGT')
      .neq('status', 'DESTRUERT')
      .neq('status', 'SYKDOM')
      .order('hive_number', { ascending: true });

    if (targetUserId) {
      hiveQuery = hiveQuery.eq('user_id', targetUserId);
    }

    const { data, error } = await hiveQuery;

    if (data) setHives(data);
    setLoading(false);
  };

  // Filter hives based on search term
  const filteredHives = hives.filter(hive => {
    const term = searchTerm.toLowerCase();
    const hiveNum = hive.hive_number?.toLowerCase() || '';
    const apiaryName = hive.apiaries?.name?.toLowerCase() || '';
    const apiaryLoc = hive.apiaries?.location?.toLowerCase() || '';
    const status = (hive.active === false ? 'inaktiv' : (hive.status || 'aktiv')).toLowerCase();
    const type = (hive.type || 'produksjon').toLowerCase();
    const name = hive.name?.toLowerCase() || ''; // Added name search
    
    // Check if it's a rental hive
    const rental = rentalsMap.get(hive.apiary_id);
    const isRental = !!rental;
    const rentalName = rental ? rental.contact_name.toLowerCase() : '';

    if (hiveNum.includes(term) || 
           apiaryName.includes(term) || 
           apiaryLoc.includes(term) || 
           status.includes(term) ||
           type.includes(term) ||
           name.includes(term) ||
           (isRental && 'utleie'.includes(term)) ||
           rentalName.includes(term)) return true;

    // Numeric loose match (e.g. "002" matches "2")
    const cleanTerm = term.replace(/\D/g, '').replace(/^0+/, '');
    const cleanNum = hiveNum.replace(/\D/g, '').replace(/^0+/, '');
    
    if (cleanTerm && cleanNum && cleanTerm === cleanNum) return true;

    return false;
  });

  const toggleSelection = (id: string) => {
    setSelectedHives(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = async (layout: 'cards' | 'list' | 'qr', skipOptions = false) => {
    // If cards and options not skipped, open modal first
    if (layout === 'cards' && !skipOptions) {
        setIsPrintOptionsOpen(true);
        return;
    }

    setLoadingPrintData(true);
    
    // Determine which hives to print
    const hivesToPrint = hives
        .filter(h => filteredHives.includes(h)) // Only search results
        .filter(h => selectedHives.length === 0 || selectedHives.includes(h.id));

    const hiveIds = hivesToPrint.map(h => h.id);

    if (hiveIds.length > 0 && layout !== 'qr') {
        // Fetch inspections and logs ONLY if not QR mode (QR mode doesn't need them)
        const { data: inspections } = await supabase
            .from('inspections')
            .select('*')
            .in('hive_id', hiveIds)
            .order('inspection_date', { ascending: false });

        const { data: logs } = await supabase
            .from('hive_logs')
            .select('*')
            .in('hive_id', hiveIds)
            .order('created_at', { ascending: false });

        // Group data by hive_id
        const newData: { [key: string]: { inspections: any[], logs: any[] } } = {};
        hiveIds.forEach(id => {
            newData[id] = {
                inspections: inspections?.filter(i => i.hive_id === id) || [],
                logs: logs?.filter(l => l.hive_id === id) || []
            };
        });
        setPrintData(newData);
    }

    setLoadingPrintData(false);
    setPrintLayout(layout);
    
    // Use a small timeout to allow state to update and DOM to render before printing
    setTimeout(() => {
      window.print();
    }, 500); // Increased timeout slightly to ensure data renders
  };

  const handleMassActionSubmit = async () => {
    if (selectedHives.length === 0 || !massActionType) return;
    setIsSubmittingMassAction(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (massActionType === 'inspeksjon') {
            const inspections = selectedHives.map(id => ({
                hive_id: id,
                user_id: user.id,
                inspection_date: new Date().toISOString().split('T')[0],
                ...massInspectionData
            }));

            const { error } = await supabase.from('inspections').insert(inspections);
            if (error) throw error;
        } else {
            const logs = selectedHives.map(id => ({
                hive_id: id,
                user_id: user.id,
                action: massLogData.action,
                details: massLogData.details
            }));

            const { error } = await supabase.from('hive_logs').insert(logs);
            if (error) throw error;
        }

        alert(`${massActionType === 'inspeksjon' ? 'Inspeksjoner' : 'Logger'} registrert på ${selectedHives.length} kuber!`);
        setIsMassActionModalOpen(false);
        setMassActionType(null);
        setSelectedHives([]);
        setIsSelectionMode(false);
        // Reset forms
        setMassInspectionData({
            queen_seen: false,
            eggs_seen: false,
            honey_stores: 'middels',
            temperament: 'rolig',
            notes: ''
        });
        setMassLogData({
            action: 'BEHANDLING',
            details: ''
        });

    } catch (error: any) {
        alert('Feil ved masseregistrering: ' + error.message);
    } finally {
        setIsSubmittingMassAction(false);
    }
  };

  const getStatusColor = (hive: any) => {
    // Check specific statuses first, even if inactive
    if (hive.status === 'SOLGT') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (hive.status === 'AVSLUTTET') return 'bg-gray-100 text-gray-800 border-gray-200';
    
    if (hive.active === false) return 'bg-gray-100 text-gray-500 border-gray-200';
    
    switch (hive.status) {
      case 'DØD': return 'bg-red-100 text-red-800 border-red-200';
      case 'SVAK': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'AKTIV': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-green-100 text-green-800 border-green-200'; // Default to active green
    }
  };

  const getStatusText = (hive: any) => {
    if (hive.status === 'SOLGT') return 'SOLGT';
    if (hive.status === 'AVSLUTTET') return 'AVSLUTTET';
    if (hive.active === false) return 'AVSLUTTET'; // Display inactive as Avsluttet per user request
    return hive.status || 'AKTIV';
  };

  if (loading) return <div className="p-8 text-center">Laster bikuber...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 print:bg-white print:pb-0">
      {/* Print Content (Hidden on Screen) */}
      {printLayout && (
        <div className="hidden print:block p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Bikubeoversikt</h1>
            <p className="text-sm text-gray-500">Utskriftsdato: {new Date().toLocaleDateString()}</p>
          </div>

          {printLayout === 'list' ? (
             // LIST VIEW (Table)
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2 font-bold w-12">Bilde</th>
                  <th className="py-2 font-bold w-16">Kube #</th>
                  <th className="py-2 font-bold w-32">Navn/Lokasjon</th>
                  <th className="py-2 font-bold w-16">Status</th>
                  <th className="py-2 font-bold w-64">Siste Inspeksjon</th>
                  <th className="py-2 font-bold">Siste Logg</th>
                </tr>
              </thead>
              <tbody>
                {filteredHives
                  .filter(h => selectedHives.length === 0 || selectedHives.includes(h.id))
                  .map(hive => {
                    const lastInsp = printData[hive.id]?.inspections?.[0];
                    const lastLog = printData[hive.id]?.logs?.[0];
                    return (
                      <tr key={hive.id} className="border-b border-gray-300 break-inside-avoid">
                        <td className="py-2 align-top">
                            {lastInsp?.image_url && (
                                <img src={lastInsp.image_url} alt="" className="w-8 h-8 object-cover rounded border border-gray-300" />
                            )}
                        </td>
                        <td className="py-2 align-top font-mono font-bold">{hive.hive_number}</td>
                        <td className="py-2 align-top">
                            <div className="font-bold">{hive.name}</div>
                            <div className="text-gray-600">{hive.apiaries?.name}</div>
                            <div className="text-gray-500 uppercase text-[10px]">{hive.type || 'PRODUKSJON'}</div>
                        </td>
                        <td className="py-2 align-top">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusColor(hive)}`}>
                                {getStatusText(hive)}
                            </span>
                        </td>
                        <td className="py-2 align-top">
                            {lastInsp ? (
                                <div>
                                    <div className="font-bold">{new Date(lastInsp.inspection_date).toLocaleDateString()}</div>
                                    <div className="flex gap-1 flex-wrap mt-0.5">
                                        {lastInsp.queen_seen && <span className="text-[10px] bg-green-50 text-green-700 px-1 rounded">Dronning</span>}
                                        {lastInsp.eggs_seen && <span className="text-[10px] bg-green-50 text-green-700 px-1 rounded">Egg</span>}
                                    </div>
                                    {lastInsp.notes && <div className="text-gray-600 italic mt-1 line-clamp-3">{lastInsp.notes}</div>}
                                </div>
                            ) : '-'}
                        </td>
                        <td className="py-2 align-top">
                            {lastLog ? (
                                <div>
                                    <div className="font-bold">{new Date(lastLog.created_at).toLocaleDateString()}</div>
                                    <div className="text-[10px] uppercase font-bold text-gray-500">{lastLog.action}</div>
                                    <div className="text-gray-600 line-clamp-2">{lastLog.details}</div>
                                </div>
                            ) : '-'}
                        </td>
                      </tr>
                    );
                })}
              </tbody>
            </table>
          ) : printLayout === 'qr' ? (
            // QR CODE VIEW - Optimized for 4 per row (approx 20-24 per page)
            <div className="grid grid-cols-4 gap-2 print:gap-2 p-4 print:p-0">
              {filteredHives
                .filter(h => selectedHives.length === 0 || selectedHives.includes(h.id))
                .map(hive => (
                  <div key={hive.id} className="border border-black p-2 rounded-lg flex flex-col items-center justify-center text-center break-inside-avoid h-[160px]">
                    <h2 className="text-sm font-bold mb-0.5 leading-tight">{hive.hive_number}</h2>
                    <p className="text-[10px] text-gray-600 mb-1 truncate max-w-full px-1">{hive.name}</p>
                    
                    <QRCodeSVG 
                      value={`${window.location.origin}/hives/${hive.id}`}
                      size={80}
                      level="H"
                      includeMargin={true}
                    />
                    
                    <p className="text-[8px] text-gray-500 mt-1 truncate max-w-full">{hive.apiaries?.name}</p>
                  </div>
                ))}
            </div>
          ) : (
            // CARD VIEW (Grouped by Apiary)
            <div className="space-y-8">
                {Object.entries(
                    filteredHives
                        .filter(h => selectedHives.length === 0 || selectedHives.includes(h.id))
                        .reduce((acc, hive) => {
                            const apiaryName = hive.apiaries?.name || 'Ingen Bigård';
                            if (!acc[apiaryName]) acc[apiaryName] = [];
                            acc[apiaryName].push(hive);
                            return acc;
                        }, {} as {[key: string]: any[]})
                ).map(([apiaryName, hives]) => {
                    const apiaryHives = hives as any[];
                    const activeHives = apiaryHives.filter(h => h.active !== false).length;
                    const inactiveHives = apiaryHives.length - activeHives;

                    return (
                        <div key={apiaryName} className="mb-12">
                            {/* Apiary Header / Summary */}
                            <div className="border-b-4 border-black pb-4 mb-8 break-before-page">
                                <h2 className="text-4xl font-bold uppercase">{apiaryName}</h2>
                                <div className="flex gap-8 mt-2 text-xl">
                                    <div><strong>Antall kuber:</strong> {apiaryHives.length}</div>
                                    <div><strong>Aktive:</strong> {activeHives}</div>
                                    <div><strong>Inaktive:</strong> {inactiveHives}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                                {apiaryHives.map(hive => {
                                    const hiveInspections = printData[hive.id]?.inspections || [];
                                    const hiveLogs = printData[hive.id]?.logs || [];
                                    const lastInsp = hiveInspections[0];

                                    return (
                                        <div key={hive.id} className="break-inside-avoid border-2 border-black rounded-xl p-6 page-break-auto relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-4">
                                                <div>
                                                    <h2 className="text-3xl font-bold mb-1">{hive.hive_number}</h2>
                                                    <p className="text-xl">{hive.name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold uppercase">{hive.type || 'PRODUKSJON'}</div>
                                                    <div className="text-gray-600">{hive.apiaries?.name}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-6">
                                                <div className="flex-1">
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <h3 className="font-bold border-b border-gray-400 mb-1 text-sm">STATUS</h3>
                                                            <div className="text-base">
                                                                {getStatusText(hive)} 
                                                                <span className="text-xs text-gray-500 ml-2">({hive.active === false ? 'Inaktiv' : 'Aktiv'})</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div>
                                                            <h3 className="font-bold border-b border-gray-400 mb-1 text-sm">SISTE INSPEKSJON</h3>
                                                            <div className="text-base">{hive.last_inspection_date || 'Aldri'}</div>
                                                        </div>
                                                    </div>

                                                    {/* Inspection History Table */}
                                    {printOptions.includeHistory && (
                                        <div className="mb-4">
                                            <h3 className="font-bold border-b border-black mb-1 text-sm">INSPEKSJONSHISTORIKK</h3>
                                            {hiveInspections.length > 0 ? (
                                                <table className="w-full text-xs text-left">
                                                    <thead>
                                                        <tr className="border-b border-gray-400">
                                                            <th className="py-1 w-20">Dato</th>
                                                            <th className="py-1 w-20">Status</th>
                                                            <th className="py-1">Notater</th>
                                                            <th className="py-1 w-24">Detaljer</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {hiveInspections
                                                            .filter((insp: any) => {
                                                                if (printOptions.inspectionLimit === 'all') return true;
                                                                if (printOptions.inspectionLimit === 'dateRange') {
                                                                     // If no dates selected, show all
                                                                     if (!printOptions.dateRange.start && !printOptions.dateRange.end) return true;
                                                                     
                                                                     const date = new Date(insp.inspection_date);
                                                                     const start = printOptions.dateRange.start ? new Date(printOptions.dateRange.start) : new Date(0);
                                                                     // Set end date to end of day
                                                                     const end = printOptions.dateRange.end ? new Date(printOptions.dateRange.end) : new Date(8640000000000000);
                                                                     if (printOptions.dateRange.end) end.setHours(23, 59, 59, 999);
                                                                     
                                                                     return date >= start && date <= end;
                                                                }
                                                                return true; // For last5, we slice next
                                                            })
                                                            .slice(0, printOptions.inspectionLimit === 'last5' ? 5 : undefined)
                                                            .map((insp: any) => (
                                                            <tr key={insp.id} className="border-b border-gray-200">
                                                                <td className="py-1 align-top">{new Date(insp.inspection_date).toLocaleDateString()}</td>
                                                                <td className="py-1 align-top">{insp.status}</td>
                                                                <td className="py-1 align-top italic text-gray-600 line-clamp-1">{insp.notes || '-'}</td>
                                                                <td className="py-1 align-top text-[10px]">
                                                                    {insp.queen_seen && <span className="mr-1">👑</span>}
                                                                    {insp.eggs_seen && <span className="mr-1">🥚</span>}
                                                                    {insp.honey_stores && <span className="mr-1">🍯 {insp.honey_stores}</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                                </table>
                                                            ) : (
                                                                <p className="text-gray-500 italic text-xs">Ingen inspeksjoner.</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Logs */}
                                                    {printOptions.includeLogs && (
                                                        <div className="mb-4">
                                                            <h3 className="font-bold border-b border-black mb-1 text-sm">LOGG</h3>
                                                            {hiveLogs.length > 0 ? (
                                                                <ul className="text-xs space-y-1">
                                                                    {hiveLogs.slice(0, 3).map((log: any) => (
                                                                        <li key={log.id} className="flex gap-2">
                                                                            <span className="font-mono text-gray-500 w-20 flex-shrink-0">
                                                                                {new Date(log.created_at).toLocaleDateString()}
                                                                            </span>
                                                                            <span className="font-bold uppercase w-16 flex-shrink-0 mt-0.5">{log.action}</span>
                                                                            <span className="text-gray-700 line-clamp-1">{log.details}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-gray-500 italic text-xs">Ingen loggføringer.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Manual Notes Area */}
                                                    {printOptions.includeNotes && (
                                                        <div className="mt-2 border-t border-black pt-2 break-inside-avoid">
                                                            <h3 className="font-bold mb-1 text-xs">NOTATER:</h3>
                                                            <div className="min-h-[4rem] p-2 border border-gray-300 rounded bg-gray-50 text-sm whitespace-pre-wrap">
                                                                {lastInsp?.notes || ''}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Image Column */}
                                                {printOptions.includeImages && lastInsp?.image_url && (
                                                    <div className="w-1/3 flex flex-col gap-2">
                                                        <div className="font-bold border-b border-gray-400 mb-1 text-sm">SISTE BILDE</div>
                                                        <div className="rounded-lg border border-gray-300 overflow-hidden bg-gray-100">
                                                            <img 
                                                                src={lastInsp.image_url} 
                                                                alt="Siste inspeksjon" 
                                                                className="w-full h-48 object-cover"
                                                            />
                                                        </div>
                                                        <div className="text-xs text-gray-500 italic text-center">
                                                            {new Date(lastInsp.inspection_date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
          )}
        </div>
      )}

      {/* Screen Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 print:hidden">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">Alle Bikuber</h1>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Søk på nummer, lokasjon, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-honey-500 outline-none transition-all"
          />
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
        </div>

        {/* Action Menu */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {isSelectionMode ? (
                <>
                    <button 
                        onClick={() => {
                            if (selectedHives.length === filteredHives.length) {
                                setSelectedHives([]);
                            } else {
                                setSelectedHives(filteredHives.map(h => h.id));
                            }
                        }}
                        className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors whitespace-nowrap"
                    >
                        {selectedHives.length === filteredHives.length ? 'Velg ingen' : 'Velg alle'}
                    </button>
                    <button 
                        onClick={() => {
                            handlePrint('list');
                        }}
                        className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                    >
                        Liste
                    </button>
                    <button 
                        onClick={() => {
                            handlePrint('cards');
                        }}
                        className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                    >
                        Kort
                    </button>
                    <button 
                            onClick={() => {
                                handlePrint('qr');
                            }}
                            className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                        >
                            QR-Koder
                        </button>
                        <button 
                            onClick={() => setIsMassActionModalOpen(true)}
                            className="bg-honey-500 hover:bg-honey-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                        >
                            Registrer Hendelse
                        </button>
                        <button 
                            onClick={() => {
                                setIsSelectionMode(false);
                                setSelectedHives([]);
                            }}
                        className="text-gray-500 px-3 py-1.5 whitespace-nowrap"
                    >
                        Avbryt
                    </button>
                </>
            ) : (
                profile?.role !== 'tenant' && (
                <button 
                    onClick={() => setIsSelectionMode(true)}
                    className="bg-honey-100 text-honey-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 w-full justify-center"
                >
                    <Printer className="w-4 h-4" />
                    Velg / Skriv ut
                </button>
                )
            )}
        </div>
      </div>

      <main className="p-4 space-y-4 print:hidden">
        <div className="flex justify-between items-center text-sm text-gray-500 px-1">
          <span>
            {isSelectionMode 
                ? `${selectedHives.length} valgt av ${filteredHives.length}`
                : `${filteredHives.length} bikuber funnet`
            }
          </span>
          {!isSelectionMode && (
            <button className="flex items-center gap-1 text-honey-600 font-medium">
                <Filter className="w-4 h-4" />
                Filtrer
            </button>
          )}
        </div>

        {filteredHives.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Ingen bikuber funnet som matcher søket.</p>
          </div>
        ) : (
          filteredHives.map((hive) => (
            <div key={hive.id} className="relative group">
                {isSelectionMode && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
                        <input 
                            type="checkbox" 
                            checked={selectedHives.includes(hive.id)}
                            onChange={() => toggleSelection(hive.id)}
                            className="w-6 h-6 rounded border-gray-300 text-honey-600 focus:ring-honey-500"
                        />
                    </div>
                )}
                
                <Link href={isSelectionMode ? '#' : `/hives/${hive.id}`} onClick={(e) => isSelectionMode && e.preventDefault()}>
                <div 
                    onClick={() => isSelectionMode && toggleSelection(hive.id)}
                    className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all cursor-pointer ${
                        isSelectionMode ? 'pl-14' : ''
                    } ${
                        selectedHives.includes(hive.id) ? 'border-honey-500 ring-1 ring-honey-500' : 'hover:border-honey-500'
                    }`}
                >
                    <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-lg shrink-0 ${
                            hive.active === false ? 'bg-gray-100 text-gray-400' : 'bg-honey-50 text-honey-600'
                        }`}>
                        {hive.hive_number}
                        </div>
                        <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold transition-colors truncate ${
                                hive.active === false ? 'text-gray-500' : 'text-gray-900 group-hover:text-honey-600'
                            }`}>
                                {hive.name || `Kube ${hive.hive_number}`}
                            </h3>
                            {/* Type Indicator */}
                            {hive.type === 'AVLEGGER' && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0">
                                    Avlegger
                                </span>
                            )}
                             {hive.type === 'PRODUKSJON' && (
                                <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shrink-0">
                                    PROD
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{hive.apiaries?.name || 'Ingen lokasjon'}</span>
                        </div>
                        </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(hive)}`}>
                        {getStatusText(hive)}
                    </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Sist inspisert: {hive.last_inspection_date || 'Aldri'}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-honey-500" />
                    </div>
                </div>
                </Link>
            </div>
          ))
        )}
      </main>
      {/* Print Options Modal */}
      {isPrintOptionsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4">Utskriftsvalg</h3>
                <div className="space-y-3 mb-6">
                    <div className="border rounded-lg overflow-hidden">
                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={printOptions.includeHistory}
                                onChange={e => setPrintOptions({...printOptions, includeHistory: e.target.checked})}
                                className="w-5 h-5 text-honey-600 rounded"
                            />
                            <div className="flex-1">
                                <div className="font-bold">Inspeksjonshistorikk</div>
                            </div>
                        </label>
                        
                        {printOptions.includeHistory && (
                            <div className="p-3 bg-gray-50 border-t space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="inspectionLimit"
                                        value="last5"
                                        checked={printOptions.inspectionLimit === 'last5'}
                                        onChange={() => setPrintOptions({...printOptions, inspectionLimit: 'last5'})}
                                        className="text-honey-600 focus:ring-honey-500"
                                    />
                                    <span className="text-sm">Siste 5 inspeksjoner</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="inspectionLimit"
                                        value="all"
                                        checked={printOptions.inspectionLimit === 'all'}
                                        onChange={() => setPrintOptions({...printOptions, inspectionLimit: 'all'})}
                                        className="text-honey-600 focus:ring-honey-500"
                                    />
                                    <span className="text-sm">Alle inspeksjoner</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="inspectionLimit"
                                        value="dateRange"
                                        checked={printOptions.inspectionLimit === 'dateRange'}
                                        onChange={() => setPrintOptions({...printOptions, inspectionLimit: 'dateRange'})}
                                        className="text-honey-600 focus:ring-honey-500"
                                    />
                                    <span className="text-sm">Velg periode</span>
                                </label>

                                {printOptions.inspectionLimit === 'dateRange' && (
                                    <div className="flex gap-2 mt-2">
                                        <input 
                                            type="date" 
                                            value={printOptions.dateRange.start}
                                            onChange={e => setPrintOptions({...printOptions, dateRange: {...printOptions.dateRange, start: e.target.value}})}
                                            className="w-full p-1 text-sm border rounded"
                                        />
                                        <span className="self-center">-</span>
                                        <input 
                                            type="date" 
                                            value={printOptions.dateRange.end}
                                            onChange={e => setPrintOptions({...printOptions, dateRange: {...printOptions.dateRange, end: e.target.value}})}
                                            className="w-full p-1 text-sm border rounded"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={printOptions.includeLogs}
                            onChange={e => setPrintOptions({...printOptions, includeLogs: e.target.checked})}
                            className="w-5 h-5 text-honey-600 rounded"
                        />
                        <div className="flex-1">
                            <div className="font-bold">Logg</div>
                            <div className="text-xs text-gray-500">Siste 3 hendelser</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={printOptions.includeImages}
                            onChange={e => setPrintOptions({...printOptions, includeImages: e.target.checked})}
                            className="w-5 h-5 text-honey-600 rounded"
                        />
                        <div className="flex-1">
                            <div className="font-bold">Bilder</div>
                            <div className="text-xs text-gray-500">Bilde fra siste inspeksjon</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={printOptions.includeNotes}
                            onChange={e => setPrintOptions({...printOptions, includeNotes: e.target.checked})}
                            className="w-5 h-5 text-honey-600 rounded"
                        />
                        <div className="flex-1">
                            <div className="font-bold">Notatfelt</div>
                            <div className="text-xs text-gray-500">Tomt felt for manuelle notater</div>
                        </div>
                    </label>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsPrintOptionsOpen(false)}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg"
                    >
                        Avbryt
                    </button>
                    <button
                        onClick={() => {
                            setIsPrintOptionsOpen(false);
                            handlePrint('cards', true);
                        }}
                        className="flex-1 py-2 bg-honey-500 hover:bg-honey-600 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Skriv ut
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Mass Action Modal */}
      {isMassActionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Massehandling ({selectedHives.length} kuber)</h3>
            
            {!massActionType ? (
                <div className="space-y-3">
                    <p className="text-gray-600 mb-4">Hva vil du registrere for disse kubene?</p>
                    <button
                        onClick={() => setMassActionType('inspeksjon')}
                        className="w-full p-4 rounded-lg border border-gray-200 hover:border-honey-500 hover:bg-honey-50 flex items-center gap-3 transition-colors text-left"
                    >
                        <Calendar className="w-6 h-6 text-honey-500" />
                        <div>
                            <div className="font-bold text-gray-900">Inspeksjon</div>
                            <div className="text-sm text-gray-500">Registrer samme inspeksjon på alle</div>
                        </div>
                    </button>
                    <button
                        onClick={() => setMassActionType('logg')}
                        className="w-full p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 flex items-center gap-3 transition-colors text-left"
                    >
                        <Box className="w-6 h-6 text-blue-500" />
                        <div>
                            <div className="font-bold text-gray-900">Logghendelse</div>
                            <div className="text-sm text-gray-500">F.eks. fôring eller behandling</div>
                        </div>
                    </button>
                </div>
            ) : massActionType === 'inspeksjon' ? (
                <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                         <label className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
                            <input 
                                type="checkbox" 
                                checked={massInspectionData.queen_seen}
                                onChange={e => setMassInspectionData({...massInspectionData, queen_seen: e.target.checked})}
                                className="w-4 h-4 text-honey-600"
                            />
                            <span>Dronning sett</span>
                        </label>
                        <label className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
                            <input 
                                type="checkbox" 
                                checked={massInspectionData.eggs_seen}
                                onChange={e => setMassInspectionData({...massInspectionData, eggs_seen: e.target.checked})}
                                className="w-4 h-4 text-honey-600"
                            />
                            <span>Egg sett</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Fôrstatus</label>
                        <select 
                            value={massInspectionData.honey_stores}
                            onChange={e => setMassInspectionData({...massInspectionData, honey_stores: e.target.value})}
                            className="w-full p-2 border rounded-lg"
                        >
                            <option value="lite">Lite</option>
                            <option value="middels">Middels</option>
                            <option value="mye">Mye</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notater (gjelder alle)</label>
                        <textarea
                            value={massInspectionData.notes}
                            onChange={e => setMassInspectionData({...massInspectionData, notes: e.target.value})}
                            className="w-full p-2 border rounded-lg h-24"
                            placeholder="Skriv notat..."
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium mb-1">Handling</label>
                        <select 
                            value={massLogData.action}
                            onChange={e => setMassLogData({...massLogData, action: e.target.value})}
                            className="w-full p-2 border rounded-lg"
                        >
                            <option value="BEHANDLING">Behandling (f.eks. Varroa)</option>
                            <option value="FÔRING">Fôring</option>
                            <option value="ANNET">Annet</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Detaljer</label>
                        <textarea
                            value={massLogData.details}
                            onChange={e => setMassLogData({...massLogData, details: e.target.value})}
                            className="w-full p-2 border rounded-lg h-24"
                            placeholder="Beskriv hva som ble gjort..."
                        />
                    </div>
                </div>
            )}

            <div className="flex gap-3 mt-6">
                <button
                    onClick={() => {
                        if (massActionType) setMassActionType(null);
                        else setIsMassActionModalOpen(false);
                    }}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg"
                >
                    {massActionType ? 'Tilbake' : 'Avbryt'}
                </button>
                {massActionType && (
                    <button
                        onClick={handleMassActionSubmit}
                        disabled={isSubmittingMassAction}
                        className="flex-1 py-3 px-4 bg-honey-500 hover:bg-honey-600 text-white font-bold rounded-lg disabled:opacity-50"
                    >
                        {isSubmittingMassAction ? 'Lagrer...' : 'Bekreft'}
                    </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
