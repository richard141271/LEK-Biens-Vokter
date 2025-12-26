'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, AlertCircle, MapPin, Coins } from 'lucide-react';
import { HoneyTransaction } from '@/types/honey-exchange';

function ResellContent() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<HoneyTransaction | null>(null);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'NOK' | 'HC'>('HC'); // Default to HC for trading
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const supabase = createClient();

  useEffect(() => {
    if (transactionId) {
        fetchTransaction(transactionId);
    } else {
        alert('Ingen transaksjon valgt');
        router.push('/honey-exchange/transactions');
    }
  }, [transactionId]);

  const fetchTransaction = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        router.push('/login');
        return;
    }

    const { data, error } = await supabase
        .from('honey_transactions')
        .select(`
            *,
            listing:listing_id (*)
        `)
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching transaction:', error);
        alert('Fant ikke transaksjonen.');
        router.push('/honey-exchange/transactions');
        return;
    }

    if (data.buyer_id !== user.id) {
        alert('Du eier ikke denne transaksjonen.');
        router.push('/honey-exchange/transactions');
        return;
    }

    setTransaction(data as any);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || !transaction.listing) return;
    
    setSubmitting(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not logged in');

        // Determine Keeper ID
        // If the previous listing had a keeper, keep it. Otherwise, the previous seller was the keeper.
        const keeperId = transaction.listing.keeper_id || transaction.listing.seller_id;

        const { error } = await supabase
            .from('honey_listings')
            .insert({
                seller_id: user.id, // I am the seller now
                keeper_id: keeperId, // The physical holder remains the same
                original_listing_id: transaction.listing.id,
                
                honey_type: transaction.listing.honey_type,
                amount_kg: transaction.amount_kg, // Selling the whole batch I bought
                remaining_kg: transaction.amount_kg,
                
                price_per_kg: Number(price),
                currency: currency,
                
                moisture_percentage: transaction.listing.moisture_percentage,
                production_year: transaction.listing.production_year,
                location: transaction.listing.location,
                description: transaction.listing.description + ` (Videresalg fra ${user.user_metadata.full_name || 'Trader'})`,
                
                status: 'active'
            });

        if (error) throw error;

        // Update original transaction status to 'resold' so the keeper doesn't ship it to me
        const { error: updateError } = await supabase
            .from('honey_transactions')
            .update({ status: 'resold' })
            .eq('id', transaction.id);

        if (updateError) {
             console.error('Failed to update old transaction status:', updateError);
             // We don't throw here, as the listing is already created. 
             // But in production we should use a transaction/RPC.
        }

        alert('Partiet er lagt ut for salg igjen!');
        router.push('/honey-exchange');

    } catch (err: any) {
        console.error('Resell failed:', err);
        alert('Feil ved publisering: ' + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Laster...</div>;
  if (!transaction || !transaction.listing) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Avbryt
          </button>
          <h1 className="font-bold text-lg">Selg Videre (Trading)</h1>
          <div className="w-20" />
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-800">
            <p className="font-bold mb-1">💡 Smart Trading</p>
            <p>
                Du legger nå ut partiet for salg <strong>uten</strong> å flytte det fysisk. 
                Honningen blir stående hos birøkteren ({transaction.listing.location}) til sluttkunde ber om sending.
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Info Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-2 mb-4">Parti som selges</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="block text-gray-500 text-xs uppercase">Type</span>
                    <span className="font-medium">{transaction.listing.honey_type}</span>
                </div>
                <div>
                    <span className="block text-gray-500 text-xs uppercase">Mengde</span>
                    <span className="font-medium">{transaction.amount_kg} kg</span>
                </div>
                <div>
                    <span className="block text-gray-500 text-xs uppercase">Lokasjon</span>
                    <span className="font-medium">{transaction.listing.location}</span>
                </div>
                <div>
                    <span className="block text-gray-500 text-xs uppercase">Din kjøpspris</span>
                    <span className="font-medium">{transaction.listing.price_per_kg} NOK/kg</span>
                </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-bold text-gray-900 text-lg border-b pb-2 mb-4">Sett din pris</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Valuta</label>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setCurrency('HC')}
                            className={`flex-1 py-3 px-4 rounded-lg border font-bold flex items-center justify-center gap-2 ${currency === 'HC' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white border-gray-200 text-gray-600'}`}
                        >
                            <Coins className="w-4 h-4" /> HonnyCoin (HC)
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrency('NOK')}
                            className={`flex-1 py-3 px-4 rounded-lg border font-bold ${currency === 'NOK' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600'}`}
                        >
                            NOK (Kroner)
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Pris pr kg ({currency})
                    </label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder={currency === 'HC' ? 'F.eks 300' : 'F.eks 150'}
                        required
                        className="w-full p-4 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                    />
                    {price && (
                        <p className="text-sm text-gray-500 mt-2">
                            Totalpris: {(Number(price) * transaction.amount_kg).toLocaleString()} {currency}
                            {currency === 'HC' && <span className="ml-2 text-xs">(≈ {(Number(price) * transaction.amount_kg / 2).toLocaleString()} NOK)</span>}
                        </p>
                    )}
                </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Legger ut...' : 'Legg ut for salg'}
          </button>

        </form>
      </main>
    </div>
  );
}

export default function ResellPage() {
    return (
        <Suspense fallback={<div>Laster...</div>}>
            <ResellContent />
        </Suspense>
    );
}
