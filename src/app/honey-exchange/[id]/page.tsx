'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Droplets, Calendar, Scale, ShieldCheck, User, CheckCircle } from 'lucide-react';
import { HoneyListing } from '@/types/honey-exchange';

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<HoneyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (id) fetchListing(id as string);
  }, [id]);

  const fetchListing = async (listingId: string) => {
    try {
        // First try to fetch real data
        const { data, error } = await supabase
            .from('honey_listings')
            .select(`*, profiles:seller_id (full_name, city, phone_number)`)
            .eq('id', listingId)
            .single();
            
        if (data) {
             setListing({
                ...data,
                seller_name: data.profiles?.full_name || 'Ukjent',
                seller_city: data.profiles?.city || 'Ukjent'
            });
        } else {
            // If not found in DB, check if it's our mock data
            // (In a real app, this fallback wouldn't be here, but useful for demo if DB is empty)
             if (listingId === '1' || listingId === '2') {
                 // Re-use mock data from main page (simplified)
                 const mock = {
                    id: listingId,
                    seller_id: 'mock',
                    honey_type: listingId === '1' ? 'Lynghonning' : 'Sommerhonning',
                    amount_kg: listingId === '1' ? 50 : 120,
                    price_per_kg: listingId === '1' ? 150 : 90,
                    moisture_percentage: 17.5,
                    production_year: 2024,
                    location: 'Halden',
                    description: 'Mock data description...',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    seller_name: 'Mock Selger',
                    seller_city: 'Mock By'
                 } as HoneyListing;
                 setListing(mock);
             }
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!listing) return;
    setBuying(true);
    
    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSuccess(true);
    setBuying(false);
    
    // Here we would generate PDF, update DB status, etc.
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;
  if (!listing) return <div className="p-8 text-center">Fant ikke annonsen.</div>;

  if (success) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Handel Gjennomført!</h2>
                <p className="text-gray-600">
                    Gratulerer! Du har kjøpt <strong>{listing.amount_kg} kg {listing.honey_type}</strong>.
                </p>
                <div className="bg-gray-50 p-4 rounded-xl text-left text-sm space-y-2">
                    <p><strong>Selger:</strong> {listing.seller_name}</p>
                    <p><strong>Sum å betale:</strong> {(listing.amount_kg * listing.price_per_kg).toLocaleString()},-</p>
                    <p className="text-xs text-gray-500 mt-2">Faktura og fraktdokumenter (PDF) er sendt til din e-post.</p>
                </div>
                <button 
                    onClick={() => router.push('/honey-exchange')}
                    className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800"
                >
                    Tilbake til Børsen
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
       {/* Header Image / Pattern */}
       <div className="h-64 bg-honey-600 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/honeycomb.png')]"></div>
            <div className="absolute top-6 left-4">
                <button 
                    onClick={() => router.back()}
                    className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full hover:bg-white/30 transition-colors flex items-center gap-2 font-bold text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Tilbake
                </button>
            </div>
       </div>

       <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-10">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
                        <div>
                            <span className="bg-honey-100 text-honey-800 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-4 inline-block">
                                {listing.honey_type}
                            </span>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                {listing.amount_kg} kg parti
                            </h1>
                            <div className="flex items-center gap-2 text-gray-500 mb-6">
                                <MapPin className="w-4 h-4" />
                                {listing.seller_city || listing.location}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-500 uppercase">Totalpris</p>
                            <p className="text-4xl font-bold text-honey-600">
                                {(listing.amount_kg * listing.price_per_kg).toLocaleString()},-
                            </p>
                            <p className="text-sm text-gray-400">eks. mva</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-t border-b border-gray-100 my-8">
                        <div>
                            <div className="flex items-center gap-2 text-gray-400 mb-1">
                                <Scale className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Mengde</span>
                            </div>
                            <p className="font-bold text-lg">{listing.amount_kg} kg</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-gray-400 mb-1">
                                <Droplets className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Fuktighet</span>
                            </div>
                            <p className="font-bold text-lg">{listing.moisture_percentage}%</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-gray-400 mb-1">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Årstall</span>
                            </div>
                            <p className="font-bold text-lg">{listing.production_year}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-gray-400 mb-1">
                                <User className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Selger</span>
                            </div>
                            <p className="font-bold text-lg truncate">{listing.seller_name}</p>
                        </div>
                    </div>

                    <div className="prose prose-honey max-w-none mb-12">
                        <h3 className="font-bold text-gray-900">Beskrivelse fra selger</h3>
                        <p className="text-gray-600 leading-relaxed">
                            {listing.description || 'Ingen beskrivelse lagt til.'}
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Trygg Handel med LEK-Garanti™</p>
                                <p className="text-sm text-gray-500">Beløpet holdes på klientkonto til varen er mottatt.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleBuy}
                            disabled={buying}
                            className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {buying ? 'Behandler...' : 'Kjøp Honning Nå'}
                        </button>
                    </div>

                </div>
            </div>
       </div>
    </div>
  );
}
