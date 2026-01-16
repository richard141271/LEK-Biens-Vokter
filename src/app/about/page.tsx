import Link from "next/link";
import { ArrowLeft, Cpu, Truck, Wifi, Activity, Zap } from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 p-6 z-50 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-gray-900 hover:text-honey-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">Tilbake til nåtiden</span>
          </Link>
          <div className="font-bold text-xl text-honey-600">LEK-Biens Vokter 2.0</div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-honey-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-honey-100 text-honey-700 text-sm font-bold mb-6">
            DREVET AV AI &quot;AURORA&quot;
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
            100% Digitalisert.<br/>
            100% Automatisert.
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Velkommen til fremtiden. Vi bygger en verden hvor bikubene styrer seg selv, 
            høster seg selv, og honningen hentes som melk på tankbil. 
            Ingen snakking. Bare ren, stille effektivitet.
          </p>
        </div>
      </section>

      {/* Section 1: The Industrial Revolution */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-honey-100 rounded-xl flex items-center justify-center text-honey-600">
              <Truck className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900">Fra Spann til Tankbil</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Glem tunge løft og klissete slyngerom. I vår visjon kobles bigården direkte til 
              tankbilen. Når kubene melder at honningen er moden, kommer &quot;melkebilen&quot; og pumper 
              den ferdige varen rett fra samletanken. Effektivt, hygienisk og revolusjonerende.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Automatisk tømming ved behov
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Sanntids logistikkstyring av AI
              </li>
            </ul>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl">
            <Image 
              src="/IMG_1424.JPG" 
              alt="Tankbil henter honning" 
              fill
              className="object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>
        </div>
      </section>

      {/* Section 2: The Smart Hive */}
      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 relative h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
            <Image 
              src="/IMG_1432.JPG" 
              alt="Avansert bikube teknologi" 
              fill
              className="object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Cpu className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-bold">Selvstyrt Intelligens</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Hver kube er et datasenter. Fuktighetssensorer overvåker modningsprosessen ned til minste desimal. 
              Motoriserte ventiler åpner seg kun når alle parametere er perfekte.
            </p>
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="p-4 bg-gray-800 rounded-lg">
                <Wifi className="w-8 h-8 text-honey-500 mb-2" />
                <h3 className="font-bold mb-1">Alltid Påkoblet</h3>
                <p className="text-sm text-gray-400">5G og satellitt-link sikrer at Aurora alltid har kontroll.</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg">
                <Activity className="w-8 h-8 text-green-500 mb-2" />
                <h3 className="font-bold mb-1">Autonom Drift</h3>
                <p className="text-sm text-gray-400">Kuben tar egne avgjørelser basert på vær og trekk.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: The Heather Problem - Solved */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="w-12 h-12 bg-honey-100 rounded-xl flex items-center justify-center text-honey-600">
              <Zap className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900">Lynghonning-koden er Knekt</h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Vanlige &quot;Flow Hives&quot; feiler på lynghonning fordi den er tiksotrop (geleaktig). 
              Vi har løst dette med innebygde mikro-vibratorer.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Når sensorene registrerer lyngtrekk, aktiveres en presis frekvens som gjør honningen 
              flytende i tappeyeblikket. Ingen slynging. Ingen oppvarming. Bare ren fysikk og teknologi.
            </p>
          </div>
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl">
            <Image 
              src="/IMG_1429.JPG" 
              alt="Flow hive med vibrator teknologi" 
              fill
              className="object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Vertical Farming */}
      <section className="py-20 px-4 bg-honey-50">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Skalerbar Fremtid</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Fra hobbybirøkt til industriell produksjon. Våre konteiner-løsninger stabler i høyden
            og maksimerer utbyttet per kvadratmeter.
          </p>
        </div>
        
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="relative h-[300px] md:h-[500px] rounded-2xl overflow-hidden shadow-xl">
             <Image 
              src="/IMG_1425.JPG" 
              alt="Industriell bikube stabel" 
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-white font-bold text-xl">High-Density Apiary</h3>
              <p className="text-gray-300">Optimalisert for urbane strøk og intensiv drift</p>
            </div>
          </div>
          <div className="relative h-[300px] md:h-[500px] rounded-2xl overflow-hidden shadow-xl">
             <Image 
              src="/IMG_1428.JPG" 
              alt="Automatisert produksjonslinje" 
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-white font-bold text-xl">Robotisert Drift</h3>
              <p className="text-gray-300">Full oversikt, null manuelt arbeid</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-20 px-4 bg-gray-900 text-center">
        <h2 className="text-3xl font-bold text-white mb-8">Er du klar for revolusjonen?</h2>
        <Link 
          href="/register"
          className="inline-block bg-honey-500 hover:bg-honey-600 text-white font-bold py-4 px-12 rounded-full text-lg transition-all hover:scale-105 shadow-lg hover:shadow-honey-500/50"
        >
          Bli med som pilotbruker
        </Link>
        <p className="text-gray-500 mt-8 text-sm">
          Prosjektleder: AI Aurora<br/>
          Lokasjon: Overalt
        </p>
      </section>
    </main>
  );
}
