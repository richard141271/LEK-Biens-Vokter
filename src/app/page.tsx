'use client';

import Link from "next/link";
import { Zap, CheckCircle, Heart, Users, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import InstallPrompt from "@/components/InstallPrompt";
import Image from "next/image";

const PRIORITY_FEATURES = [
  'VarroaScan™',
  'AI-inspeksjon',
  'Stemmestyrt registrering',
  'Sensornoder',
  'Bigårdsovervåkning',
] as const;

const PRIORITY_VOTES_STORAGE_KEY = 'lek_priority_votes_selected';
const PRIORITY_VISITOR_ID_STORAGE_KEY = 'lek_priority_votes_visitor_id';
const MAX_PRIORITY_VOTES = 3;

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [priorityVotes, setPriorityVotes] = useState<string[]>([]);
  const [priorityVisitorId, setPriorityVisitorId] = useState('');
  const [prioritySubmitting, setPrioritySubmitting] = useState<string | null>(null);
  const [priorityMessage, setPriorityMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const isStockHost = typeof window !== 'undefined' && window.location.hostname.toLowerCase().startsWith('aksjer.');

  useEffect(() => {
    if (isStockHost) {
      window.location.replace('/signin');
      return;
    }

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, [supabase, isStockHost]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const createVisitorId = () => {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    try {
      const rawVotes = window.localStorage.getItem(PRIORITY_VOTES_STORAGE_KEY);
      if (rawVotes) {
        const parsed = JSON.parse(rawVotes);
        if (Array.isArray(parsed)) {
          setPriorityVotes(parsed.filter((item) => PRIORITY_FEATURES.includes(item)).slice(0, MAX_PRIORITY_VOTES));
        }
      }

      let visitorId = window.localStorage.getItem(PRIORITY_VISITOR_ID_STORAGE_KEY) || '';
      if (!visitorId) {
        visitorId = createVisitorId();
        window.localStorage.setItem(PRIORITY_VISITOR_ID_STORAGE_KEY, visitorId);
      }
      setPriorityVisitorId(visitorId);
    } catch {}
  }, []);

  const registerPriorityVote = async (feature: string) => {
    if (!priorityVisitorId || prioritySubmitting) return;
    if (priorityVotes.includes(feature)) {
      setPriorityMessage(`Du har allerede valgt ${feature}.`);
      return;
    }
    if (priorityVotes.length >= MAX_PRIORITY_VOTES) {
      setPriorityMessage('Du har brukt opp dine 3 stemmer. Takk for at du bidrar til utviklingen.');
      return;
    }

    setPrioritySubmitting(feature);
    setPriorityMessage(null);

    try {
      const res = await fetch('/api/feedback/priority-vote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          feature,
          visitorId: priorityVisitorId,
          route: typeof window !== 'undefined' ? window.location.pathname : '/',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Kunne ikke registrere prioritering');
      }

      const nextVotes = [...priorityVotes, feature];
      setPriorityVotes(nextVotes);
      try {
        window.localStorage.setItem(PRIORITY_VOTES_STORAGE_KEY, JSON.stringify(nextVotes));
      } catch {}

      if (nextVotes.length >= MAX_PRIORITY_VOTES) {
        setPriorityMessage('Du har brukt opp dine 3 stemmer. Takk for at du bidrar til utviklingen.');
      } else {
        setPriorityMessage(`Takk. ${feature} er registrert som en prioritering.`);
      }
    } catch (e: any) {
      setPriorityMessage(e?.message || 'Kunne ikke registrere prioritering akkurat nå.');
    } finally {
      setPrioritySubmitting(null);
    }
  };

  if (isStockHost) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-600">
        Laster...
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col relative bg-white">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-6xl mx-auto z-10">
        <div className="font-bold text-xl text-gray-900 flex items-center gap-2">
          <Image src="/icon.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" /> Biens Vokter
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
            – vi gir deg verktøyene du trenger. AI-drevet analyse av bigårder, sensordata og inspeksjoner, samlet på ett sted.
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
                <Image src="/icon.png" alt="Biens Vokter Våpenskjold" fill sizes="600px" className="object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
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

          {/* Grunneier-kort */}
          <div className="mt-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group relative">
            <div className="h-48 bg-slate-50 flex items-center justify-center relative overflow-hidden p-4">
              <Image src="/icon.png" alt="Biens Vokter Våpenskjold" fill sizes="600px" className="object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Er du grunneier?</h2>
              <p className="text-gray-600 mb-4">
                Få oversikt og kontroll over bigårder på din eiendom med grunneierportalen.
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Se kart og status for bigårder du er knyttet til
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Godkjenn avtaler og oppdater kontaktinfo
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Enkel innlogging med engangslenke eller passord
                </li>
              </ul>
              <div className="flex gap-3">
                <Link
                  href="/grunneier?auth=signin"
                  className="flex-1 text-center bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                >
                  Logg inn
                </Link>
                <Link
                  href="/grunneier?auth=signup"
                  className="flex-1 text-center bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl transition-colors"
                >
                  Opprett konto
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
              Vi kobler teknologi med tradisjon for å sikre bienes fremtid – med AI-innsikt, historikk og bedre flyt i inspeksjonene.
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

      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Under utvikling</h2>
            <p className="text-gray-600 mb-6">
              Klikk på opptil 3 funksjoner du ønsker at vi skal prioritere videre.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRIORITY_FEATURES.map((item) => {
                const isSelected = priorityVotes.includes(item);
                const selectedRank = isSelected ? priorityVotes.indexOf(item) + 1 : null;
                const isDisabled = !isSelected && priorityVotes.length >= MAX_PRIORITY_VOTES;
                const isSaving = prioritySubmitting === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => registerPriorityVote(item)}
                    disabled={isDisabled || isSaving || !priorityVisitorId}
                    className={`text-left rounded-xl px-4 py-4 border transition-all ${
                      isSelected
                        ? 'bg-green-50 border-green-300 shadow-sm'
                        : isDisabled
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <CheckCircle className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-gray-300'}`} />
                        {selectedRank ? (
                          <span className="absolute -top-2 -right-2 bg-green-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                            {selectedRank}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900">{item}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {isSelected ? `Valgt (#${selectedRank})` : isSaving ? 'Registrerer…' : 'Klikk for å prioritere'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="text-sm text-gray-600">
                Valgt: <span className="font-bold text-gray-900">{priorityVotes.length}</span> / {MAX_PRIORITY_VOTES}
              </div>
              {priorityMessage ? (
                <div className={`text-sm rounded-xl px-4 py-3 border ${
                  priorityVotes.length >= MAX_PRIORITY_VOTES
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {priorityMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Image src="/icon.png" alt="Logo" width={40} height={40} className="w-10 h-10 object-contain" />
            <span className="font-bold text-xl">Biens Vokter</span>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 text-sm">
            <div className="text-gray-400">
              © {new Date().getFullYear()} AI Innovate AS. Alle rettigheter reservert.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
