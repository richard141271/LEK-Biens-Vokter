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

  const handlePrint = (layout: 'cards' | 'list') => {
    setPrintLayout(layout);
    // Use a small timeout to allow state to update and DOM to render before printing
    setTimeout(() => {
      window.print();
      // Optional: Reset after print? No, let user close.
    }, 100);
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2 font-bold">Kube #</th>
                  <th className="py-2 font-bold">Navn</th>
                  <th className="py-2 font-bold">Type</th>
                  <th className="py-2 font-bold">Lokasjon</th>
                  <th className="py-2 font-bold">Status</th>
                  <th className="py-2 font-bold">Sist Inspisert</th>
                  <th className="py-2 font-bold">Notater</th>
                </tr>
              </thead>
              <tbody>
                {filteredHives
                  .filter(h => selectedHives.length === 0 || selectedHives.includes(h.id))
                  .map(hive => (
                  <tr key={hive.id} className="border-b border-gray-300">
                    <td className="py-3 align-top font-mono font-bold">{hive.hive_number}</td>
                    <td className="py-3 align-top">{hive.name}</td>
                    <td className="py-3 align-top capitalize">{hive.type?.toLowerCase() || '-'}</td>
                    <td className="py-3 align-top">
                        <div>{hive.apiaries?.name}</div>
                        <div className="text-xs text-gray-500">{hive.apiaries?.location}</div>
                    </td>
                    <td className="py-3 align-top">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getStatusColor(hive)}`}>
                            {getStatusText(hive)}
                        </span>
                    </td>
                    <td className="py-3 align-top">{hive.last_inspection_date || '-'}</td>
                    <td className="py-3 align-top border border-gray-200 h-16 w-48 bg-gray-50"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // CARD VIEW (One per page/Grid)
            <div className="space-y-8">
                {filteredHives
                  .filter(h => selectedHives.length === 0 || selectedHives.includes(h.id))
                  .map(hive => (
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
                        
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold border-b border-gray-400 mb-2">STATUS</h3>
                                <div className="text-lg mb-4">
                                    {getStatusText(hive)} 
                                    <span className="text-sm text-gray-500 ml-2">({hive.active === false ? 'Inaktiv' : 'Aktiv'})</span>
                                </div>
                                
                                <h3 className="font-bold border-b border-gray-400 mb-2">SISTE INSPEKSJON</h3>
                                <div className="text-lg mb-4">{hive.last_inspection_date || 'Aldri'}</div>
                            </div>
                            
                            <div>
                                <h3 className="font-bold border-b border-gray-400 mb-2">TYPE</h3>
                                <div className="text-lg mb-4 capitalize">{hive.type?.toLowerCase() || 'Produksjon'}</div>
                            </div>
                        </div>

                        <div className="mt-8 border-t-2 border-black pt-4">
                            <h3 className="font-bold mb-2">NOTATER / OBSERVASJONER:</h3>
                            <div className="h-32 border border-gray-300 rounded bg-gray-50"></div>
                        </div>
                    </div>
                ))}
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
                    <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold font-mono text-lg ${
                            hive.active === false ? 'bg-gray-100 text-gray-400' : 'bg-honey-50 text-honey-600'
                        }`}>
                        {hive.hive_number}
                        </div>
                        <div>
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold transition-colors ${
                                hive.active === false ? 'text-gray-500' : 'text-gray-900 group-hover:text-honey-600'
                            }`}>
                                {hive.name || `Kube ${hive.hive_number}`}
                            </h3>
                            {/* Type Indicator */}
                            {hive.type === 'AVLEGGER' && (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                    Avlegger
                                </span>
                            )}
                             {hive.type === 'PRODUKSJON' && (
                                <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                    PROD
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {hive.apiaries?.name || 'Ingen lokasjon'}
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
