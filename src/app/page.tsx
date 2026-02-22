'use client';

import Link from "next/link";
import { ArrowRight, Zap, ShieldCheck, CheckCircle, Heart, Users, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import InstallPrompt from "@/components/InstallPrompt";

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
    <main className="min-h-screen flex flex-col relative bg-white">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-6xl mx-auto z-10">
        <div className="font-bold text-xl text-gray-900 flex items-center gap-2">
          <img src="/icon.png" alt="Logo" className="w-8 h-8 object-contain" /> Biens Vokter
        </div>

        <div className="flex items-center gap-6">
            <InstallPrompt mode="inline" />
            {user ? (
              <Link 
                href="/dashboard"
                className="text-gray-900 font-medium hover:text-orange-600 transition-colors"
              >
                Gå til Min Side
              </Link>
            ) : (
              <Link 
                href="/signin"
                className="text-gray-900 font-medium hover:text-orange-600 transition-colors"
              >
                Logg inn
              </Link>
            )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-honey-100 to-white pt-32 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Bier, Honning og Teknologi <br/>
            <span className="text-orange-600">- for Alle</span>
          </h1>
          <p className="text-xl text-gray-700 mb-12 max-w-2xl mx-auto leading-relaxed">
            Enten du driver birøkt, utvikler bigårder eller jobber med mattrygghet 
            – vi gir deg verktøyene du trenger.
          </p>
        </div>
      </section>

      {/* Segmentation Section - Birøkter */}
      <section className="pb-24 px-4 -mt-10">
        <div className="max-w-4xl mx-auto">
          {/* Birøkter-kort */}
          <div className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group relative">
            <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-20">
              POPULÆRT
            </div>
            <div className="h-48 bg-orange-50 flex items-center justify-center relative overflow-hidden p-4">
                <img src="/icon.png" alt="Biens Vokter Våpenskjold" className="h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Er du birøkter?</h2>
              <p className="text-gray-600 mb-6 min-h-[80px]">
                Effektiviser driften med stemmestyrt inspeksjon og AI-innsikt. 
                Full kontroll over bigårdene dine, rett fra lomma.
              </p>
              <div className="flex gap-3">
                <Link 
                  href="/signin"
                  className="flex-1 text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                >
                  Logg inn
                </Link>
                <Link 
                  href="/register"
                  className="flex-1 text-center bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-bold py-3 px-4 rounded-xl transition-colors"
                >
                  Registrer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlight Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Hvorfor velge Biens Vokter?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Vi kobler teknologi med tradisjon for å sikre bienes fremtid.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 text-orange-600">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Handsfree</h3>
              <p className="text-sm text-gray-600">Stemmestyrt registrering gjør at du kan jobbe uten å ta av hanskene.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 text-green-600">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Dyrevelferd</h3>
              <p className="text-sm text-gray-600">Bedre oversikt gir friskere bier og raskere oppdagelse av sykdom.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Sporbarhet</h3>
              <p className="text-sm text-gray-600">Full historikk på hver enkelt kube, fra dronning til honning.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">Fellesskap</h3>
              <p className="text-sm text-gray-600">Koble deg til lokale birøktere og lær av hverandre.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-xl">Biens Vokter</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 text-sm">
            <div className="text-gray-400">
              © {new Date().getFullYear()} AI Innovate AS. Alle rettigheter reservert.
            </div>
            <div className="flex gap-4 text-xs">
              <Link 
                href="/lei-en-kube" 
                className="text-gray-400 hover:text-white hover:underline"
              >
                Lei en kube
              </Link>
              <Link 
                href="/mattilsynet" 
                className="text-gray-400 hover:text-white hover:underline"
              >
                Mattilsynet
              </Link>
              <Link 
                href="/admin" 
                className="text-gray-400 hover:text-white hover:underline"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
