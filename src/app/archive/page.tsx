'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Archive, AlertCircle, ArrowRight, Calendar } from 'lucide-react';

export default function ArchivePage() {
  const [hives, setHives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchArchivedHives();
  }, []);

  const fetchArchivedHives = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch ONLY inactive hives
    const { data, error } = await supabase
      .from('hives')
      .select('*, apiaries(name)')
      .eq('user_id', user.id)
      .eq('active', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching archived hives:', error);
    } else {
      setHives(data || []);
    }
    setLoading(false);
  };

  const filteredHives = hives.filter(hive => 
    hive.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hive.hive_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (hive.status && hive.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string, reason: string) => {
    if (status === 'SOLGT') {
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200">SOLGT</span>;
    }
    if (status === 'DESTRUERT') {
        if (reason === 'SYKDOM') {
            return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200">SYKDOM</span>;
        }
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold border border-gray-200">DESTRUERT</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs border border-gray-200">{status || 'ARKIVERT'}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                <Archive className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900">Arkiv & Historikk</h1>
                <p className="text-sm text-gray-500">Oversikt over inaktive kuber</p>
            </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Søk i arkivet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-honey-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Laster arkiv...</div>
        ) : filteredHives.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Arkivet er tomt</h3>
            <p className="text-gray-500">Ingen inaktive kuber funnet.</p>
          </div>
        ) : (
          filteredHives.map((hive) => (
            <Link 
              key={hive.id} 
              href={`/hives/${hive.id}`}
              className="block bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-honey-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{hive.name}</h3>
                  <p className="text-xs text-gray-500">#{hive.hive_number}</p>
                </div>
                {getStatusBadge(hive.status, hive.archive_reason)}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{new Date(hive.updated_at).toLocaleDateString()}</span>
                </div>
                {hive.apiaries && (
                    <div className="flex items-center gap-1.5">
                        <Archive className="w-4 h-4 text-gray-400" />
                        <span>Var i: {hive.apiaries.name}</span>
                    </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
