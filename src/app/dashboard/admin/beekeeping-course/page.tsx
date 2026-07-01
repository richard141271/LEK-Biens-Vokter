import Link from 'next/link';
import { ArrowLeft, BookOpen, GraduationCap, Library, Sparkles } from 'lucide-react';
import { fetchAuroraKnowledgeList } from '@/lib/aurora-knowledge';
import { beekeepingCourseKnowledgeSlugs, beekeepingCourseModules } from '@/lib/beekeeping-course';
import { createClient } from '@/utils/supabase/server';

const nextSteps = [
  'Bygge progresjon og publiseringslogikk pa toppen av AKB-modulene.',
  'Utvide med flere slugs etter hvert som inspeksjonsdekningen vokser videre.',
  'Koble elevflyt og kursvisning til de samme kunnskapsartiklene som Aurora bruker.',
];

export default async function AdminBeekeepingCoursePage() {
  const supabase = createClient();
  const knowledgeItems = await fetchAuroraKnowledgeList(supabase, beekeepingCourseKnowledgeSlugs);
  const knowledgeBySlug = new Map(knowledgeItems.map((item) => [item.slug, item] as const));

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
                Kurssiden leser na faginnhold direkte fra Aurora Knowledge Base via slugs. Det gir
                en konkret start pa kursmoduler uten a kopiere fagstoff inn i egne kursfiler.
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
              Modulene under bruker na AKB-artikler direkte som kunnskapsgrunnlag.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-600">
              <Library className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">AKB-kobling</h2>
            <p className="mt-2 text-sm text-gray-600">
              Hver modul peker pa konkrete `slug`-artikler i AKB, slik at kurs og Aurora deler samme sannhet.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-amber-50 p-3 text-amber-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Admin-klargjøring</h2>
            <p className="mt-2 text-sm text-gray-600">
              Dette er na en faktisk AKB-drevet oversikt for kommende kursmoduler, ikke bare en placeholder.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AKB-drevne kursmoduler</h2>
              <p className="mt-1 text-sm text-gray-600">
                Hver modul nedenfor leser direkte fra artikler i `aurora_knowledge`.
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {knowledgeItems.length} AKB-artikler koblet inn
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {beekeepingCourseModules.map((module) => {
              const items = module.knowledgeSlugs
                .map((slug) => knowledgeBySlug.get(slug))
                .filter(Boolean);

              return (
                <div key={module.slug} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{module.description}</p>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
                      {items.length} artikler
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {items.map((item) => (
                      <article key={item!.slug} className="rounded-xl border border-white bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-gray-900">{item!.title}</h4>
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                            {item!.slug}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {item!.short_description || 'Kortbeskrivelse mangler forelopig i AKB.'}
                        </p>
                        {item!.recommended_actions.length > 0 && (
                          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                            Neste steg: {item!.recommended_actions[0]}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
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
