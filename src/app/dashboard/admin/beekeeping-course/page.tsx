import Link from 'next/link';
import { ArrowLeft, BookOpen, GraduationCap, Library, Sparkles } from 'lucide-react';

const nextSteps = [
  'Bygge kursstruktur med moduler, leksjoner og progresjon.',
  'Koble faginnhold til Aurora Knowledge Base som felles sannhetskilde.',
  'Forberede administrasjon av kursoppsett, publisering og kvalitetssikring.',
];

export default function AdminBeekeepingCoursePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Tilbake til adminoversikt
        </Link>

        <section className="mt-6 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-emerald-600 p-3 text-white shadow-lg shadow-emerald-200">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                Klargjort for videre utvikling
              </div>
              <h1 className="mt-4 text-3xl font-bold text-gray-900">Digitalt Birøkterkurs</h1>
              <p className="mt-3 max-w-3xl text-base text-gray-600">
                Her er det gjort klart for å bygge det digitale birøkterkurset videre. Siden fungerer
                som et administrativt startpunkt for struktur, faginnhold og senere kobling mot
                Aurora Knowledge Base.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Kursstruktur</h2>
            <p className="mt-2 text-sm text-gray-600">
              Moduler, leksjoner og progresjon kan bygges her når selve kurset skal opprettes.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
              <Library className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">AKB-kobling</h2>
            <p className="mt-2 text-sm text-gray-600">
              Kursinnholdet skal senere hente fagstoff direkte fra Aurora Knowledge Base, uten egne kopier.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-amber-50 p-3 text-amber-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Admin-klargjøring</h2>
            <p className="mt-2 text-sm text-gray-600">
              Venstremeny og adminoversikt peker nå hit, slik at kursarbeidet kan starte videre senere.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Neste steg</h2>
          <div className="mt-4 space-y-3">
            {nextSteps.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700"
              >
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
