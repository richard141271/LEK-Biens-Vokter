'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type Lesson = {
  title: string;
  minutes: number;
  description: string;
  steps: { title: string; items: string[] }[];
  links?: { label: string; href: string }[];
};

const LESSONS: Lesson[] = [
  {
    title: 'Del 1: Registrering og første oppsett',
    minutes: 20,
    description: 'Målet er at du kommer helt i gang: konto, innlogging, profil og første oversikt.',
    steps: [
      {
        title: 'Registrer deg',
        items: [
          'Åpne appen og velg Registrer.',
          'Fyll inn e-post og passord.',
          'Logg inn når kontoen er opprettet.',
        ],
      },
      {
        title: 'Første gang i appen',
        items: [
          'Gå til Min side og sjekk at du ser dine tall og snarveier.',
          'Gi appen nødvendige tillatelser (kamera/mikrofon/posisjon) når du blir spurt.',
          'Hvis du bruker handsfree: test at tale fungerer (si en enkel kommando).',
        ],
      },
    ],
    links: [
      { label: 'Gå til innlogging', href: '/login' },
      { label: 'Gå til registrering', href: '/register' },
      { label: 'Åpne Min side', href: '/dashboard' },
    ],
  },
  {
    title: 'Del 2: Opprett bigård (lokasjon)',
    minutes: 20,
    description: 'Målet er at du får opprettet minst én bigård og skjønner hvordan konto-kontekst fungerer.',
    steps: [
      {
        title: 'Opprett bigård',
        items: [
          'Gå til Bigårder.',
          'Velg Ny lokasjon / Opprett bigård.',
          'Sjekk at “Konto” i toppen er riktig før du lagrer (viktig hvis du er avløser).',
        ],
      },
      {
        title: 'For avløser (jobber for flere birøktere)',
        items: [
          'Bytt Konto i Bigårder-listen før du oppretter/registrerer noe.',
          'Husk: alt du oppretter må havne på riktig eier-konto.',
        ],
      },
    ],
    links: [
      { label: 'Åpne Bigårder', href: '/apiaries' },
      { label: 'Opprett ny bigård', href: '/apiaries/new' },
    ],
  },
  {
    title: 'Del 3: Opprett de første kubene',
    minutes: 20,
    description: 'Målet er at du får opprettet kuber på riktig lokasjon og skjønner nummerering og konto-valg.',
    steps: [
      {
        title: 'Registrer nye kuber',
        items: [
          'Gå til Min side og trykk NY KUBE.',
          'Velg konto (hvis du har flere).',
          'Velg riktig lokasjon (bigård).',
          'Velg antall kuber og trykk Opprett.',
        ],
      },
      {
        title: 'Sjekk at alt havnet riktig',
        items: [
          'Gå til Bikuber og bytt Konto hvis nødvendig.',
          'Sjekk at kubene ligger i riktig bigård.',
        ],
      },
    ],
    links: [
      { label: 'Åpne Bikuber', href: '/hives' },
      { label: 'Åpne Bigårder', href: '/apiaries' },
      { label: 'Åpne Min side', href: '/dashboard' },
    ],
  },
  {
    title: 'Del 4: Første inspeksjon (grunnflyt)',
    minutes: 20,
    description: 'Målet er at du kan registrere inspeksjon med/uten tale og at historikken blir riktig.',
    steps: [
      {
        title: 'Utfør inspeksjon',
        items: [
          'Åpne en kube fra Bikuber.',
          'Trykk Ny inspeksjon.',
          'Fyll inn status/notater og eventuelt dronningfarge/årgang.',
          'Ta bilde (knapp eller tale).',
          'Lagre inspeksjon.',
        ],
      },
      {
        title: 'Kontroller resultatet',
        items: [
          'Sjekk at Inspeksjonshistorikk viser registreringen.',
          'Sjekk at Logg viser “INSPEKSJON”.',
          'Hvis du er avløser: inspeksjonen skal vises hos eier i historikken.',
        ],
      },
    ],
    links: [{ label: 'Åpne Bikuber', href: '/hives' }],
  },
  {
    title: 'Del 5: Videre opplæring (blokker á ca. 20 minutter)',
    minutes: 20,
    description: 'Dette er planen for resten av temadagen. Hver blokk kan kjøres som en egen økt.',
    steps: [
      {
        title: 'Forslag til videre moduler',
        items: [
          'Massehandlinger: registrer inspeksjon/logg på flere kuber samtidig.',
          'Egensertifisering på bigård: sjekkliste, bildekrav, gyldighet og varsler.',
          'Rapporter: hva som lagres hvor, og hvordan man finner igjen historikk.',
          'Avløser-arbeid: konto-kontekst, tilgangsstyring og avslutte tilgang.',
          'Offline-modus: hva som lagres lokalt og hvordan synk fungerer.',
          'Skanning/QR: inn/ut av kubevisning, og praktisk bruk i felt.',
        ],
      },
    ],
  },
];

export default function AdminTemadagPage() {
  const ACTIVE_OWNER_KEY = 'lek_active_owner_id';
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isStaging, setIsStaging] = useState(false);
  const [startingDemo, setStartingDemo] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);
  const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);
  const [demoResetResult, setDemoResetResult] = useState<string | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        router.push('/admin');
        return;
      }

      setLoading(false);
    };
    run().catch(() => setLoading(false));
  }, [router, supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname.toLowerCase();
    setIsStaging(host === 'staging.lekbie.no' || host.startsWith('staging.') || host === 'localhost' || host === '127.0.0.1');

    const storedSessionId = window.localStorage.getItem('lek_demo_session_id');
    const storedExpiresAt = window.localStorage.getItem('lek_demo_session_expires_at');
    const storedDemoOwnerId = window.localStorage.getItem('lek_demo_owner_id');
    if (storedSessionId) setDemoSessionId(storedSessionId);
    if (storedExpiresAt) setDemoExpiresAt(storedExpiresAt);
    if (storedDemoOwnerId) {
      try {
        window.localStorage.setItem(ACTIVE_OWNER_KEY, storedDemoOwnerId);
      } catch {}
    }
  }, []);

  const totalMinutes = useMemo(() => LESSONS.reduce((sum, l) => sum + l.minutes, 0), []);
  const canNavigate = Boolean(isStaging && demoSessionId);
  const activeLesson = LESSONS[activeLessonIndex] || LESSONS[0];
  const progressPercent = LESSONS.length > 0 ? Math.round(((activeLessonIndex + 1) / LESSONS.length) * 100) : 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const elements = LESSONS.map((_, idx) => document.getElementById(`del-${idx + 1}`)).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!visible) return;
        const id = String((visible.target as HTMLElement)?.id || '');
        const match = id.match(/^del-(\d+)$/);
        if (!match) return;
        const idx = Math.max(0, Math.min(LESSONS.length - 1, parseInt(match[1], 10) - 1));
        setActiveLessonIndex(idx);
      },
      { root: null, threshold: [0.2, 0.35, 0.5, 0.65] }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const requestFullscreen = async () => {
    try {
      if (typeof document === 'undefined') return;
      if (document.fullscreenElement) return;
      await document.documentElement.requestFullscreen();
    } catch {
      // ignore
    }
  };

  const startDemo = async () => {
    setDemoError(null);
    setDemoResetResult(null);
    setStartingDemo(true);
    try {
      await requestFullscreen();
      const res = await fetch('/api/demo/session/start', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-lek-demo-source': 'temadag',
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setDemoError(data?.error || 'Kunne ikke starte demo');
        return;
      }

      const sessionId = String(data?.session?.id || '');
      const expiresAt = String(data?.session?.expiresAt || '');
      const token = String(data?.token || '');
      const demoOwnerId = String(data?.demoOwnerId || '');

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lek_demo_session_id', sessionId);
        window.localStorage.setItem('lek_demo_session_expires_at', expiresAt);
        window.localStorage.setItem('lek_demo_session_token', token);
        if (demoOwnerId) {
          window.localStorage.setItem('lek_demo_owner_id', demoOwnerId);
          window.localStorage.setItem(ACTIVE_OWNER_KEY, demoOwnerId);
        }
      }

      setDemoSessionId(sessionId || null);
      setDemoExpiresAt(expiresAt || null);
    } catch {
      setDemoError('Kunne ikke starte demo');
    } finally {
      setStartingDemo(false);
    }
  };

  const resetDemo = async () => {
    setDemoError(null);
    setDemoResetResult(null);

    if (!demoSessionId) {
      setDemoError('Ingen aktiv demo-session');
      return;
    }

    const ok = typeof window !== 'undefined' ? window.confirm('Avslutt og nullstill demo?\n\nAll demo-data slettes nå.') : false;
    if (!ok) return;

    setResettingDemo(true);
    try {
      const res = await fetch('/api/demo/session/reset', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-lek-demo-source': 'temadag',
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setDemoError(data?.error || 'Kunne ikke nullstille demo');
        return;
      }

      let userId = '';
      try {
        const { data: authData } = await supabase.auth.getUser();
        userId = String(authData?.user?.id || '');
      } catch {}

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('lek_demo_session_id');
        window.localStorage.removeItem('lek_demo_session_expires_at');
        window.localStorage.removeItem('lek_demo_session_token');
        window.localStorage.removeItem('lek_demo_owner_id');
        if (userId) window.localStorage.setItem(ACTIVE_OWNER_KEY, userId);
      }

      setDemoSessionId(null);
      setDemoExpiresAt(null);
      const d = data?.deleted || {};
      setDemoResetResult(
        `Slettet: bigårder ${Number(d.apiaries || 0)}, kuber ${Number(d.hives || 0)}, inspeksjoner ${Number(
          d.inspections || 0
        )}, logger ${Number(d.logs || 0)}, bilder ${Number(d.images || 0)}.`
      );
    } catch {
      setDemoError('Kunne ikke nullstille demo');
    } finally {
      setResettingDemo(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Laster temadag…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-[#111827] text-white py-6 px-6 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Temadag</h1>
            <p className="text-gray-400 text-sm">Opplæring og bruksanvisning (steg for steg)</p>
          </div>
          <Link href="/dashboard/admin" className="text-sm font-semibold text-gray-300 hover:text-white hover:underline">
            ← Tilbake
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Del {activeLessonIndex + 1}/{LESSONS.length}</div>
              <div className="font-bold text-gray-900 truncate">{activeLesson?.title}</div>
              <div className="text-sm text-gray-600">{activeLesson?.description}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startDemo}
                disabled={!isStaging || startingDemo}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:bg-gray-400"
              >
                {startingDemo ? 'Starter demo…' : 'Start demo'}
              </button>
              <button
                type="button"
                onClick={resetDemo}
                disabled={!demoSessionId || resettingDemo}
                className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-bold disabled:bg-gray-400"
              >
                {resettingDemo ? 'Nullstiller…' : 'Avslutt og nullstill demo'}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-honey-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {LESSONS.map((l, idx) => {
                const isActive = idx === activeLessonIndex;
                return (
                  <a
                    key={l.title}
                    href={`#del-${idx + 1}`}
                    className={
                      isActive
                        ? 'px-2 py-1 rounded-full bg-gray-900 text-white font-bold'
                        : 'px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  >
                    {idx + 1}
                  </a>
                );
              })}
            </div>
          </div>

          {demoSessionId ? (
            <div className="mt-4 text-sm text-gray-700">
              Demo-session: <span className="font-bold">{demoSessionId}</span>
              {demoExpiresAt ? <span className="text-gray-500"> (utløper {demoExpiresAt})</span> : null}
            </div>
          ) : (
            <div className="mt-4 text-sm text-gray-600">Ingen aktiv demo-session ennå.</div>
          )}
          {demoError ? <div className="mt-3 text-sm text-red-700">{demoError}</div> : null}
          {demoResetResult ? <div className="mt-3 text-sm text-emerald-700">{demoResetResult}</div> : null}
        </section>

        {!isStaging ? (
          <section className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Demo-modus</h2>
            <div className="mt-2 text-sm text-gray-700">
              Temadag er låst til staging og kan ikke kjøres herfra.
            </div>
          </section>
        ) : (
          <section className="bg-white border border-yellow-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Demo-modus</h2>
            <div className="mt-2 text-sm text-gray-700">
              For å unngå at opplæringen blander seg med ekte data, er demo-flyt og “Nullstill demo” låst bak egne
              sikkerhetsregler. Navigasjonsknappene aktiveres når demo-sesjoner er på plass.
            </div>
            <div className="mt-4 text-sm text-gray-700">
              Tips: Start demo først. Deretter blir “Fortsett”-knappene aktive og åpner ekte sider i appen i demo-modus.
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Oversikt</h2>
          <div className="mt-2 text-sm text-gray-600">
            Start med registrering, opprett bigård og de første kubene. Fortsett i økter á ca. 20 minutter.
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Antall økter</div>
              <div className="font-bold text-gray-900">{LESSONS.length}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Varighet (ca.)</div>
              <div className="font-bold text-gray-900">{totalMinutes} min</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Anbefalt</div>
              <div className="font-bold text-gray-900">Kjør i felt + skjerm</div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Testing-sjekkliste før kurs</h2>
          <div className="mt-2 text-sm text-gray-700">
            Kjør dette én gang før dere starter kurs for å være sikker på at demo-flyten fungerer og at nullstilling faktisk sletter alt.
          </div>
          <ol className="mt-4 list-decimal pl-5 text-sm text-gray-800 space-y-2">
            <li>
              Trykk <span className="font-bold">Start demo</span> og verifiser at demo-banner vises når du åpner app-sider (Demo-modus aktiv).
            </li>
            <li>
              Åpne <span className="font-bold">Bigårder</span> → <span className="font-bold">Ny lokasjon</span> og opprett én bigård.
            </li>
            <li>
              Åpne <span className="font-bold">Min side</span> → <span className="font-bold">NY KUBE</span> og opprett 2–3 kuber på bigården.
            </li>
            <li>
              Åpne <span className="font-bold">Bikuber</span>, åpne en kube og lagre en <span className="font-bold">Ny inspeksjon</span>.
            </li>
            <li>
              Verifiser: på kube-detalj → <span className="font-bold">Historikk</span> viser inspeksjonen, og <span className="font-bold">Logg</span> viser “INSPEKSJON”.
            </li>
            <li>
              Trykk <span className="font-bold">Avslutt og nullstill demo</span> (på toppen eller nederst).
            </li>
            <li>
              Bekreft at alt er borte:
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Bigårder: listen er tom (eller viser ikke bigården du nettopp laget).</li>
                <li>Bikuber: listen er tom (eller viser ikke kubene du nettopp laget).</li>
                <li>Åpner du samme kube-lenke på nytt: den skal feile/ikke finnes i demo.</li>
              </ul>
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {canNavigate ? (
              <Link href="/dashboard?demo=1" className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold">
                Åpne Min side
              </Link>
            ) : (
              <button type="button" disabled className="px-3 py-2 rounded-lg bg-gray-300 text-white text-sm font-bold cursor-not-allowed">
                Åpne Min side
              </button>
            )}
            {canNavigate ? (
              <Link href="/apiaries?demo=1" className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold">
                Åpne Bigårder
              </Link>
            ) : (
              <button type="button" disabled className="px-3 py-2 rounded-lg bg-gray-300 text-white text-sm font-bold cursor-not-allowed">
                Åpne Bigårder
              </button>
            )}
            {canNavigate ? (
              <Link href="/hives?demo=1" className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold">
                Åpne Bikuber
              </Link>
            ) : (
              <button type="button" disabled className="px-3 py-2 rounded-lg bg-gray-300 text-white text-sm font-bold cursor-not-allowed">
                Åpne Bikuber
              </button>
            )}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Agenda</h2>
          <div className="mt-3 grid gap-2">
            {LESSONS.map((l, idx) => (
              <a
                key={l.title}
                href={`#del-${idx + 1}`}
                className="rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-gray-900">
                    {idx + 1}. {l.title}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">{l.minutes} min</div>
                </div>
                <div className="mt-1 text-sm text-gray-600">{l.description}</div>
              </a>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {LESSONS.map((l, idx) => (
            <section key={l.title} id={`del-${idx + 1}`} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {idx + 1}. {l.title}
                  </h2>
                  <div className="mt-1 text-sm text-gray-600">{l.description}</div>
                </div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{l.minutes} min</div>
              </div>

              {l.links && l.links.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(() => {
                    const primary = l.links?.[0];
                    if (!primary) return null;
                    const hrefWithDemo = primary.href.includes('?') ? `${primary.href}&demo=1` : `${primary.href}?demo=1`;
                    return canNavigate ? (
                      <Link
                        key={`${l.title}-primary`}
                        href={hrefWithDemo}
                        className="px-4 py-2 rounded-lg bg-honey-600 text-white text-sm font-bold"
                      >
                        Fortsett
                      </Link>
                    ) : (
                      <button
                        key={`${l.title}-primary`}
                        type="button"
                        disabled
                        className="px-4 py-2 rounded-lg bg-gray-400 text-white text-sm font-bold cursor-not-allowed"
                      >
                        Fortsett
                      </button>
                    );
                  })()}
                  {l.links.map((x) => {
                    const hrefWithDemo = x.href.includes('?') ? `${x.href}&demo=1` : `${x.href}?demo=1`;
                    return canNavigate ? (
                      <Link
                        key={`${l.title}-${x.href}`}
                        href={hrefWithDemo}
                        className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold"
                      >
                        {x.label}
                      </Link>
                    ) : (
                      <button
                        key={`${l.title}-${x.href}`}
                        type="button"
                        disabled
                        className="px-3 py-2 rounded-lg bg-gray-400 text-white text-sm font-bold cursor-not-allowed"
                      >
                        {x.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {l.steps.map((s) => (
                  <details key={`${l.title}-${s.title}`} className="rounded-xl border border-gray-200 p-4">
                    <summary className="cursor-pointer font-bold text-gray-900">{s.title}</summary>
                    <ul className="mt-3 list-disc pl-5 text-sm text-gray-700 space-y-1">
                      {s.items.map((it) => (
                        <li key={`${l.title}-${s.title}-${it}`}>{it}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Demo ferdig</h2>
          <div className="mt-2 text-sm text-gray-700">
            Når dere er ferdige, nullstill demoen så neste kurs starter blankt.
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={resetDemo}
              disabled={!demoSessionId || resettingDemo}
              className="px-5 py-3 rounded-lg bg-red-700 text-white text-sm font-bold disabled:bg-gray-400"
            >
              {resettingDemo ? 'Nullstiller…' : 'Avslutt og nullstill demo'}
            </button>
            {demoResetResult ? <div className="text-sm text-emerald-700">{demoResetResult}</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
