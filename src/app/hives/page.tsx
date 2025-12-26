'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Box, MapPin, Calendar, ArrowRight, Printer } from 'lucide-react';
import Link from 'next/link';

export default function AllHivesPage() {
  const [hives, setHives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Print State
  const [selectedHives, setSelectedHives] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [printLayout, setPrintLayout] = useState<'cards' | 'list' | null>(null);
  const [printData, setPrintData] = useState<{ [key: string]: { inspections: any[], logs: any[] } }>({});
  const [loadingPrintData, setLoadingPrintData] = useState(false);

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

    // Fetch all hives with apiary info
    const { data, error } = await supabase
      .from('hives')
      .select('*, apiaries(name, location)')
      .order('hive_number', { ascending: true });

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

    return hiveNum.includes(term) || 
           apiaryName.includes(term) || 
           apiaryLoc.includes(term) || 
           status.includes(term);
  });

  const toggleSelection = (id: string) => {
    setSelectedHives(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = async (layout: 'cards' | 'list') => {
    setLoadingPrintData(true);
    
    // Determine which hives to print
    const hivesToPrint = hives
        .filter(h => filteredHives.includes(h)) // Only search results
        .filter(h => selectedHives.length === 0 || selectedHives.includes(h.id));

    const hiveIds = hivesToPrint.map(h => h.id);

    if (hiveIds.length > 0) {
        // Fetch inspections
        const { data: inspections } = await supabase
            .from('inspections')
            .select('*')
            .in('hive_id', hiveIds)
            .order('inspection_date', { ascending: false });

        // Fetch logs
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

  const getStatusColor = (hive: any) => {
    if (hive.active === false) return 'bg-gray-100 text-gray-500 border-gray-200';
    
    switch (hive.status) {
      case 'DØD': return 'bg-red-100 text-red-800 border-red-200';
      case 'SVAK': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'AKTIV': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-green-100 text-green-800 border-green-200'; // Default to active green
    }
  };

  const getStatusText = (hive: any) => {
    if (hive.active === false) return 'INAKTIV';
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
          ) : (
            // CARD VIEW (One per page/Grid)
            <div className="space-y-8">
                {filteredHives
                  .filter(h => selectedHives.length === 0 || selectedHives.includes(h.id))
                  .map(hive => {
                    const hiveInspections = printData[hive.id]?.inspections || [];
                    const hiveLogs = printData[hive.id]?.logs || [];
                    return (
                    <div key={hive.id} className="break-inside-avoid border-2 border-black rounded-xl p-6 mb-8 page-break-auto">
                        <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                            <div>
                                <h2 className="text-3xl font-bold mb-1">{hive.hive_number}</h2>
                                <p className="text-xl">{hive.name}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold uppercase">{hive.type || 'PRODUKSJON'}</div>
                                <div className="text-gray-600">{hive.apiaries?.name}</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8 mb-6">
                            <div>
                                <h3 className="font-bold border-b border-gray-400 mb-2">STATUS</h3>
                                <div className="text-lg mb-4">
                                    {getStatusText(hive)} 
                                    <span className="text-sm text-gray-500 ml-2">({hive.active === false ? 'Inaktiv' : 'Aktiv'})</span>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="font-bold border-b border-gray-400 mb-2">SISTE INSPEKSJON</h3>
                                <div className="text-lg mb-4">{hive.last_inspection_date || 'Aldri'}</div>
                            </div>
                        </div>

                        {/* Inspection History Table */}
                        <div className="mb-6">
                            <h3 className="font-bold border-b border-black mb-2">INSPEKSJONSHISTORIKK</h3>
                            {hiveInspections.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-gray-400">
                                            <th className="py-1 w-24">Dato</th>
                                            <th className="py-1 w-24">Status</th>
                                            <th className="py-1">Notater / Observasjoner</th>
                                            <th className="py-1 w-32">Detaljer</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hiveInspections.slice(0, 10).map((insp: any) => (
                                            <tr key={insp.id} className="border-b border-gray-200">
                                                <td className="py-1 align-top">{new Date(insp.inspection_date).toLocaleDateString()}</td>
                                                <td className="py-1 align-top">{insp.status}</td>
                                                <td className="py-1 align-top italic text-gray-600">{insp.notes || '-'}</td>
                                                <td className="py-1 align-top text-xs">
                                                    {insp.queen_seen && <span className="mr-1">👑</span>}
                                                    {insp.eggs_seen && <span className="mr-1">🥚</span>}
                                                    {insp.honey_stores && <span className="mr-1">🍯 {insp.honey_stores}</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-gray-500 italic">Ingen inspeksjoner registrert.</p>
                            )}
                        </div>

                        {/* Logs */}
                        <div className="mb-6">
                            <h3 className="font-bold border-b border-black mb-2">LOGG</h3>
                            {hiveLogs.length > 0 ? (
                                <ul className="text-sm space-y-1">
                                    {hiveLogs.slice(0, 5).map((log: any) => (
                                        <li key={log.id} className="flex gap-2">
                                            <span className="font-mono text-gray-500 w-24 flex-shrink-0">
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="font-bold uppercase w-20 flex-shrink-0 text-xs mt-0.5">{log.action}</span>
                                            <span className="text-gray-700">{log.details}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic">Ingen loggføringer.</p>
                            )}
                        </div>

                        <div className="mt-4 border-t-2 border-black pt-4 break-inside-avoid">
                            <h3 className="font-bold mb-2">NYE NOTATER:</h3>
                            <div className="h-24 border border-gray-300 rounded bg-gray-50"></div>
                        </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Screen Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10 print:hidden">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">Alle Bikuber</h1>
            <div className="flex gap-2">
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
                            className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                        >
                            {selectedHives.length === filteredHives.length ? 'Velg ingen' : 'Velg alle'}
                        </button>
                        <button 
                            onClick={() => {
                                handlePrint('list');
                            }}
                            className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                        >
                            Liste
                        </button>
                        <button 
                            onClick={() => {
                                handlePrint('cards');
                            }}
                            className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                        >
                            Kort
                        </button>
                        <button 
                            onClick={() => {
                                setIsSelectionMode(false);
                                setSelectedHives([]);
                                setPrintLayout(null);
                            }}
                            className="text-gray-500 px-3 py-1.5"
                        >
                            Avbryt
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={() => setIsSelectionMode(true)}
                        className="bg-honey-100 text-honey-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                    >
                        <Printer className="w-4 h-4" />
                        Utskrift
                    </button>
                )}
            </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Søk på nummer, lokasjon, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-honey-500 outline-none transition-all"
          />
          <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
        </div>
      </header>

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
    </div>
  );
}
