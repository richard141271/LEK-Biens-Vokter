import Link from "next/link";
import { ArrowRight, CheckCircle, ShieldCheck, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-6xl mx-auto z-10">
        <div className="font-bold text-xl text-gray-900 flex items-center gap-2">
          <span className="text-2xl">🐝</span> Biens Vokter
        </div>
        <Link href="/login" className="text-gray-900 hover:text-honey-600 font-medium bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 hover:border-honey-300 transition-all">
          Logg inn
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-honey-100 to-white pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Birøkter-revolusjonen
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Fremtidens plattform for norske birøktere. Handsfree inspeksjon, 
            AI-drevet innsikt og full kontroll over bigården.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/login"
              className="bg-honey-500 hover:bg-honey-600 text-white font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2"
            >
              Start gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-full border border-gray-200 transition-colors">
              Lær mer
            </button>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Vår Visjon</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-honey-50 rounded-xl border border-honey-100">
              <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center mb-4 text-honey-600">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Handsfree Inspeksjon</h3>
              <p className="text-gray-600">
                Stemme-styrt registrering så du kan holde hendene på kuben. 
                Ingen klissete telefoner.
              </p>
            </div>
            
            <div className="p-6 bg-honey-50 rounded-xl border border-honey-100">
              <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center mb-4 text-honey-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Kontekst-basert</h3>
              <p className="text-gray-600">
                Appen vet hvilken bigård du står i og hvilken kube du inspiserer 
                ved hjelp av GPS og QR-koder.
              </p>
            </div>

            <div className="p-6 bg-honey-50 rounded-xl border border-honey-100">
              <div className="w-12 h-12 bg-honey-100 rounded-full flex items-center justify-center mb-4 text-honey-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Offline-støtte (PWA)</h3>
              <p className="text-gray-600">
                Full funksjonalitet selv langt ute i skogen uten dekning. 
                Synkroniserer når du er tilbake.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MVP Roadmap */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Veikart</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-honey-500">
              <span className="text-sm font-semibold text-honey-600 uppercase tracking-wider">Fase 1 (Nå)</span>
              <h3 className="text-xl font-bold mt-1 mb-2">MVP: Robust Registrering</h3>
              <p className="text-gray-600">Manuell app for registrering av bigårder og inspeksjoner. Offline-støtte.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-gray-300 opacity-75">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Fase 2</span>
              <h3 className="text-xl font-bold mt-1 mb-2">Altinn Integrasjon & Betaling</h3>
              <p className="text-gray-600">Sømløs rapportering til myndigheter og integrerte betalingsløsninger.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-gray-300 opacity-75">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Fase 3</span>
              <h3 className="text-xl font-bold mt-1 mb-2">AI & Bildeanalyse</h3>
              <p className="text-gray-600">Automatisk deteksjon av sykdom og dronetelling via kamera.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">© 2024 Birøkter-revolusjonen. Bygget med Next.js, Supabase & Tailwind.</p>
        </div>
      </footer>
    </main>
  );
}
