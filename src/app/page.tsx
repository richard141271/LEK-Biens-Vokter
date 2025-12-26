'use client';

import Link from "next/link";
import { ArrowRight, Zap, ShieldCheck, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-6xl mx-auto z-10">
        <div className="font-bold text-xl text-gray-900 flex items-center gap-2">
          <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-full" /> Biens Vokter
        </div>
        
        {user ? (
          <Link 
            href="/dashboard"
            className="text-gray-900 font-medium hover:text-orange-600 transition-colors"
          >
            Oversikt
          </Link>
        ) : (
          <Link 
            href="/signin"
            className="text-gray-900 font-medium hover:text-orange-600 transition-colors"
          >
            Logg inn
          </Link>
        )}
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
            {user ? (
              <Link 
                href="/dashboard"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Gå til oversikt
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link 
                href="/signin"
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Logg inn
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            
            <Link 
              href="/about" 
              className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-full border border-gray-200 transition-colors"
            >
              Lær mer
            </Link>
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
              <h3 className="text-xl font-bold mb-3 text-gray-900">Alltid tilgjengelig</h3>
              <p className="text-gray-600">
                Fungerer offline og synkroniserer når du er tilbake i dekning.
                Aldri mist data igjen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Plan Section */}
      <section className="py-16 px-4 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Vår Plan mot 100% Autonomi</h2>
          <div className="space-y-8">
            
            {/* Step 1 - Active */}
            <div className="relative flex gap-6 p-6 bg-white rounded-2xl shadow-lg border-2 border-honey-500 transform scale-105">
              <div className="absolute -top-3 -right-3 bg-honey-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                VI ER HER
              </div>
              <div className="flex-shrink-0 w-16 h-16 bg-honey-100 rounded-full flex items-center justify-center text-2xl font-bold text-honey-600 border-4 border-honey-200">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Digitalisering & Kontroll</h3>
                <p className="text-gray-600">
                  Full digital oversikt over bigårder og kuber. QR-sporing, masseregistrering og 
                  handsfree inspeksjon. Vi bygger fundamentet for datadrevet birøkt.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 p-6 bg-white/50 rounded-2xl border border-gray-200 opacity-75">
              <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-400">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sensorikk & Varsling</h3>
                <p className="text-gray-600">
                  Integrasjon av smarte vekter og fuktsensorer. AI Aurora begynner å lære 
                  av kubenes adferd og gir prediktive varsler om sverm og trekk.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 p-6 bg-white/50 rounded-2xl border border-gray-200 opacity-75">
              <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl font-bold text-gray-400">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Total Autonomi</h3>
                <p className="text-gray-600">
                  Selvstyrende kuber med robotisert høsting og logistikk. 
                  Bikubene bestiller selv tømming. Birøkteren blir prosessoperatør.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
