import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

function severityLabel(value: unknown) {
  const severity = String(value || '').toLowerCase();
  if (severity === 'urgent') return 'Haster';
  if (severity === 'warning') return 'Viktig';
  return 'Info';
}

function severityClass(value: unknown) {
  const severity = String(value || '').toLowerCase();
  if (severity === 'urgent') return 'bg-red-100 text-red-700 border-red-200';
  if (severity === 'warning') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function dueLabel(row: any) {
  const kind = String(row?.due_kind || '').trim();
  const date = row?.due_date ? String(row.due_date).slice(0, 10) : '';
  if (kind === 'NEXT_VISIT') return 'Neste besøk';
  if (kind === 'TOMORROW') return 'I morgen';
  if (kind === 'DAYS_3') return 'Om 3 dager';
  if (kind === 'NEXT_WEEK') return 'Neste uke';
  if (date) return `Frist ${date}`;
  return 'Neste besøk';
}

export default async function AuroraPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/signin?next=/aurora');
  }

  const { data: suggestions } = await supabase
    .from('aurora_suggestions')
    .select('id, apiary_id, hive_id, inspection_id, title, rationale, guidance, severity, due_kind, due_date, created_at, knowledge_slug')
    .is('accepted_at', null)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  const list = Array.isArray(suggestions) ? suggestions : [];
  const apiaryIds = Array.from(new Set(list.map((row: any) => String(row?.apiary_id || '').trim()).filter(Boolean)));
  const hiveIds = Array.from(new Set(list.map((row: any) => String(row?.hive_id || '').trim()).filter(Boolean)));

  const [apiariesRes, hivesRes] = await Promise.all([
    apiaryIds.length > 0
      ? supabase.from('apiaries').select('id, name, apiary_number').in('id', apiaryIds)
      : Promise.resolve({ data: [], error: null } as any),
    hiveIds.length > 0
      ? supabase.from('hives').select('id, hive_number, name').in('id', hiveIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const apiaryMap: Map<string, any> = new Map(
    (Array.isArray(apiariesRes.data) ? apiariesRes.data : []).map((row: any) => [String(row.id), row] as const)
  );
  const hiveMap: Map<string, any> = new Map(
    (Array.isArray(hivesRes.data) ? hivesRes.data : []).map((row: any) => [String(row.id), row] as const)
  );

  const urgentCount = list.filter((row: any) => String(row?.severity || '').toLowerCase() === 'urgent').length;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-4xl p-4 space-y-4">
        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide text-indigo-700">Aurora</div>
              <h1 className="text-2xl font-black text-gray-900">Aurora-oversikt</h1>
              <p className="max-w-2xl text-sm text-gray-700">
                Her ser du ekte Aurora-forslag som er opprettet fra inspeksjoner og notater. Start i en kubeinspeksjon, lagre,
                og følg deretter opp forslagene her eller i riktig bigård.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50">
                Til dashboard
              </Link>
              <Link href="/hives" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
                Start inspeksjon
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-xs font-bold uppercase text-gray-500">Åpne forslag</div>
              <div className="mt-1 text-2xl font-black text-gray-900">{list.length}</div>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <div className="text-xs font-bold uppercase text-red-700">Haster</div>
              <div className="mt-1 text-2xl font-black text-red-700">{urgentCount}</div>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <div className="text-xs font-bold uppercase text-indigo-700">Flyt</div>
              <div className="mt-1 text-sm font-semibold text-indigo-950">{'Inspeksjon -> lagring -> bigård/Aurora'}</div>
            </div>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
            Ingen åpne Aurora-forslag akkurat nå. Lagre en inspeksjon med funn eller noter oppfølgingsbehov for å se Aurora i bruk.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((row: any) => {
              const apiary = apiaryMap.get(String(row?.apiary_id || ''));
              const hive = hiveMap.get(String(row?.hive_id || ''));
              const guidance = Array.isArray(row?.guidance)
                ? row.guidance.map((line: any) => String(line || '').trim()).filter(Boolean)
                : [];
              const apiaryLabel =
                String(apiary?.apiary_number || '').trim() || String(apiary?.name || '').trim() || 'Bigård';
              const hiveLabel =
                String(hive?.hive_number || '').trim() || String(hive?.name || '').trim() || 'Kube';

              return (
                <div key={String(row.id)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="rounded-full bg-gray-100 px-2 py-1 font-bold text-gray-700">{apiaryLabel}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-1 font-bold text-gray-700">{hiveLabel}</span>
                          {row?.knowledge_slug ? (
                            <span className="rounded-full bg-indigo-50 px-2 py-1 font-bold text-indigo-700">{String(row.knowledge_slug)}</span>
                          ) : null}
                        </div>
                        <h2 className="text-lg font-black text-gray-900">{String(row?.title || 'Aurora-forslag')}</h2>
                        {String(row?.rationale || '').trim() ? (
                          <div className="text-sm text-gray-700 whitespace-pre-line">{String(row.rationale)}</div>
                        ) : null}
                      </div>
                      <div className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${severityClass(row?.severity)}`}>
                        {severityLabel(row?.severity)}
                      </div>
                    </div>

                    {guidance.length > 0 ? (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-sm text-indigo-950">
                        <div className="mb-2 text-xs font-bold uppercase text-indigo-700">Tiltak og råd</div>
                        <div className="space-y-1">
                          {guidance.map((line: string, index: number) => (
                            <div key={`${row.id}-guidance-${index}`}>- {line}</div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs font-semibold text-gray-500">
                        {dueLabel(row)} {row?.created_at ? `· Opprettet ${new Date(String(row.created_at)).toLocaleString('no-NO')}` : ''}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={row?.apiary_id ? `/apiaries/${String(row.apiary_id)}?aurora=open` : '/dashboard'}
                          className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                        >
                          Åpne bigård
                        </Link>
                        {row?.hive_id ? (
                          <Link
                            href={`/hives/${String(row.hive_id)}/new-inspection`}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50"
                          >
                            Ny inspeksjon
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
