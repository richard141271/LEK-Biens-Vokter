'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Calendar, Clock, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';

// Mock data since we don't have real trading yet
const MOCK_TRADES = [
    { id: 1, type: 'buy', amount: 50, price: 155, product: 'Lynghonning', date: '2024-03-15 14:30', buyer: 'Meg', seller: 'Ole B.' },
    { id: 2, type: 'sell', amount: 100, price: 90, product: 'Sommerhonning', date: '2024-03-10 09:15', buyer: 'Coop', seller: 'Meg' },
    { id: 3, type: 'buy', amount: 20, price: 160, product: 'Lynghonning', date: '2024-02-28 11:45', buyer: 'Meg', seller: 'Kari N.' },
];

export default function TradingOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gray-900 text-white pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake
          </button>
          
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <TrendingUp className="w-10 h-10 text-green-400" />
            </div>
            <div>
                <h1 className="text-4xl font-bold mb-2">Trading Oversikt</h1>
                <p className="text-gray-400 text-lg">
                    Dine kjøp og salg på Honningbørsen
                </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            {loading ? (
                <div className="p-12 text-center text-gray-500">Laster transaksjoner...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Dato</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Vare</th>
                                <th className="p-4 text-right">Mengde</th>
                                <th className="p-4 text-right">Pris/kg</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4">Motpart</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {MOCK_TRADES.map((trade) => (
                                <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {trade.date.split(' ')[0]}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                            trade.type === 'buy' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {trade.type === 'buy' ? 'Kjøp' : 'Salg'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-900">{trade.product}</td>
                                    <td className="p-4 text-right">{trade.amount} kg</td>
                                    <td className="p-4 text-right">{trade.price},-</td>
                                    <td className="p-4 text-right font-bold text-gray-900">
                                        {(trade.amount * trade.price).toLocaleString()},-
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">{trade.seller === 'Meg' ? `Til: ${trade.buyer}` : `Fra: ${trade.seller}`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        
        <div className="mt-6 text-center text-gray-400 text-sm">
            <p>Viser de siste 3 transaksjonene.</p>
        </div>
      </div>
    </div>
  );
}
