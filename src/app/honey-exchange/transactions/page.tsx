'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, AlertCircle, RefreshCw, CreditCard } from 'lucide-react';
import { HoneyTransaction } from '@/types/honey-exchange';

export default function MyTransactionsPage() {
  const [purchases, setPurchases] = useState<HoneyTransaction[]>([]);
  const [sales, setSales] = useState<HoneyTransaction[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [keeperTasks, setKeeperTasks] = useState<HoneyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales' | 'listings' | 'keeper'>('purchases');
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        router.push('/login');
        return;
    }

    // Fetch Purchases
    const { data: purchasesData } = await supabase
        .from('honey_transactions')
        .select(`
            *,
            listing:listing_id (*),
            seller:seller_id (full_name, phone_number)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

    // Fetch Sales
    const { data: salesData } = await supabase
        .from('honey_transactions')
        .select(`
            *,
            listing:listing_id (*),
            buyer:buyer_id (full_name, address, postal_code, city, phone_number)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

    // Fetch My Listings (Active & Inactive)
    const { data: listingsData } = await supabase
        .from('honey_listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

    // Fetch Keeper Tasks
    const { data: keeperData } = await supabase
        .from('honey_transactions')
        .select(`
            *,
            listing:listing_id!inner (*), 
            buyer:buyer_id (full_name, address, postal_code, city, phone_number)
        `)
        .eq('status', 'paid')
        .eq('listing.keeper_id', user.id);

    if (purchasesData) setPurchases(purchasesData);
    if (salesData) setSales(salesData);
    if (listingsData) setMyListings(listingsData);
    if (keeperData) setKeeperTasks(keeperData as any);
    
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pending_payment': 
            return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Clock className="w-3 h-3"/> Venter på betaling</span>;
        case 'paid':
            return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> Betalt - Klar til sending</span>;
        case 'shipped':
            return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Truck className="w-3 h-3"/> Sendt</span>;
        case 'completed':
            return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> Fullført</span>;
        case 'resold':
            return <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><RefreshCw className="w-3 h-3"/> Videresolgt</span>;
        default:
            return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  const handleStatusUpdate = async (transactionId: string, newStatus: string) => {
    try {
        const { error } = await supabase
            .from('honey_transactions')
            .update({ status: newStatus })
            .eq('id', transactionId);

        if (error) throw error;

        // Update local state
        setPurchases(prev => prev.map(t => t.id === transactionId ? { ...t, status: newStatus } : t) as any);
        setSales(prev => prev.map(t => t.id === transactionId ? { ...t, status: newStatus } : t) as any);
        setKeeperTasks(prev => prev.filter(t => t.id !== transactionId) as any); // Remove from todo list if shipped
        
        alert('Status oppdatert!');
    } catch (err: any) {
        console.error('Failed to update status:', err);
        alert('Feil ved oppdatering: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <button 
        onClick={() => router.push('/honey-exchange')}
        className="flex items-center gap-2 text-gray-600 hover:text-honey-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Tilbake
      </button>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mine Transaksjoner</h1>
        <button
          onClick={() => router.push('/wallet')}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-600 transition-colors flex items-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          Kjøp HonnyCoin
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'purchases' 
                ? 'text-honey-600 border-b-2 border-honey-600 bg-honey-50/50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mine Kjøp
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'sales' 
                ? 'text-honey-600 border-b-2 border-honey-600 bg-honey-50/50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mine Salg
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'listings' 
                ? 'text-honey-600 border-b-2 border-honey-600 bg-honey-50/50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mine Annonser
          </button>
          <button
            onClick={() => setActiveTab('keeper')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'keeper' 
                ? 'text-honey-600 border-b-2 border-honey-600 bg-honey-50/50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Honningbank (Å sende)
          </button>
        </div>
      </div>

        {loading ? (
            <div className="text-center py-12 text-gray-500">Laster transaksjoner...</div>
        ) : (
            <div className="space-y-4">
                {activeTab === 'listings' ? (
                   // Render Listings
                   myListings.length === 0 ? (
                       <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                           <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                           <p className="text-gray-500">Ingen aktive annonser funnet.</p>
                       </div>
                   ) : (
                       myListings.map(listing => (
                           <div key={listing.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-honey-300 transition-colors">
                               <div className="flex justify-between items-start">
                                   <div>
                                       <h3 className="text-lg font-bold text-gray-900">{listing.honey_type}</h3>
                                       <p className="text-sm text-gray-500">Opprettet: {new Date(listing.created_at).toLocaleDateString()}</p>
                                   </div>
                                   <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                       listing.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                   }`}>
                                       {listing.status === 'active' ? 'Aktiv' : listing.status === 'sold' ? 'Solgt' : listing.status}
                                   </span>
                               </div>
                               <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                   <div>
                                       <span className="block text-xs text-gray-500">Mengde</span>
                                       <span className="font-medium">{listing.amount_kg} kg</span>
                                   </div>
                                   <div>
                                       <span className="block text-xs text-gray-500">Gjenværende</span>
                                       <span className="font-medium">{listing.remaining_kg} kg</span>
                                   </div>
                                   <div>
                                       <span className="block text-xs text-gray-500">Pris</span>
                                       <span className="font-medium">{listing.price_per_kg} {listing.currency}/kg</span>
                                   </div>
                                   <div>
                                       <span className="block text-xs text-gray-500">Lokasjon</span>
                                       <span className="font-medium">{listing.location}</span>
                                   </div>
                               </div>
                           </div>
                       ))
                   )
                ) : (
                    // Render Transactions
                    (() => {
                        const data = activeTab === 'purchases' ? purchases : activeTab === 'sales' ? sales : keeperTasks;
                        
                        if (data.length === 0) {
                            return (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Ingen transaksjoner funnet.</p>
                                </div>
                            );
                        }

                        return data.map((tx) => (
                            <div key={tx.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-honey-300 transition-colors">
                                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            {getStatusBadge(tx.status)}
                                            <span className="text-xs text-gray-400">#{tx.id.slice(0, 8)}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">{tx.listing?.honey_type || 'Honning'}</h3>
                                        <p className="text-sm text-gray-500">
                                            {activeTab === 'purchases' 
                                                ? `Selger: ${tx.seller?.full_name || 'Ukjent'}`
                                                : `Kjøper: ${tx.buyer?.full_name || 'Ukjent'}`
                                            }
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-honey-600">
                                            {tx.total_price} {tx.currency || 'NOK'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {tx.amount_kg} kg @ {Math.round(tx.total_price / tx.amount_kg)} {tx.currency || 'NOK'}/kg
                                        </div>
                                    </div>
                                </div>
                                
                                {activeTab === 'sales' && tx.status === 'paid' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                        <button
                                            onClick={() => handleStatusUpdate(tx.id, 'shipped')}
                                            className="px-4 py-2 bg-honey-600 text-white rounded-lg hover:bg-honey-700 transition-colors flex items-center gap-2"
                                        >
                                            <Truck className="w-4 h-4" />
                                            Marker som sendt
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'keeper' && tx.status === 'paid' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-3">
                                        <div className="flex-1 bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
                                            <strong>Sendes til:</strong><br/>
                                            {tx.buyer?.full_name}<br/>
                                            {tx.buyer?.address}<br/>
                                            {tx.buyer?.postal_code} {tx.buyer?.city}<br/>
                                            Tlf: {tx.buyer?.phone_number}
                                        </div>
                                        <button
                                            onClick={() => handleStatusUpdate(tx.id, 'shipped')}
                                            className="px-4 py-2 bg-honey-600 text-white rounded-lg hover:bg-honey-700 transition-colors flex items-center gap-2 self-start"
                                        >
                                            <Truck className="w-4 h-4" />
                                            Bekreft sending
                                        </button>
                                    </div>
                                )}
                                
                                {activeTab === 'purchases' && tx.status === 'paid' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                        <button
                                            onClick={() => router.push(`/honey-exchange/resell?txId=${tx.id}`)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Selg videre (Trading)
                                        </button>
                                    </div>
                                )}
                            </div>
                        ));
                    })()
                )}
            </div>
        )}
    </div>
  );
}
