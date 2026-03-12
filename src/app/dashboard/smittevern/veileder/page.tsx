'use client';

import { ArrowLeft, Bug, AlertTriangle, ShieldCheck, XCircle, CheckCircle, Info, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SykdomsveilederPage() {
  return (
    <div className="space-y-6 pb-20">
      <header className="flex items-center gap-4">
        <Link href="/dashboard/smittevern" className="p-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-honey-500" />
            Sykdomsveileder
          </h1>
          <p className="text-sm text-gray-500">Kjenn igjen vanlige bisykdommer og handle riktig.</p>
        </div>
      </header>

      <div className="relative w-full h-48 sm:h-64 rounded-xl overflow-hidden shadow-sm">
        <Image
          src="/images/sykdommer/sykdommer.png"
          alt="Oversikt over bisykdommer"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
          <p className="text-white text-sm font-medium">Samleoversikt: Typiske tegn på sykdom i bikuben</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <Info className="w-6 h-6 text-blue-600 shrink-0" />
        <div className="text-sm text-blue-800">
            <p className="font-bold mb-1">Usikker på hva du ser?</p>
            <p>Denne veilederen erstatter ikke Mattilsynet – men hjelper deg å reagere raskt og riktig. Jo tidligere du forstår, jo mindre skade.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Varroa */}
        <section className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                    <Bug className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">1. Varroa destructor (midd)</h2>
            </div>
            <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"/> Typiske tegn
                        </h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-1">
                            <li>Flate, rødbrune midd på bier eller yngel</li>
                            <li>Deformerte vinger</li>
                            <li>Svake bifolk, dårlig utvikling</li>
                            <li>Økt dødelighet utover sensommer/høst</li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"/> Se etter
                        </h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-1">
                            <li>Midd på bunnen av kuben</li>
                            <li>Midd på droneyngel</li>
                        </ul>
                    </div>
                </div>

                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Alvorlighet: Høy – må håndteres</span>
                </div>

                <div>
                     <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Anbefalt handling
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1 ml-6">
                        <li>Utfør varroakontroll (sukkerdryss / bunnbrett)</li>
                        <li>Iverksett godkjent behandling</li>
                        <li>Følg behandlingsplan nøye</li>
                    </ul>
                </div>
                <Link href="/dashboard/smittevern/sykdommer/varroa" className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all mt-4 group">
                    Se bilder og detaljer <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>
            </div>
        </section>

        {/* 2. Lukket yngelråte */}
        <section className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden ring-1 ring-red-500/20">
             <div className="bg-red-600 p-4 border-b border-red-700 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-white" />
                    <h2 className="text-lg font-bold">2. Lukket yngelråte</h2>
                </div>
                <span className="bg-white/20 text-xs font-bold px-2 py-1 rounded">MELDEPLIKTIG</span>
            </div>
             <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2">Typiske tegn</h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            <li>Ujevnt yngelbilde</li>
                            <li>Innhold i celler er brunlig, seigt og trådtrekkende</li>
                            <li>Innfalt celletak med hull</li>
                            <li>Sterk, ubehagelig lukt (limaktig)</li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-2">Se etter</h3>
                         <p className="text-sm text-gray-600">Trådtest (pinne trekkes ut av cellen)</p>
                    </div>
                </div>

                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="text-xs font-bold text-red-800 uppercase tracking-wider">Alvorlighet: SVÆRT HØY – offentlig håndtering</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                         <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Ikke gjør
                        </h3>
                        <ul className="text-sm text-gray-600 space-y-1 ml-6">
                            <li>Flytt rammer</li>
                            <li>Del kuber</li>
                            <li>Forsøk egen “behandling”</li>
                        </ul>
                    </div>
                    <div>
                         <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Anbefalt handling
                        </h3>
                        <ul className="text-sm text-gray-600 space-y-1 ml-6">
                            <li>Isoler kuben</li>
                            <li>Meld straks til Mattilsynet</li>
                            <li>Følg pålegg</li>
                        </ul>
                    </div>
                </div>
                <Link href="/dashboard/smittevern/sykdommer/lukket-yngelrate" className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 font-bold hover:bg-red-100 hover:border-red-300 transition-all mt-4 group">
                    Se bilder og detaljer <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                </Link>
            </div>
        </section>

         {/* 3. Åpen yngelråte */}
        <section className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
             <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">3. Åpen yngelråte</h2>
            </div>
             <div className="p-5 space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Typiske tegn</h3>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Død yngel i åpne celler</li>
                        <li>Gulgrå, kornete masse</li>
                        <li>Sur lukt</li>
                        <li>Urolig yngelbilde</li>
                    </ul>
                </div>
                
                 <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Alvorlighet: Middels til høy</span>
                </div>

                <div>
                     <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Anbefalt handling
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1 ml-6">
                        <li>Forbedre trekk og fôrtilgang</li>
                        <li>Bytt dronning om nødvendig</li>
                        <li>Følg med – kan utvikle seg</li>
                    </ul>
                </div>
                <Link href="/dashboard/smittevern/sykdommer/apen-yngelrate" className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all mt-4 group">
                    Se bilder og detaljer <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>
            </div>
        </section>

         {/* 4. Kalkyngel */}
        <section className="bg-white rounded-xl shadow-sm border border-yellow-100 overflow-hidden">
             <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                    <Bug className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">4. Kalkyngel</h2>
            </div>
             <div className="p-5 space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Typiske tegn</h3>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Hvite/grå “krittklumper” i kuben</li>
                        <li>Død, mumifisert yngel</li>
                        <li>Ofte ses på bunnen av kuben</li>
                    </ul>
                </div>
                
                 <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Alvorlighet: Lav til middels</span>
                </div>

                <div>
                     <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Anbefalt handling
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1 ml-6">
                        <li>Bedre ventilasjon</li>
                        <li>Bytt dronning</li>
                        <li>Fjern angrepne rammer</li>
                    </ul>
                </div>
                <Link href="/dashboard/smittevern/sykdommer/kalkyngel" className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all mt-4 group">
                    Se bilder og detaljer <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>
            </div>
        </section>

         {/* 5. Nosema */}
        <section className="bg-white rounded-xl shadow-sm border border-yellow-100 overflow-hidden">
             <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                    <Bug className="w-6 h-6 text-yellow-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">5. Nosema</h2>
            </div>
             <div className="p-5 space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Typiske tegn</h3>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Diaré på rammer og kubevegger</li>
                        <li>Slappe bier</li>
                        <li>Dårlig vårutvikling</li>
                    </ul>
                </div>
                
                 <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <span className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Alvorlighet: Middels</span>
                </div>

                <div>
                     <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Anbefalt handling
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1 ml-6">
                        <li>God hygiene</li>
                        <li>Bytt ut gamle rammer</li>
                        <li>Sørg for god overvintring</li>
                    </ul>
                </div>
                <Link href="/dashboard/smittevern/sykdommer/nosema" className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all mt-4 group">
                    Se bilder og detaljer <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>
            </div>
        </section>

         {/* 6. Frisk kube */}
        <section className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden">
             <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">6. Frisk kube (referanse)</h2>
            </div>
             <div className="p-5 space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-2">Kjennetegn</h3>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>Jevnt yngelbilde</li>
                        <li>Tett, fint celletak</li>
                        <li>Rolige bier</li>
                        <li>God aktivitet</li>
                    </ul>
                </div>
                
                <p className="text-sm text-green-700 italic">👉 Bruk denne som sammenligningsgrunnlag i bildebanken.</p>
                <Link href="/dashboard/smittevern/sykdommer/frisk-kube" className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all mt-4 group">
                    Se bilder og detaljer <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>
            </div>
        </section>

        {/* Philosophy */}
        <div className="bg-gray-900 text-white p-6 rounded-xl">
            <h3 className="text-lg font-bold mb-2">🧠 LEK-filosofi</h3>
            <p className="mb-4 text-gray-300">Dette er ikke skremsel. Dette er kompetanse, mestring og trygghet.</p>
            <blockquote className="text-xl font-medium text-honey-400 italic">
                «Jo tidligere du forstår, jo mindre skade.»
            </blockquote>
        </div>

      </div>
    </div>
  );
}
