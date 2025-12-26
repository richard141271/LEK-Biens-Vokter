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
        {/* User requested removal of header login/dashboard button functionality */}
        <button 
          className="text-gray-400 font-medium bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 cursor-not-allowed opacity-50"
          title="Midlertidig deaktivert"
        >
          {user ? 'Oversikt' : 'Logg inn'}
        </button>
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
            {/* User requested removal of main CTA functionality */}
            <button 
              className="bg-gray-300 text-white font-bold py-3 px-8 rounded-full cursor-not-allowed flex items-center gap-2 opacity-50"
              title="Midlertidig deaktivert"
            >
              {user ? 'Gå til oversikt' : 'Prøv gratis'}
              <ArrowRight className="w-5 h-5" />
            </button>
            
            {/* "Lær mer" is now the new login button */}
            <Link 
              href="/signin"
              className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-full border border-gray-200 transition-colors"
            >
              Logg inn (Ny)
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
    </main>
  );
}
