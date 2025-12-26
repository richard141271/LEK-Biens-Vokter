'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Droplets, MapPin, Scale, TrendingUp, DollarSign, Search } from 'lucide-react';
import { HoneyListing } from '@/types/honey-exchange';

// Mock data for fallback
const MOCK_LISTINGS: HoneyListing[] = [
  {
    id: '1',
    seller_id: 'user1',
    honey_type: 'Lynghonning',
    amount_kg: 50,
    price_per_kg: 150,
    moisture_percentage: 17.5,
    production_year: 2024,
    location: 'Halden',
    description: 'Ekte norsk lynghonning fra indre Østfold. Fantastisk smak!',
    status: 'active',
    created_at: new Date().toISOString(),
    seller_name: 'Ole Brum',
    seller_city: 'Halden'
  },
  {
    id: '2',
    seller_id: 'user2',
    honey_type: 'Sommerhonning',
    amount_kg: 120,
    price_per_kg: 90,
    moisture_percentage: 16.8,
    production_year: 2024,
    location: 'Fredrikstad',
    description: 'Mild og fin sommerhonning. Perfekt for videresalg.',
    status: 'active',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    seller_name: 'Nasse Nøff',
    seller_city: 'Fredrikstad'
  }
];

export default function HoneyExchangePage() {
  const [listings, setListings] = useState<HoneyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      // Try to fetch from Supabase
      const { data, error } = await supabase
        .from('honey_listings')
        .select(`
          *,
          profiles:seller_id (full_name, city)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedListings = data.map((item: any) => ({
          ...item,
          seller_name: item.profiles?.full_name || 'Ukjent selger',
          seller_city: item.profiles?.city || 'Ukjent sted'
        }));
        setListings(formattedListings);
      }
    } catch (err) {
      console.log('Using mock data due to missing tables or error:', err);
      setListings(MOCK_LISTINGS);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(l => 
    l.honey_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-honey-500 text-white pt-12 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 L50 100 L100 0 Z" fill="white" />
            </svg>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake
          </button>
          
          <h1 className="text-4xl font-bold mb-2">LEK-Honning™️ Børsen</h1>
          <p className="text-honey-100 text-lg max-w-xl">
            Markedsplassen for kjøp og salg av honning i bulk. 
            Direkte fra birøkter til birøkter/oppkjøper.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-20">
        
        {/* Actions & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-honey-100 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Gjennomsnittspris</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">128,-</p>
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
              <TrendingUp className="w-4 h-4" />
              <span>+12% siste mnd</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-honey-100 flex flex-col justify-between">
             <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Tilgjengelig nå</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {listings.reduce((acc, curr) => acc + curr.amount_kg, 0)} kg
              </p>
            </div>
             <div className="flex items-center gap-1 text-honey-600 text-sm mt-2">
              <Droplets className="w-4 h-4" />
              <span>Fordelt på {listings.length} partier</span>
            </div>
          </div>

          <button 
            onClick={() => router.push('/honey-exchange/sell')}
            className="bg-black text-white p-6 rounded-2xl shadow-lg hover:bg-gray-800 transition-all transform hover:scale-[1.02] flex flex-col items-center justify-center gap-3 text-center"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6" />
            </div>
            <div>
                <span className="block font-bold text-lg">Selg Honning</span>
                <span className="text-white/60 text-sm">Legg ut parti for salg</span>
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            type="text"
            placeholder="Søk etter honningtype eller sted..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-700 placeholder-gray-400"
          />
        </div>

        {/* Listings */}
        <div className="space-y-4">
          <h2 className="font-bold text-gray-900 text-lg">Siste partier på børsen</h2>
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">Laster honningbørsen...</div>
          ) : filteredListings.length > 0 ? (
            filteredListings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-honey-300 transition-colors group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-honey-100 text-honey-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                        {listing.honey_type}
                      </span>
                      <span className="text-gray-400 text-xs">•</span>
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {listing.seller_city || listing.location}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-gray-900 text-xl mb-1">
                      {listing.amount_kg} kg <span className="text-gray-400 font-normal">tilgjengelig</span>
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        <span>{listing.moisture_percentage}% fukt</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Scale className="w-4 h-4 text-gray-400" />
                        <span>Min. kjøp: 20 kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & Action */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 md:gap-2 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase font-bold">Pris pr kg</p>
                      <p className="text-2xl font-bold text-honey-600">{listing.price_per_kg},-</p>
                    </div>
                    
                    <button 
                        onClick={() => router.push(`/honey-exchange/${listing.id}`)}
                        className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                        <DollarSign className="w-4 h-4" />
                        Gi Bud / Kjøp
                    </button>
                  </div>

                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Ingen honning funnet på børsen enda.</p>
                <button 
                    onClick={() => router.push('/honey-exchange/sell')}
                    className="mt-4 text-honey-600 font-bold hover:underline"
                >
                    Bli den første til å selge!
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
