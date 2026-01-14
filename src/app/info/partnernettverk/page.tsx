
import Link from 'next/link';
import { ArrowLeft, Users, Gift, Star, Wallet } from 'lucide-react';

export default function PartnernettverkInfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-honey-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/honey-exchange" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tilbake til oversikt
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-honey-100">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-12 text-center text-white">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 text-honey-400 backdrop-blur-sm shadow-inner">
              <Users className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Partnernettverk</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Bygg ditt eget nettverk og tjen penger på å dele lidenskapen for birøkt.
            </p>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-honey-100 rounded-xl flex items-center justify-center text-honey-600 mb-2">
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Verv og Tjen</h3>
                <p className="text-gray-600 leading-relaxed">
                  Inviter venner og kjente. Du tjener provisjon på deres aktivitet i plattformen. En vinn-vinn for alle.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-2">
                  <Star className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Nivåer og Bonuser</h3>
                <p className="text-gray-600 leading-relaxed">
                  Klatre i nivåene fra Nybegynner til Mester. Lås opp eksklusive bonuser og fordeler etter hvert som nettverket ditt vokser.
                </p>
              </div>
              
               <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-2">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">HonnyCoin</h3>
                <p className="text-gray-600 leading-relaxed">
                  All inntjening utbetales i HonnyCoin, som kan brukes i butikken eller tas ut som ekte penger.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Start din reise i dag</h3>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                Få oversikt over ditt nettverk, din inntjening og dine muligheter i partnerportalen.
              </p>
              <Link 
                href="/network"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl hover:shadow-xl transition-all shadow-lg transform hover:-translate-y-0.5"
              >
                Gå til Mitt Nettverk
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
