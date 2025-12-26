'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, Heart, Building, QrCode } from 'lucide-react';

export default function FranchisePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gray-900 text-white pt-8 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-honey-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => router.push('/honey-exchange')}
            className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake til Portal
          </button>
          
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                <ShoppingBag className="w-10 h-10 text-honey-400" />
            </div>
            <div>
                <h1 className="text-4xl font-bold mb-2">LEK-Honning™️ Franchise</h1>
                <p className="text-gray-400 text-lg">
                    Salgsavdeling & Butikkløsninger
                </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20 space-y-8">
        
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="prose max-w-none text-gray-600">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Vi revolusjonerer honningsalg!</h3>
                
                <div className="space-y-8">
                    {/* Section 1 */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-honey-100 flex items-center justify-center shrink-0 text-honey-600 font-bold text-xl">1</div>
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">For Lag og Foreninger</h4>
                            <p>
                                Vi bygger opp en salgsavdeling som selger honning til skoler, lag og foreninger. 
                                Vi leverer i et format som gjør det <strong>enkelt å videreselge</strong>, slik at de kan tjene gode penger til kassen sin.
                                Dugnadssalg av lokal honning er både lønnsomt og populært!
                            </p>
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-purple-600 font-bold text-xl">2</div>
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">Sosialt Entreprenørskap</h4>
                            <p>
                                Vi samarbeider med organisasjoner som <strong>Kirkens Bymisjon</strong>. Etter modell fra <em>=Oslo</em>, 
                                gir vi vanskeligstilte en mulighet til inntekt gjennom salg av våre produkter.
                            </p>
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600 font-bold text-xl">3</div>
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 mb-2">Selvbetjente Butikkbokser</h4>
                            <p className="mb-4">
                                Vi lager tilpassede kasser med honning som kan plasseres i alle typer butikker (apotek, blomsterbutikker, matbutikker, kiosker).
                            </p>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-4">
                                <QrCode className="w-10 h-10 text-gray-400" />
                                <div className="text-sm">
                                    <strong>Enkelt konsept:</strong>
                                    <br/>
                                    Kunden tar honning -&gt; Scanner QR -&gt; Vippser.
                                    <br/>
                                    Butikken fakturerer oss eller donerer provisjonen til veldedighet.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}
