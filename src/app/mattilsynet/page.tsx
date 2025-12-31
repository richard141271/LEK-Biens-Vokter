'use client';

import Link from "next/link";
import { ShieldCheck, Search, FileText, Map } from "lucide-react";

export default function MattilsynetPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* Header */}
      <div className="bg-slate-800 text-white pt-12 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/"
            className="text-slate-300 hover:text-white mb-8 inline-block transition-colors"
          >
            ← Tilbake til forsiden
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <ShieldCheck className="w-12 h-12 text-green-400" />
            <h1 className="text-4xl font-bold">Mattilsynet Portal</h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl">
            Effektivt tilsyn, full sporbarhet og sanntidsoversikt over bigårder og sykdomsstatus.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10">
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Card 1: Inspeksjon */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Tilsyn & Inspeksjon</h2>
            <p className="text-gray-600 mb-6">
              Få tilgang til digitale inspeksjonslogger, avviksmeldinger og historikk for alle registrerte bigårder.
            </p>
            <button className="text-blue-600 font-bold hover:underline">
              Logg inn for innsyn →
            </button>
          </div>

          {/* Card 2: Smittevern */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
            <div className="bg-red-50 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
              <Map className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Smittekart & Varsling</h2>
            <p className="text-gray-600 mb-6">
              Se utbrudd i sanntid, opprett soner og send varsler til birøktere i berørte områder automatisk.
            </p>
            <button className="text-blue-600 font-bold hover:underline">
              Se smittekart →
            </button>
          </div>

        </div>

        <div className="mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Om Biens Vokter for Myndigheter</h3>
          <p className="text-gray-600 leading-relaxed">
            Biens Vokter er utviklet for å sikre full åpenhet og trygghet i norsk honningproduksjon. 
            Gjennom vår plattform registreres alle hendelser i blokkjede-teknologi, som sikrer at data ikke kan manipuleres. 
            Dette gir Mattilsynet et unikt verktøy for å effektivisere sitt arbeid og sikre god dyrevelferd.
          </p>
        </div>
      </div>
    </div>
  );
}
