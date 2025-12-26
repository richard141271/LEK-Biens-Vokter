'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Smile, Award, BookOpen, Star } from 'lucide-react';

export default function KidsBeekeeperPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-blue-400 text-white pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
             {/* Abstract pattern */}
             <svg className="h-full w-full" viewBox="0 0 100 100">
                <circle cx="20" cy="20" r="20" fill="white" />
                <circle cx="80" cy="80" r="30" fill="white" />
             </svg>
        </div>
        
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
                <Smile className="w-10 h-10 text-white" />
            </div>
            <div>
                <h1 className="text-4xl font-bold mb-2">LEK-Honning™️ BARNAS birøkter</h1>
                <p className="text-blue-100 text-lg">
                    Læring, mestring og moro for fremtidens naturvoktere!
                </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20 space-y-8">
        
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
            <div className="prose max-w-none text-gray-600">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Kurs og Sertifisering for Barn</h3>
                <p className="text-lg leading-relaxed mb-6">
                    Vi tar barn på alvor! Gjennom vårt unike kursopplegg får barna lære om bienes fantastiske verden, 
                    hvordan honning blir til, og hvorfor biene er så viktige for oss alle.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                    <div className="bg-yellow-50 p-4 rounded-xl text-center">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 text-yellow-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-gray-900">Læring</h4>
                        <p className="text-xs text-gray-500 mt-1">Teori tilpasset barn</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                            <Star className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-gray-900">Praksis</h4>
                        <p className="text-xs text-gray-500 mt-1">Være med i bigården</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                            <Award className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-gray-900">Sertifisering</h4>
                        <p className="text-xs text-gray-500 mt-1">Få diplom og merke</p>
                    </div>
                </div>

                <h4 className="text-xl font-bold text-gray-900 mt-8 mb-3">Fra kube til bord</h4>
                <p>
                    Vi bygger nå <strong>slyngerom spesielt tilpasset barn</strong>. Her kan de:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Skrelle voks av rammene selv</li>
                    <li>Slynge sin egen honning</li>
                    <li>Tappe på glass og sette på <strong>egne barneetiketter</strong></li>
                </ul>
                
                <p className="mt-6">
                    En <strong>LEK-sertifisert birøkter</strong> (barnet) kan levere honning til oss for salg, 
                    eller selge den selv med sine unike etiketter. Vi tar betalt for kurs og slyngetjenester, 
                    men opplevelsen er uvurderlig!
                </p>
            </div>
        </div>

        <div className="bg-blue-600 text-white rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <h3 className="text-2xl font-bold">Vil du vite mer?</h3>
                <p className="text-blue-100">Meld deg på vårt nyhetsbrev for oppstartsdatoer.</p>
            </div>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg whitespace-nowrap">
                Hold meg oppdatert
            </button>
        </div>

      </div>
    </div>
  );
}
