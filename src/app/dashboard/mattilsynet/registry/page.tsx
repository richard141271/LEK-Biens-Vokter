'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Search, User, Home, Box, Filter, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RegistryPage() {
  const [activeTab, setActiveTab] = useState<'beekeepers' | 'apiaries' | 'hives'>('beekeepers');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [beekeepers, setBeekeepers] = useState<any[]>([]);
  const [apiaries, setApiaries] = useState<any[]>([]);
  const [hives, setHives] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Beekeepers (Profiles with role 'beekeeper')
      const { data: beekeepersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'beekeeper');
      
      if (beekeepersData) setBeekeepers(beekeepersData);

      // Fetch Apiaries
      const { data: apiariesData } = await supabase
        .from('apiaries')
        .select('*, profiles(full_name, email)');
      
      if (apiariesData) setApiaries(apiariesData);

      // Fetch Hives
      const { data: hivesData } = await supabase
        .from('hives')
        .select('*, apiaries(name, location), profiles(full_name)');
      
      if (hivesData) setHives(hivesData);

    } catch (e) {
      console.error("Error fetching registry:", e);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredBeekeepers = beekeepers.filter(b => 
    b.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.phone_number?.includes(searchQuery)
  );

  const filteredApiaries = apiaries.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.apiary_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHives = hives.filter(h => 
    h.hive_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.apiaries?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard/mattilsynet" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Nasjonalt Bigårdsregister</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between">
            {/* Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg self-start">
              <button
                onClick={() => setActiveTab('beekeepers')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'beekeepers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <User className="w-4 h-4" />
                Birøktere ({filteredBeekeepers.length})
              </button>
              <button
                onClick={() => setActiveTab('apiaries')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'apiaries' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Home className="w-4 h-4" />
                Bigårder ({filteredApiaries.length})
              </button>
              <button
                onClick={() => setActiveTab('hives')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'hives' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Box className="w-4 h-4" />
                Bikuber ({filteredHives.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Søk etter navn, ID, lokasjon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Laster registeret...</div>
        ) : (
          <div className="space-y-4">
            
            {/* BEEKEEPERS VIEW */}
            {activeTab === 'beekeepers' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="p-4 font-medium">Navn</th>
                      <th className="p-4 font-medium">Kontakt</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Medlemskap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBeekeepers.map(beekeeper => (
                      <tr key={beekeeper.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{beekeeper.full_name || 'Ikke navngitt'}</td>
                        <td className="p-4 text-gray-600">
                          <div>{beekeeper.email}</div>
                          <div className="text-xs">{beekeeper.phone_number}</div>
                        </td>
                        <td className="p-4">
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                            AKTIV
                          </span>
                        </td>
                        <td className="p-4 text-gray-500">
                           {beekeeper.is_norges_birokterlag_member && <span className="block">✅ Norges Birøkterlag</span>}
                           {beekeeper.is_lek_honning_member && <span className="block">✅ LEK-Honning</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredBeekeepers.length === 0 && <div className="p-8 text-center text-gray-500">Ingen birøktere funnet.</div>}
              </div>
            )}

            {/* APIARIES VIEW */}
            {activeTab === 'apiaries' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="p-4 font-medium">Bigård ID</th>
                      <th className="p-4 font-medium">Navn</th>
                      <th className="p-4 font-medium">Eier</th>
                      <th className="p-4 font-medium">Lokasjon</th>
                      <th className="p-4 font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredApiaries.map(apiary => (
                      <tr key={apiary.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-mono text-gray-600">{apiary.apiary_number || 'N/A'}</td>
                        <td className="p-4 font-medium text-gray-900">{apiary.name}</td>
                        <td className="p-4 text-gray-600">{apiary.profiles?.full_name}</td>
                        <td className="p-4 text-gray-600">{apiary.location}</td>
                        <td className="p-4">
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs capitalize">
                            {apiary.type || 'Standard'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredApiaries.length === 0 && <div className="p-8 text-center text-gray-500">Ingen bigårder funnet.</div>}
              </div>
            )}

            {/* HIVES VIEW */}
            {activeTab === 'hives' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="p-4 font-medium">Kube ID</th>
                      <th className="p-4 font-medium">Tilhører Bigård</th>
                      <th className="p-4 font-medium">Eier</th>
                      <th className="p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHives.map(hive => (
                      <tr key={hive.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-gray-900">{hive.hive_number}</td>
                        <td className="p-4 text-gray-600">
                          {hive.apiaries?.name} <span className="text-gray-400">({hive.apiaries?.location})</span>
                        </td>
                        <td className="p-4 text-gray-600">{hive.profiles?.full_name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            hive.status === 'aktiv' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {hive.status || 'Ukjent'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredHives.length === 0 && <div className="p-8 text-center text-gray-500">Ingen bikuber funnet.</div>}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
