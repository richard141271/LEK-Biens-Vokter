'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, TrendingUp, History, PlusCircle, Coins } from 'lucide-react';
import { WalletTransaction } from '@/types/honey-exchange';

export default function WalletPage() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        router.push('/login');
        return;
    }

    // 1. Fetch Profile Balance
    const { data: profile } = await supabase
        .from('profiles')
        .select('honnycoin_balance')
        .eq('id', user.id)
        .single();
    
    if (profile) {
        setBalance(profile.honnycoin_balance || 0);
    }

    // 2. Fetch Transactions
    const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (txs) {
        setTransactions(txs as any);
    }
    
    setLoading(false);
  };

  const handleBuyCoins = async (amountNOK: number, amountHC: number) => {
    setBuying(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not logged in');

        // 1. Create Transaction Record
        const { error: txError } = await supabase
            .from('wallet_transactions')
            .insert({
                user_id: user.id,
                amount: amountHC,
                transaction_type: 'deposit',
                description: `Kjøp av ${amountHC} HC (Betalt ${amountNOK} NOK)`
            });

        if (txError) throw txError;

        // 2. Update Profile Balance
        // Note: In a real app, this should be done via a Postgres Trigger or RPC to be atomic.
        // For MVP, we do optimistic update or sequential update.
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ honnycoin_balance: balance + amountHC })
            .eq('id', user.id);

        if (updateError) throw updateError;

        alert(`Gratulerer! Du har kjøpt ${amountHC} HonnyCoins.`);
        fetchWalletData(); // Refresh

    } catch (err: any) {
        console.error('Buy failed:', err);
        alert('Kjøp feilet: ' + err.message);
    } finally {
        setBuying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-yellow-500 text-white pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/honeycomb.png')] opacity-20"></div>
        <div className="max-w-md mx-auto relative z-10">
          <button 
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Coins className="w-8 h-8 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-bold">Min Lommebok</h1>
                <p className="text-yellow-100">Administrer dine HonnyCoins</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-6">
        
        {/* Balance Card */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-yellow-100 text-center">
            <p className="text-gray-500 font-medium uppercase text-xs tracking-wider mb-2">Din Saldo</p>
            <div className="text-4xl font-black text-gray-900 flex items-center justify-center gap-2">
                {balance.toLocaleString()} 
                <span className="text-yellow-500 text-2xl">HC</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">≈ {(balance / 2).toLocaleString()} NOK verdi</p>
        </div>

        {/* Buy Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-green-500" />
                Kjøp HonnyCoins
            </h2>
            <div className="grid grid-cols-2 gap-4">
                <button 
                    disabled={buying}
                    onClick={() => handleBuyCoins(500, 1000)}
                    className="p-4 border border-gray-200 rounded-xl hover:border-yellow-500 hover:bg-yellow-50 transition-all text-left group"
                >
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-yellow-600">1 000 HC</div>
                    <div className="text-sm text-gray-500">Pris: 500 NOK</div>
                </button>
                <button 
                    disabled={buying}
                    onClick={() => handleBuyCoins(1000, 2000)}
                    className="p-4 border border-yellow-200 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-all text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-yellow-500 text-white text-[10px] px-2 py-0.5 font-bold rounded-bl-lg">MEST POPULÆR</div>
                    <div className="text-2xl font-bold text-gray-900 text-yellow-800">2 000 HC</div>
                    <div className="text-sm text-gray-600">Pris: 1 000 NOK</div>
                </button>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
                Betaling skjer via Vipps (Simulert). 1 NOK = 2 HC.
            </p>
        </div>

        {/* Custom Amount */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4">Valgfritt beløp</h2>
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Beløp i HC</label>
                    <input 
                        type="number" 
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Min 10 HC"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                    />
                </div>
                <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Pris i NOK</label>
                        <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                        {customAmount ? (Number(customAmount) / 2).toLocaleString() : '0'} kr
                        </div>
                </div>
            </div>
            <button 
                disabled={buying || !customAmount || Number(customAmount) < 1}
                onClick={() => handleBuyCoins(Number(customAmount) / 2, Number(customAmount))}
                className="w-full mt-4 bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Kjøp {customAmount || '0'} HC
            </button>
        </div>

        {/* Transaction History */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-400" />
                Transaksjoner
            </h2>
            <div className="space-y-4">
                {loading ? (
                    <p className="text-center text-gray-400 text-sm">Laster...</p>
                ) : transactions.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm">Ingen transaksjoner enda.</p>
                ) : (
                    transactions.map(tx => (
                        <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                            <div>
                                <p className="font-medium text-gray-900 text-sm">{tx.description}</p>
                                <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount} HC
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
