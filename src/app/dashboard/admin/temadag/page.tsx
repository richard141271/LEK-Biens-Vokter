'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type PosterDef = {
  key: string;
  title: string;
  filenames: string[];
  orientation?: 'landscape' | 'portrait';
};

type Slide = {
  id: string;
  title: string;
  kind: 'poster' | 'split' | 'end';
  posterKey?: string;
  posterPrefer?: 'nr' | 'sta';
  appHref?: string;
  body?: string[];
};

const POSTER_BASE_PATH = '/Temadag%20plakater/';

const POSTERS: PosterDef[] = [
  { key: '0', title: 'Forside', filenames: ['nr0.png', 'nr0.jpg', 'nr0.jpeg'] },
  { key: '1', title: 'Registrer deg', filenames: ['nr1.png', 'nr1.jpg', 'nr1.jpeg'] },
  { key: '2', title: 'Logg inn', filenames: ['nr2.png', 'nr2.jpg', 'nr2.jpeg'] },
  { key: '3', title: 'Min side', filenames: ['nr3.png', 'nr3.jpg', 'nr3.jpeg'] },
  { key: '4', title: 'Opprett bigård', filenames: ['nr4.png', 'nr4.jpg', 'nr4.jpeg'] },
  { key: '5', title: 'Opprett kuber', filenames: ['nr5.png', 'nr5.jpg', 'nr5.jpeg'] },
  { key: '6', title: 'Plakat 6', filenames: ['nr6.png', 'nr6.jpg', 'nr6.jpeg'] },
  { key: '7', title: 'Plakat 7', filenames: ['nr7.png', 'nr7.jpg', 'nr7.jpeg'] },
  { key: '8', title: 'Plakat 8', filenames: ['nr8.png', 'nr8.jpg', 'nr8.jpeg'] },
  { key: '9', title: 'Plakat 9', filenames: ['nr9.png', 'nr9.jpg', 'nr9.jpeg'] },
  { key: '9.5', title: 'Takk for i dag', filenames: ['nr9,5.png', 'nr9.5.png', 'nr9_5.png', 'nr9,5.jpg', 'nr9.5.jpg', 'nr9_5.jpg'] },
  { key: '10', title: 'Plakat 10', filenames: ['nr10.png', 'nr10.jpg', 'nr10.jpeg'] },
];

const buildPosterSrc = (filename: string) => `${POSTER_BASE_PATH}${encodeURIComponent(filename)}`;

const posterFilesFor = (posterKey: string, prefer: 'nr' | 'sta') => {
  const def = POSTERS.find((p) => p.key === posterKey) || null;
  const nr = def?.filenames || [];
  const sta =
    posterKey === '9.5'
      ? ['sta9,5.png', 'sta9.5.png', 'sta9_5.png', 'sta9,5.jpg', 'sta9.5.jpg', 'sta9_5.jpg']
      : [`sta${posterKey}.png`, `sta${posterKey}.jpg`, `sta${posterKey}.jpeg`];
  const ordered = prefer === 'sta' ? [...sta, ...nr] : [...nr, ...sta];
  return Array.from(new Set(ordered));
};

const withDemoQuery = (href: string) => {
  const [path, query] = href.split('?', 2);
  const params = new URLSearchParams(query || '');
  if (!params.has('demo')) params.set('demo', '1');
  return `${path}?${params.toString()}`;
};

function PosterImage({ title, filenames, className }: { title: string; filenames: string[]; className: string }) {
  const [filenameIndex, setFilenameIndex] = useState(0);

  useEffect(() => setFilenameIndex(0), [filenames.join('|')]);

  if (filenames.length === 0) return null;

  const filename = filenames[Math.min(filenameIndex, filenames.length - 1)];
  const src = buildPosterSrc(filename);

  return (
    <img
      src={src}
      alt={title}
      className={className}
      onError={() => {
        setFilenameIndex((p) => (p + 1 < filenames.length ? p + 1 : p));
      }}
    />
  );
}

function PhoneFrame({ href, title, scaleFactor }: { href: string; title: string; scaleFactor: number }) {
  const src = useMemo(() => withDemoQuery(href), [href]);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;

    const baseW = 440;
    const baseH = 940;

    const compute = (w: number, h: number) => {
      const availableW = Math.max(240, w - 24);
      const availableH = Math.max(240, h - 24);
      const auto = Math.min(3, Math.max(0.55, Math.min(availableH / baseH, availableW / baseW)));
      const combined = Math.min(3, Math.max(0.5, auto * (Number.isFinite(scaleFactor) ? scaleFactor : 1)));
      setScale(combined);
    };

    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      compute(rect.width, rect.height);
    });

    ro.observe(el);
    compute(el.clientWidth, el.clientHeight);
    return () => ro.disconnect();
  }, [scaleFactor]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <div className="bg-black rounded-[2.5rem] p-3 shadow-2xl border border-white/10">
          <div className="bg-black rounded-[2rem] p-2">
            <div className="bg-white rounded-[1.6rem] overflow-hidden">
              <div className="w-[390px] h-[844px] bg-white">
                <iframe key={src} title={title} src={src} className="w-full h-full border-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTemadagPage() {
  const ACTIVE_OWNER_KEY = 'lek_active_owner_id';
  const SLIDE_KEY = 'lek_temadag_slide_index';
  const PHONE_SCALE_KEY = 'lek_temadag_phone_scale';
  const COURSE_ACTIVE_KEY = 'lek_demo_course_active';
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isDemoAllowed, setIsDemoAllowed] = useState(false);
  const [startingDemo, setStartingDemo] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [cleaningTemadag, setCleaningTemadag] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);
  const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);
  const [demoResetResult, setDemoResetResult] = useState<string | null>(null);
  const [temadagCleanupResult, setTemadagCleanupResult] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [phoneScale, setPhoneScale] = useState(1);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const isAdmin = profile?.role === 'admin';
      setIsInstructor(isAdmin);

      let hasDemoSession = false;
      if (typeof window !== 'undefined') {
        const sid = window.localStorage.getItem('lek_demo_session_id');
        const tok = window.localStorage.getItem('lek_demo_session_token');
        hasDemoSession = Boolean(sid && tok);
      }

      if (!isAdmin && !hasDemoSession) {
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
    const staging = host === 'staging.lekbie.no' || host.startsWith('staging.') || host === 'localhost' || host === '127.0.0.1';
    const override =
      process.env.NEXT_PUBLIC_LEK_DEMO_ENABLED === '1' || process.env.NEXT_PUBLIC_LEK_DEMO_ENABLED === 'true';
    setIsDemoAllowed(staging || override);

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

    const storedSlide = window.localStorage.getItem(SLIDE_KEY);
    if (storedSlide) {
      const idx = Number(storedSlide);
      if (Number.isFinite(idx) && idx >= 0) setSlideIndex(idx);
    }

    const storedPhoneScale = window.localStorage.getItem(PHONE_SCALE_KEY);
    if (storedPhoneScale) {
      const v = Number(storedPhoneScale);
      if (Number.isFinite(v) && v > 0) setPhoneScale(Math.min(3, Math.max(0.5, v)));
    }
  }, []);

  const canNavigate = Boolean(isDemoAllowed && demoSessionId);

  const requestFullscreen = async () => {
    try {
      if (typeof document === 'undefined') return;
      if (document.fullscreenElement) return;
      await document.documentElement.requestFullscreen();
    } catch {
      // ignore
    }
  };

  const slides: Slide[] = useMemo(
    () => [
      { id: 'poster-0', title: 'Forside', kind: 'poster', posterKey: '0', posterPrefer: 'nr' },
      { id: 'split-1', title: 'Registrering', kind: 'split', posterKey: '1', posterPrefer: 'sta', appHref: '/register', body: ['Vis registrering på høyre side.', 'Tips: bruk en test-epost.'] },
      { id: 'poster-2', title: 'Logg inn', kind: 'poster', posterKey: '2', posterPrefer: 'nr' },
      { id: 'split-3', title: 'Min side', kind: 'split', posterKey: '3', posterPrefer: 'sta', appHref: '/dashboard', body: ['Vis Min side og snarveier.', 'Når demo er aktiv: demo-banner skal vises.'] },
      { id: 'poster-4', title: 'Opprett bigård', kind: 'poster', posterKey: '4', posterPrefer: 'nr' },
      { id: 'split-4b', title: 'Opprett bigård (demo)', kind: 'split', posterKey: '4', posterPrefer: 'sta', appHref: '/apiaries/new', body: ['Opprett én bigård i demo.', 'Kartet skal starte nær posisjon (eller fallback Norge).'] },
      { id: 'poster-5', title: 'Opprett kuber', kind: 'poster', posterKey: '5', posterPrefer: 'nr' },
      { id: 'split-5b', title: 'Opprett kuber (demo)', kind: 'split', posterKey: '5', posterPrefer: 'sta', appHref: '/dashboard', body: ['Trykk NY KUBE og opprett 2–3 kuber.', 'Velg riktig bigård.'] },
      { id: 'poster-6', title: 'Plakat 6', kind: 'poster', posterKey: '6', posterPrefer: 'nr' },
      { id: 'split-7', title: 'Bikuber (demo)', kind: 'split', posterKey: '7', posterPrefer: 'sta', appHref: '/hives', body: ['Åpne Bikuber og vis at demo-data dukker opp.', 'Åpne en kube og vis historikk/logg.'] },
      { id: 'poster-8', title: 'Plakat 8', kind: 'poster', posterKey: '8', posterPrefer: 'nr' },
      { id: 'split-9', title: 'Ny inspeksjon (demo)', kind: 'split', posterKey: '9', posterPrefer: 'sta', appHref: '/hives', body: ['Åpne en kube → Ny inspeksjon.', 'Ta minst ett bilde og lagre.'] },
      { id: 'poster-9-5', title: 'Takk for i dag', kind: 'poster', posterKey: '9.5', posterPrefer: 'nr' },
      { id: 'end', title: 'Avslutt', kind: 'end', body: ['Når dere er ferdige: nullstill demo så neste kurs starter blankt.'] },
    ],
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SLIDE_KEY, String(slideIndex));
    } catch {}
  }, [SLIDE_KEY, slideIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PHONE_SCALE_KEY, String(phoneScale));
    } catch {}
  }, [PHONE_SCALE_KEY, phoneScale]);

  useEffect(() => {
    if (!playerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPlayerOpen(false);
        return;
      }
      if (e.key === 'ArrowLeft') setSlideIndex((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') setSlideIndex((p) => Math.min(slides.length - 1, p + 1));
      if (e.key.toLowerCase() === 'f') void requestFullscreen();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [playerOpen, slides.length]);

  const startDemo = async () => {
    setDemoError(null);
    setDemoResetResult(null);
    if (!isInstructor) {
      setDemoError('Ingen tilgang');
      return;
    }
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
        window.localStorage.setItem(SLIDE_KEY, '0');
        window.localStorage.setItem(COURSE_ACTIVE_KEY, '1');
      }

      setDemoSessionId(sessionId || null);
      setDemoExpiresAt(expiresAt || null);
      setSlideIndex(0);
      setPlayerOpen(true);
      await requestFullscreen();
    } catch {
      setDemoError('Kunne ikke starte demo');
    } finally {
      setStartingDemo(false);
    }
  };

  const resetDemo = async () => {
    setDemoError(null);
    setDemoResetResult(null);
    setTemadagCleanupResult(null);

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
        window.localStorage.removeItem(SLIDE_KEY);
        window.localStorage.removeItem(PHONE_SCALE_KEY);
        window.localStorage.removeItem(COURSE_ACTIVE_KEY);
        if (userId) window.localStorage.setItem(ACTIVE_OWNER_KEY, userId);
      }

      setDemoSessionId(null);
      setDemoExpiresAt(null);
      setSlideIndex(0);
      setPlayerOpen(false);
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

  const cleanupTemadag = async () => {
    setDemoError(null);
    setDemoResetResult(null);
    setTemadagCleanupResult(null);

    const ok =
      typeof window !== 'undefined'
        ? window.confirm('Slette demo-/kurskontoer og all kursdata?\n\nDette fjerner testbrukere (typisk @demo.no og demo-session-*@example.com).')
        : false;
    if (!ok) return;

    setCleaningTemadag(true);
    try {
      const res = await fetch('/api/admin/temadag/cleanup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setDemoError(data?.error || 'Kunne ikke rydde temadag');
        return;
      }
      setTemadagCleanupResult(`Slettet brukere: ${Number(data?.deleted || 0)}. Feilet: ${Number(data?.failed || 0)}.`);
    } catch {
      setDemoError('Kunne ikke rydde temadag');
    } finally {
      setCleaningTemadag(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Laster temadag…</div>;
  }

  const currentSlide = slides[Math.max(0, Math.min(slides.length - 1, slideIndex))] || slides[0];
  const posterTitle = currentSlide.posterKey ? POSTERS.find((p) => p.key === currentSlide.posterKey)?.title || currentSlide.title : currentSlide.title;
  const posterFiles =
    currentSlide.posterKey && currentSlide.posterPrefer
      ? posterFilesFor(currentSlide.posterKey, currentSlide.posterPrefer)
      : currentSlide.posterKey
        ? posterFilesFor(currentSlide.posterKey, 'nr')
        : [];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-[#111827] text-white py-6 px-6 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Temadag</h1>
            <p className="text-gray-400 text-sm">Storskjerm-kurs (plakat + demo)</p>
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
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Kurs-player</div>
              <div className="font-bold text-gray-900 truncate">Lineær flyt med tastatur (←/→)</div>
              <div className="text-sm text-gray-600">Start demo og gå steg for steg. Delt skjerm veksler mellom plakat og “telefon” med appen.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startDemo}
                disabled={!isDemoAllowed || startingDemo || !isInstructor}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:bg-gray-400"
              >
                {startingDemo ? 'Starter demo…' : 'Start demo'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canNavigate) return;
                  setPlayerOpen(true);
                  void requestFullscreen();
                }}
                disabled={!canNavigate}
                className="px-4 py-2 rounded-lg bg-honey-600 text-white text-sm font-bold disabled:bg-gray-400"
              >
                Fortsett kurs
              </button>
              <button
                type="button"
                onClick={resetDemo}
                disabled={!demoSessionId || resettingDemo}
                className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-bold disabled:bg-gray-400"
              >
                {resettingDemo ? 'Nullstiller…' : 'Nullstill demo'}
              </button>
              <button
                type="button"
                onClick={cleanupTemadag}
                disabled={!isInstructor || cleaningTemadag}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-900 text-sm font-bold hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-500"
              >
                {cleaningTemadag ? 'Rydder…' : 'Rydd demo-/kurskontoer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.localStorage.removeItem('lek_demo_session_id');
                    window.localStorage.removeItem('lek_demo_session_expires_at');
                    window.localStorage.removeItem('lek_demo_session_token');
                    window.localStorage.removeItem('lek_demo_owner_id');
                    window.localStorage.removeItem(SLIDE_KEY);
                    window.localStorage.removeItem(PHONE_SCALE_KEY);
                    window.localStorage.removeItem(COURSE_ACTIVE_KEY);
                  } catch {}
                  setDemoSessionId(null);
                  setDemoExpiresAt(null);
                  setSlideIndex(0);
                  setPlayerOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-900 text-sm font-bold hover:bg-gray-200"
              >
                Avslutt kurs
              </button>
            </div>
          </div>

          {demoSessionId ? (
            <div className="mt-4 text-sm text-gray-700">
              Demo-session: <span className="font-bold">{demoSessionId}</span>
              {demoExpiresAt ? <span className="text-gray-500"> (utløper {demoExpiresAt})</span> : null}
              <span className="text-gray-500"> • Steg {Math.min(slideIndex + 1, slides.length)}/{slides.length}</span>
            </div>
          ) : (
            <div className="mt-4 text-sm text-gray-600">Ingen aktiv demo-session ennå.</div>
          )}
          {demoError ? <div className="mt-3 text-sm text-red-700">{demoError}</div> : null}
          {demoResetResult ? <div className="mt-3 text-sm text-emerald-700">{demoResetResult}</div> : null}
          {temadagCleanupResult ? <div className="mt-3 text-sm text-emerald-700">{temadagCleanupResult}</div> : null}
        </section>

        {!isDemoAllowed ? (
          <section className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Demo-modus</h2>
            <div className="mt-2 text-sm text-gray-700">Temadag er låst til staging og kan ikke kjøres herfra.</div>
          </section>
        ) : null}

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Direktelenker (feilsøk plakater)</h2>
          <div className="mt-2 text-sm text-gray-700">Hvis disse åpner, blir plakatene også synlige i kurs-playeren.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {POSTERS.map((p) => (
              <a
                key={`poster-link-${p.key}`}
                href={buildPosterSrc(p.filenames[0])}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 text-sm font-bold hover:bg-gray-200"
              >
                Plakat {p.key}
              </a>
            ))}
          </div>
        </section>
      </main>

      {playerOpen ? (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute inset-x-0 top-0 px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-black/60 backdrop-blur">
            <div className="min-w-0 text-white">
              <div className="text-xs uppercase tracking-wide text-white/70">Steg {Math.min(slideIndex + 1, slides.length)}/{slides.length}</div>
              <div className="font-bold truncate">{currentSlide.title}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void requestFullscreen()} className="px-3 py-2 rounded-lg bg-white/10 text-sm font-bold text-white">
                Fullskjerm (F)
              </button>
              <button type="button" onClick={() => setPlayerOpen(false)} className="px-3 py-2 rounded-lg bg-white/10 text-sm font-bold text-white">
                Lukk (Esc)
              </button>
            </div>
          </div>

          <div className="absolute inset-0 pt-16 pb-20">
            {currentSlide.kind === 'poster' && currentSlide.posterKey ? (
              <div className="w-full h-full flex items-center justify-center px-4">
                <PosterImage title={posterTitle} filenames={posterFiles} className="max-h-full max-w-full object-contain" />
              </div>
            ) : null}

            {currentSlide.kind === 'split' && currentSlide.posterKey && currentSlide.appHref ? (
              <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="h-full flex items-center justify-center px-3 bg-black">
                  <PosterImage title={posterTitle} filenames={posterFiles} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="h-full bg-[#0b0f1a] flex flex-col">
                  <div className="px-4 py-3 text-white/90 text-sm flex flex-wrap items-center justify-between gap-2 border-b border-white/10">
                    <div className="font-bold">Demo</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPhoneScale((p) => Math.min(3, Math.max(0.5, Math.round((p - 0.1) * 10) / 10)))}
                        className="px-3 py-2 rounded-lg bg-white/10 text-sm font-bold text-white"
                      >
                        Telefon -
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhoneScale((p) => Math.min(3, Math.max(0.5, Math.round((p + 0.1) * 10) / 10)))}
                        className="px-3 py-2 rounded-lg bg-white/10 text-sm font-bold text-white"
                      >
                        Telefon +
                      </button>
                      <button type="button" onClick={() => setPhoneScale(1)} className="px-3 py-2 rounded-lg bg-white/10 text-sm font-bold text-white">
                        Auto
                      </button>
                      <a href={withDemoQuery(currentSlide.appHref)} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-white/10 text-sm font-bold text-white">
                        Åpne i ny fane
                      </a>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-2">
                    <PhoneFrame href={currentSlide.appHref} title={currentSlide.title} scaleFactor={phoneScale} />
                    {currentSlide.body && currentSlide.body.length > 0 ? (
                      <div className="mt-3 max-w-2xl mx-auto text-white/80 text-sm px-2">
                        <ul className="list-disc pl-5 space-y-1">
                          {currentSlide.body.map((t) => (
                            <li key={`${currentSlide.id}-${t}`}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {currentSlide.kind === 'end' ? (
              <div className="w-full h-full flex items-center justify-center px-6">
                <div className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white">
                  <div className="text-xl font-bold">Demo ferdig</div>
                  {currentSlide.body && currentSlide.body.length > 0 ? (
                    <ul className="mt-4 list-disc pl-5 space-y-2 text-white/80 text-sm">
                      {currentSlide.body.map((t) => (
                        <li key={`${currentSlide.id}-${t}`}>{t}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={resetDemo}
                      disabled={!demoSessionId || resettingDemo}
                      className="px-5 py-3 rounded-lg bg-red-700 text-white text-sm font-bold disabled:bg-gray-400"
                    >
                      {resettingDemo ? 'Nullstiller…' : 'Avslutt og nullstill demo'}
                    </button>
                    <button type="button" onClick={() => setPlayerOpen(false)} className="px-5 py-3 rounded-lg bg-white/10 text-white text-sm font-bold">
                      Lukk kurs
                    </button>
                  </div>
                  {demoResetResult ? <div className="mt-4 text-sm text-emerald-300">{demoResetResult}</div> : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 px-4 py-4 flex flex-wrap items-center justify-between gap-2 bg-black/60 backdrop-blur">
            <button
              type="button"
              onClick={() => setSlideIndex((p) => Math.max(0, p - 1))}
              disabled={slideIndex <= 0}
              className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-bold disabled:opacity-40"
            >
              Forrige (←)
            </button>
            <div className="flex flex-wrap gap-2 justify-center">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlideIndex(idx)}
                  className={idx === slideIndex ? 'px-2 py-1 rounded-full bg-white text-black text-xs font-bold' : 'px-2 py-1 rounded-full bg-white/10 text-white text-xs font-bold'}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSlideIndex((p) => Math.min(slides.length - 1, p + 1))}
              disabled={slideIndex >= slides.length - 1}
              className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-bold disabled:opacity-40"
            >
              Neste (→)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
