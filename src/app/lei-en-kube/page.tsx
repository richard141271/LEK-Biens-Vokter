'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Box, CheckCircle, Calendar, MapPin, Heart } from 'lucide-react';

export default function RentHivePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-honey-500 text-white pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => router.push('/honey-exchange')}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake til Portal
          </button>
          
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Box className="w-10 h-10 text-white" />
            </div>
            <div>
                <h1 className="text-4xl font-bold mb-2">LEK-Honning™️ LEI EN KUBE</h1>
                <p className="text-honey-100 text-lg">
                    Din egen bikube i hagen - uten arbeidet!
                </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20 space-y-8">
        
        {/* Intro Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-honey-100">
            <div className="prose max-w-none text-gray-600">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Hva er LEI EN KUBE?</h3>
                <p className="text-lg leading-relaxed mb-6">
                    LEK står for <strong>LEI EN KUBE</strong>. Vi tilbyr utleie av bikuber til private husholdninger, 
                    bedrifter og borettslag. Dette er en fantastisk mulighet for både voksne og barn til å komme tett på naturen!
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                        <h4 className="font-bold text-green-800 flex items-center gap-2 mb-3">
                            <Heart className="w-5 h-5" />
                            For Naturen
                        </h4>
                        <p className="text-sm">
                            Du bidrar direkte til pollinering i ditt nærmiljø. Biene dine vil sørge for 
                            frodige hager og blomsterbed i hele nabolaget.
                        </p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-3">
                            <Calendar className="w-5 h-5" />
                            Vi gjør jobben
                        </h4>
                        <p className="text-sm">
                            Du får en eller flere kuber i hagen, men vår birøkter tar seg av alt stellet. 
                            Du kan være med å se på når vi røkter biene – en lærerik opplevelse!
                        </p>
                    </div>
                </div>

                <p>
                    Som leietaker får du din egen honning, tappet på glass med din egen etikett. 
                    En perfekt gave til ansatte, venner eller familie!
                </p>
            </div>
        </div>

        {/* CTA */}
        <div className="bg-gray-900 text-white rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4">Interessert i å leie?</h3>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                    Vi ruller nå ut konseptet i utvalgte områder. Sett deg på venteliste for 2025-sesongen.
                </p>
                <button className="bg-honey-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-honey-600 transition-colors shadow-lg">
                    Meld interesse
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}
