import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

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

export default async function TemadagPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/aksjer/dashboard');

  const totalMinutes = LESSONS.reduce((sum, l) => sum + l.minutes, 0);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/admin" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Aksjeadmin
          </Link>
          <div className="text-sm text-gray-500">Temadag</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-gray-200 p-5">
          <h1 className="text-xl font-black text-gray-900">Opplæring: LEK-Biens Vokter</h1>
          <div className="mt-2 text-sm text-gray-600">
            Steg-for-steg gjennom appen. Start med registrering, opprett bigård og de første kubene, og fortsett i økter á ca. 20 minutter.
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
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

        <section className="rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900">Agenda</h2>
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
            <section key={l.title} id={`del-${idx + 1}`} className="rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    {idx + 1}. {l.title}
                  </h2>
                  <div className="mt-1 text-sm text-gray-600">{l.description}</div>
                </div>
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{l.minutes} min</div>
              </div>

              {l.links && l.links.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {l.links.map((x) => (
                    <Link
                      key={`${l.title}-${x.href}`}
                      href={x.href}
                      className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold"
                    >
                      {x.label}
                    </Link>
                  ))}
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
      </main>
    </div>
  );
}

