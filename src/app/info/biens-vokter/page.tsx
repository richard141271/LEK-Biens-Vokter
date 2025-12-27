
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, BarChart3, Map, Box } from 'lucide-react';

export default function BiensVokterInfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-honey-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/honey-exchange" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tilbake til oversikt
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-honey-100">
          <div className="bg-honey-100 p-12 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-honey-600 shadow-sm">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold text-honey-900 mb-4">Biens Vokter</h1>
            <p className="text-xl text-honey-800 max-w-2xl mx-auto">
              Det komplette styringsverktøyet for moderne birøktere. Digitaliser bigården din i dag.
            </p>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-2">
                  <Map className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Full Oversikt</h3>
                <p className="text-gray-600 leading-relaxed">
                  Hold styr på alle dine bigårder og kuber på ett sted. Kartvisning og detaljerte lister gir deg kontrollen du trenger.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-2">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Smarte Inspeksjoner</h3>
                <p className="text-gray-600 leading-relaxed">
                  Registrer inspeksjoner raskt og enkelt. Få innsikt i bienes helse, honningproduksjon og utvikling over tid.
                </p>
              </div>
              
               <div className="space-y-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-2">
                  <Box className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Utstyrskontroll</h3>
                <p className="text-gray-600 leading-relaxed">
                  Ha full kontroll på utstyr, rammer og materiell. Planlegg vedlikehold og innkjøp basert på faktiske behov.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Klar for å starte?</h3>
              <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                Biens Vokter er hjertet i LEK-Honning økosystemet. Start din digitale reise nå.
              </p>
              <Link 
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-honey-500 rounded-xl hover:bg-honey-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Gå til Min Bigård
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
