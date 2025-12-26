'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Droplets, Calendar, Scale, ShieldCheck, User, CheckCircle, Plus, Minus, Info } from 'lucide-react';
import { HoneyListing } from '@/types/honey-exchange';

export default function ListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<HoneyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [buyAmount, setBuyAmount] = useState(20);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (id) fetchListing(id as string);
  }, [id]);

  const fetchListing = async (listingId: string) => {
    try {
        const { data, error } = await supabase
            .from('honey_listings')
            .select(`*, profiles:seller_id (full_name, city, phone_number)`)
            .eq('id', listingId)
            .single();
            
        if (data) {
             setListing({
                ...data,
                // Default remaining to amount if null (migration fallback)
                remaining_kg: data.remaining_kg ?? data.amount_kg, 
                seller_name: data.profiles?.full_name || 'Ukjent',
                seller_city: data.profiles?.city || 'Ukjent'
            });
        } else {
            // Mock Fallback
             const mockId1 = '00000000-0000-0000-0000-000000000001';
             const mockId2 = '00000000-0000-0000-0000-000000000002';
             
             if (listingId === mockId1 || listingId === mockId2 || listingId === '1' || listingId === '2') {
                 const isId1 = listingId === mockId1 || listingId === '1';
                 const mock = {
                    id: isId1 ? mockId1 : mockId2,
                    seller_id: '00000000-0000-0000-0000-000000000000',
                    honey_type: isId1 ? 'Lynghonning' : 'Sommerhonning',
                    amount_kg: isId1 ? 50 : 120,
                    remaining_kg: isId1 ? 50 : 120,
                    price_per_kg: isId1 ? 150 : 90,
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

  const handleIncrement = () => {
    if (!listing) return;
    if (buyAmount + 20 <= listing.remaining_kg) {
      setBuyAmount(prev => prev + 20);
    }
  };

  const handleDecrement = () => {
    if (buyAmount > 20) {
      setBuyAmount(prev => prev - 20);
    }
  };

  const handleBuy = async () => {
    if (!listing) return;
    setBuying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Du må være logget inn for å handle.');
        router.push('/login');
        return;
      }

      // 1. Create Transaction
      const totalPrice = buyAmount * listing.price_per_kg;
      const isHC = listing.currency === 'HC';

      // Check balance if HC
      if (isHC) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('honnycoin_balance')
            .eq('id', user.id)
            .single();
            
          const userBalance = profile?.honnycoin_balance || 0;
          
          if (userBalance < totalPrice) {
            alert(`Du har ikke nok HonnyCoins. Saldo: ${userBalance} HC. Pris: ${totalPrice} HC.`);
            router.push('/wallet');
            return;
          }
      }
      
      const { data: txData, error: txError } = await supabase
        .from('honey_transactions')
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.seller_id,
          amount_kg: buyAmount,
          total_price: totalPrice,
          currency: listing.currency || 'NOK',
          status: isHC ? 'paid' : 'pending_payment' // HC is instant paid
        })
        .select()
        .single();

      if (txError) {
        // If table doesn't exist (demo mode), just proceed
        if (!txError.message.includes('relation "honey_transactions" does not exist')) {
            throw txError;
        }
      }

      // Handle HC Payment (Atomic-ish)
      if (isHC && txData) {
         // Debit Buyer
         await supabase.from('wallet_transactions').insert({
            user_id: user.id,
            amount: -totalPrice,
            transaction_type: 'purchase',
            reference_id: txData.id,
            description: `Kjøp av ${buyAmount}kg ${listing.honey_type}`
         });
         
         // Credit Seller
         await supabase.from('wallet_transactions').insert({
            user_id: listing.seller_id,
            amount: totalPrice,
            transaction_type: 'sale',
            reference_id: txData.id,
            description: `Salg av ${buyAmount}kg ${listing.honey_type}`
         });

         // Update Profiles (Optimistic/Simple for MVP)
         // Note: In production use RPC
         const { data: buyerProfile } = await supabase.from('profiles').select('honnycoin_balance').eq('id', user.id).single();
         await supabase.from('profiles').update({ honnycoin_balance: (buyerProfile?.honnycoin_balance || 0) - totalPrice }).eq('id', user.id);
         
         const { data: sellerProfile } = await supabase.from('profiles').select('honnycoin_balance').eq('id', listing.seller_id).single();
         await supabase.from('profiles').update({ honnycoin_balance: (sellerProfile?.honnycoin_balance || 0) + totalPrice }).eq('id', listing.seller_id);
      }

      // 2. Update Listing Remaining Amount
      const newRemaining = listing.remaining_kg - buyAmount;
      const newStatus = newRemaining === 0 ? 'sold' : 'active';

      const { error: updateError } = await supabase
        .from('honey_listings')
        .update({ 
            remaining_kg: newRemaining,
            status: newStatus 
        })
        .eq('id', listing.id);

      if (updateError) {
         if (!updateError.message.includes('relation "honey_listings" does not exist')) {
            console.error('Failed to update listing balance', updateError);
         }
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Purchase failed:', err);
      alert('Kjøp feilet: ' + err.message);
    } finally {
      setBuying(false);
    }
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
                <h2 className="text-2xl font-bold text-gray-900">Handel Registrert!</h2>
                
                <div className="bg-honey-50 border border-honey-200 p-4 rounded-xl text-left space-y-4">
                    <p className="font-bold text-honey-900 text-center border-b border-honey-200 pb-2">Betalingsinstruksjoner</p>
                    
                    <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex justify-between">
                            <span>Vare:</span>
                            <span className="font-bold">{buyAmount} kg {listing.honey_type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Å betale:</span>
                            <span className="font-bold text-lg">{(buyAmount * listing.price_per_kg).toLocaleString()},-</span>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-honey-100 text-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Innbetaling til Klientkonto</p>
                        <p>Konto: <strong>1234.56.78903</strong></p>
                        <p>KID: <strong>{Math.floor(Math.random() * 1000000)}</strong></p>
                        <p className="text-xs text-gray-500 mt-2">
                            Pengene holdes trygt hos oss til du bekrefter at varen er mottatt. 
                            Selger får da utbetalt beløpet minus gebyr.
                        </p>
                    </div>
                </div>

                <div className="text-sm text-gray-500">
                    <p>Selger ({listing.seller_name}) har fått beskjed og vil klargjøre forsendelsen.</p>
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

  const totalPrice = buyAmount * listing.price_per_kg;

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
                    
                    {/* Top Section */}
                    <div className="flex flex-col md:flex-row gap-8 justify-between items-start mb-8">
                        <div>
                            <span className="bg-honey-100 text-honey-800 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-4 inline-block">
                                {listing.honey_type}
                            </span>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                {listing.remaining_kg} kg tilgjengelig
                            </h1>
                            <div className="flex items-center gap-2 text-gray-500">
                                <MapPin className="w-4 h-4" />
                                {listing.seller_city || listing.location}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-500 uppercase">Pris pr kg</p>
                            <p className="text-4xl font-bold text-honey-600 flex items-center justify-end gap-2">
                                {listing.price_per_kg} 
                                <span className="text-2xl">{listing.currency || 'NOK'}</span>
                            </p>
                            {listing.currency === 'HC' && (
                                <p className="text-sm text-gray-400">≈ {(listing.price_per_kg / 2).toLocaleString()} NOK</p>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-t border-b border-gray-100">
                        <div>
                            <div className="flex items-center gap-2 text-gray-400 mb-1">
                                <Scale className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Totalt Parti</span>
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

                    {/* Description */}
                    <div className="py-8 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-2">Beskrivelse fra selger</h3>
                        <p className="text-gray-600 leading-relaxed">
                            {listing.description || 'Ingen beskrivelse lagt til.'}
                        </p>
                    </div>

                    {/* Buy Section */}
                    <div className="mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-200">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            
                            {/* Quantity Selector */}
                            <div className="w-full md:w-auto">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Velg Mengde (kg)</label>
                                <div className="flex items-center gap-4 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
                                    <button 
                                        onClick={handleDecrement}
                                        disabled={buyAmount <= 20}
                                        className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                    >
                                        <Minus className="w-5 h-5 text-gray-600" />
                                    </button>
                                    
                                    <div className="text-center min-w-[80px]">
                                        <span className="block text-2xl font-bold text-gray-900">{buyAmount}</span>
                                        <span className="text-xs text-gray-400">kg</span>
                                    </div>

                                    <button 
                                        onClick={handleIncrement}
                                        disabled={buyAmount + 20 > listing.remaining_kg}
                                        className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors"
                                    >
                                        <Plus className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Total & Action */}
                            <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-6 w-full">
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Totalpris</p>
                                    <p className="text-3xl font-bold text-gray-900">{totalPrice.toLocaleString()},-</p>
                                </div>

                                <button 
                                    onClick={handleBuy}
                                    disabled={buying}
                                    className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {buying ? 'Behandler...' : 'Kjøp Nå'}
                                </button>
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 justify-center md:justify-start">
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            <span>Trygg Handel med Klientkonto</span>
                            <span className="mx-2">•</span>
                            <Info className="w-4 h-4 text-blue-500" />
                            <span>Selger får dine fraktdetaljer automatisk</span>
                        </div>
                    </div>

                </div>
            </div>
       </div>
    </div>
  );
}
