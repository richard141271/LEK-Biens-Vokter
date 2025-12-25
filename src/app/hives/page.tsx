'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Box, MapPin, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AllHivesPage() {
  const [hives, setHives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    const status = hive.status?.toLowerCase() || '';

    return hiveNum.includes(term) || 
           apiaryName.includes(term) || 
           apiaryLoc.includes(term) || 
           status.includes(term);
  });

  if (loading) return <div className="p-8 text-center">Laster bikuber...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Alle Bikuber</h1>
        
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

      <main className="p-4 space-y-4">
        <div className="flex justify-between items-center text-sm text-gray-500 px-1">
          <span>{filteredHives.length} bikuber funnet</span>
          <button className="flex items-center gap-1 text-honey-600 font-medium">
            <Filter className="w-4 h-4" />
            Filtrer
          </button>
        </div>

        {filteredHives.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Ingen bikuber funnet som matcher søket.</p>
          </div>
        ) : (
          filteredHives.map((hive) => (
            <Link href={`/hives/${hive.id}`} key={hive.id}>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-honey-500 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-honey-50 text-honey-600 rounded-lg flex items-center justify-center font-bold font-mono text-lg">
                      {hive.hive_number}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-honey-600 transition-colors">{hive.name || `Kube ${hive.hive_number}`}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {hive.apiaries?.name || 'Ingen lokasjon'}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    hive.status === 'AKTIV' ? 'bg-green-100 text-green-700' : 
                    hive.status === 'SVAK' ? 'bg-orange-100 text-orange-700' :
                    hive.status === 'DØD' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {hive.status || 'UKJENT'}
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
          ))
        )}
      </main>
    </div>
  );
}
