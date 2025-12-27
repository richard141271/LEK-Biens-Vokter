'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Droplets, MapPin, Scale, TrendingUp, DollarSign, Search, Clock, ArrowUpRight, Activity, FileText, ArrowDownRight, Minus, Users, Wallet, ChevronRight, Lock, Unlock, ShieldCheck, Box, Smile, ShoppingBag } from 'lucide-react';
import { HoneyListing } from '@/types/honey-exchange';

// Modules Data
const MODULES = [
  { id: 1, name: 'Biens Vokter', icon: ShieldCheck, desc: 'Digital Bigårdsstyring', status: 'active', link: '/info/biens-vokter' },
  { id: 2, name: 'Honningbørsen', icon: DollarSign, desc: 'Markedsplass for honning', status: 'locked', link: '/info/honningborsen' },
  { id: 3, name: 'Partnernettverk (MLM)', icon: Users, desc: 'Tjen penger på nettverk', status: 'active', link: '/info/partnernettverk' },
  { id: 4, name: 'LEI EN KUBE', icon: Box, desc: 'Utleie til private/bedrifter', status: 'active', link: '/lei-en-kube' },
  { id: 5, name: 'BARNAS birøkter', icon: Smile, desc: 'Kurs og sertifisering for barn', status: 'active', link: '/kids-beekeeper' },
  { id: 6, name: 'Franchise', icon: ShoppingBag, desc: 'Salgsavdeling & Butikkløsning', status: 'active', link: '/franchise' },
];

// Mock data for fallback
const MOCK_LISTINGS: HoneyListing[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    seller_id: '00000000-0000-0000-0000-000000000000',
    honey_type: 'Lynghonning',
    amount_kg: 50,
    remaining_kg: 50,
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
    id: '00000000-0000-0000-0000-000000000002',
    seller_id: '00000000-0000-0000-0000-000000000000',
    honey_type: 'Sommerhonning',
    amount_kg: 120,
    remaining_kg: 120,
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

const MARKET_INDICES = [
    { name: 'Lynghonning', price: '155', change: '+2.5%', trend: 'up' },
    { name: 'Sommerhonning', price: '95', change: '-1.2%', trend: 'down' },
    { name: 'Raps', price: '85', change: '0.0%', trend: 'neutral' },
    { name: 'Skogshonning', price: '130', change: '+5.1%', trend: 'up' },
];

const RECENT_ACTIVITY = [
    { type: 'buy', text: 'Ola B. kjøpte 40kg Lynghonning', time: '2 min siden' },
    { type: 'list', text: 'Nytt parti: 200kg Sommerhonning', time: '15 min siden' },
    { type: 'buy', text: 'Kari N. kjøpte 60kg Raps', time: '1 time siden' },
];

export default function HoneyExchangePage() {
  const [listings, setListings] = useState<HoneyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchListings();
  }, []);

  const handleUnlock = () => {
    if (accessCode.toUpperCase() === 'BIE' || accessCode === '1234') {
        setIsUnlocked(true);
    } else {
        alert('Feil tilgangskode. Prøv "BIE"');
    }
  };

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
          remaining_kg: item.remaining_kg ?? item.amount_kg, // Fallback
          seller_name: item.profiles?.full_name || 'Ukjent selger',
          seller_city: item.profiles?.city || 'Ukjent sted'
        }));
        setListings(formattedListings);
      }
    } catch (err: any) {
      console.log('Error fetching listings:', err);
      // setListings(MOCK_LISTINGS); // Disable mock data to avoid confusion
      alert('Kunne ikke laste annonser: ' + err.message);
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
      
      {/* Ticker Tape */}
      <div className="bg-black text-white overflow-hidden whitespace-nowrap py-2 flex items-center gap-8 text-xs font-mono uppercase tracking-widest sticky top-0 z-50 shadow-md">
        <div className="animate-marquee flex gap-8 min-w-full">
            {[...MARKET_INDICES, ...MARKET_INDICES].map((idx, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="text-gray-400">{idx.name}</span>
                    <span className="font-bold">{idx.price} NOK</span>
                    <span className={`flex items-center ${idx.trend === 'up' ? 'text-green-400' : idx.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                        {idx.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : idx.trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {idx.change}
                    </span>
                </div>
            ))}
        </div>
      </div>

      {/* Header */}
      <div className="bg-honey-500 text-white pt-8 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 0 L50 100 L100 0 Z" fill="white" />
            </svg>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => router.push('/settings')}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake til Innstillinger
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                    LEK-Honning™️ Børsen
                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full uppercase tracking-wider font-normal backdrop-blur-sm">Live Marked</span>
                </h1>
                <p className="text-honey-100 text-lg max-w-xl">
                    Markedsplassen for kjøp og salg av honning i bulk. 
                    Direkte fra birøkter til birøkter/oppkjøper.
                </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 hidden md:block">
                <p className="text-xs font-bold uppercase text-honey-100 mb-2 flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    Siste aktivitet
                </p>
                <div className="space-y-2 text-xs">
                    {RECENT_ACTIVITY.map((act, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${act.type === 'buy' ? 'bg-green-400' : 'bg-blue-400'}`}></span>
                            <span className="text-white/90">{act.text}</span>
                            <span className="text-white/50">{act.time}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-20 space-y-8">
        
        {/* MLM & Wallet Buttons (Moved from Settings) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/network')}
              className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-4 group text-left relative overflow-hidden"
            >
              <div className="bg-white/10 p-3 rounded-full group-hover:bg-white/20 transition-colors shrink-0">
                <Users className="w-6 h-6 text-honey-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg leading-tight truncate">Partnernettverk</div>
                <div className="text-gray-400 text-xs truncate">Administrer ditt nettverk</div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors shrink-0" />
            </button>

            <button
              onClick={() => router.push('/wallet')}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 p-5 rounded-xl shadow-lg transition-all flex items-center gap-4 group text-left relative overflow-hidden"
            >
              <div className="bg-honey-100 p-3 rounded-full group-hover:bg-honey-200 transition-colors shrink-0">
                <Wallet className="w-6 h-6 text-honey-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg leading-tight truncate">Min Lommebok</div>
                <div className="text-gray-500 text-xs truncate">Saldo og transaksjoner</div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
            </button>
        </div>

        {/* Modules Grid */}
        <div>
           <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Våre Moduler</h3>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
             {MODULES.map((mod) => (
                <button
                   key={mod.id}
                   onClick={() => router.push(mod.link)}
                   className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${
                   mod.status === 'active' || mod.status === 'locked'
                     ? 'bg-white border-honey-100 shadow-sm hover:shadow-md cursor-pointer hover:bg-gray-50' 
                     : 'bg-gray-50 border-gray-200 opacity-75 grayscale-[0.5]'
                }`}>
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      mod.status === 'active' ? 'bg-honey-100 text-honey-600' : 'bg-gray-200 text-gray-500'
                   }`}>
                      <mod.icon className="w-5 h-5" />
                   </div>
                   <div>
                      <div className="font-bold text-sm text-gray-900">{mod.name}</div>
                      <div className="text-[10px] text-gray-500 leading-tight mt-1">{mod.desc}</div>
                   </div>
                   {mod.status === 'coming' && (
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full mt-1">Kommer snart</span>
                   )}
                </button>
             ))}
          </div>
        </div>

        {/* Locked Marketplace Section */}
        {!isUnlocked ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-honey-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-honey-400 to-honey-600"></div>
                <div className="w-16 h-16 bg-honey-100 rounded-full flex items-center justify-center mx-auto mb-4 text-honey-600">
                    <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Honningbørsen er Låst</h2>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Vi tester for tiden markedet med utvalgte partnere. Vennligst skriv inn din tilgangskode for å se børsen.
                </p>
                <div className="max-w-xs mx-auto flex gap-2">
                    <input 
                        type="text" 
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                        placeholder="Skriv kode..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-honey-500 outline-none uppercase text-center tracking-widest font-mono"
                    />
                    <button 
                        onClick={handleUnlock}
                        className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                        <Unlock className="w-4 h-4" />
                        Lås opp
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-4">Prøv kode: <span className="font-mono">BIE</span></p>
            </div>
        ) : (
            <>
                {/* Actions & Stats (Original) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <button 
                    onClick={() => router.push('/honey-exchange/transactions')}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-honey-100 flex flex-col justify-between hover:border-honey-300 transition-colors group"
                >
                    <div>
                    <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2 group-hover:text-honey-600 transition-colors">
                        <FileText className="w-4 h-4" />
                        Mine Transaksjoner
                    </p>
                    <p className="text-xl font-bold text-gray-900 mt-2">Se ordreoversikt</p>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm mt-4">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Gå til oversikt</span>
                    </div>
                </button>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-honey-100 flex flex-col justify-between">
                    <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Tilgjengelig nå</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                        {listings.reduce((acc, curr) => acc + (curr.remaining_kg || curr.amount_kg), 0)} kg
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
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
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
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    Siste partier på børsen
                </h2>
                
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Laster honningbørsen...</div>
                ) : filteredListings.length > 0 ? (
                    filteredListings.map((listing) => (
                    <div key={listing.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-honey-300 transition-colors group relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        
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
                            {listing.remaining_kg} kg <span className="text-gray-400 font-normal text-base">tilgjengelig</span>
                            </h3>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                                <Droplets className="w-4 h-4 text-blue-400" />
                                <span>{listing.moisture_percentage}% fukt</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Scale className="w-4 h-4 text-gray-400" />
                                <span>Min. kjøp: 1 kg</span>
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
                                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-lg"
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
            </>
        )}
      </div>
    </div>
  );
}
