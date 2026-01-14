
import Link from 'next/link';
import { ArrowLeft, DollarSign, TrendingUp, Users, Lock } from 'lucide-react';

export default function HonningborsenInfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-honey-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/honey-exchange" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tilbake til oversikt
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-honey-100">
          <div className="bg-honey-500 p-12 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 text-white backdrop-blur-sm shadow-inner">
              <DollarSign className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Honningbørsen</h1>
            <p className="text-xl text-honey-100 max-w-2xl mx-auto">
              Norges første markedsplass for kjøp og salg av honning i bulk. Direkte handel, rettferdige priser.
            </p>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-2">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Markedspriser i Sanntid</h3>
                <p className="text-gray-600 leading-relaxed">
                  Følg prisutviklingen på ulike honningtyper. Kjøp når prisen er lav, selg når den er høy. Full transparens.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-2">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Direkte Kontakt</h3>
                <p className="text-gray-600 leading-relaxed">
                  Ingen fordyrende mellomledd. Handle direkte med andre birøktere, grossister eller butikker.
                </p>
              </div>
              
               <div className="space-y-4">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-2">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Trygg Handel</h3>
                <p className="text-gray-600 leading-relaxed">
                  Kvalitetssikrede partier og trygge oppgjør. Vi verifiserer selgere for å sikre en trygg handelsopplevelse.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Klar for å handle?</h3>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                Gå til markedsplassen for å se tilgjengelige partier eller legge ut din egen honning.
              </p>
              <Link 
                href="/honey-exchange"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-black rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Gå til Børsen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
