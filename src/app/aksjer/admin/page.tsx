import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { adminApproveOrder, adminRebuildShareLots, adminRejectOrder, adminSetOffering, adminUpdateCompanyInfo } from '@/app/aksjer/actions';
import DangerInitResetForm from '@/app/aksjer/admin/DangerInitResetForm';

function isVip(email: string | null | undefined) {
  const e = (email || '').toLowerCase();
  return ['richard141271@gmail.com', 'richard141271@gmail.no', 'lek@kias.no', 'jorn@kias.no'].includes(e);
}

function isMissingDbObjectError(message: string | null | undefined) {
  const m = (message || '').toLowerCase();
  if (!m) return false;
  return (
    m.includes('could not find the table') ||
    m.includes('does not exist') ||
    (m.includes('column') && m.includes('does not exist')) ||
    m.includes('schema cache')
  );
}

export default async function StockAdminPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin' && !isVip(user.email)) redirect('/aksjer/dashboard');

  const settingsRes = await admin.from('stock_settings').select('fee_rate, holding_shareholder_id, total_shares').eq('id', 1).maybeSingle();
  const settings = settingsRes.data;
  const dangerPasswordConfigured = Boolean(process.env.STOCK_ADMIN_DANGER_PASSWORD);

  const offeringRes = await admin
    .from('stock_offerings')
    .select('id, active, price_per_share, available_shares, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const offering = offeringRes.data;

  const companyRes = await admin
    .from('stock_company_info')
    .select('company_name, orgnr, incorporation_date, share_capital, par_value, address_line1, address_line2, postal_code, city, country')
    .eq('id', 1)
    .maybeSingle();
  const companyMissing = isMissingDbObjectError(companyRes.error?.message);
  const company = companyMissing ? null : companyRes.data;

  const pendingRes = await admin
    .from('stock_orders')
    .select('id, type, buyer_id, seller_id, share_count, price_per_share, total_amount, fee_amount, payment_method, payment_reference, status, created_at, paid_at')
    .in('status', ['pending_approval', 'awaiting_payment'])
    .order('created_at', { ascending: false })
    .limit(100);
  const pending = pendingRes.data;

  let shareholders: any[] | null = null;
  let shareholdersExtended = true;
  let shareholdersError: string | null = null;
  const shareholdersRes = await admin
    .from('shareholders')
    .select('id, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering, entity_type, birth_date, national_id, orgnr, address_line1, postal_code, city, country')
    .order('antall_aksjer', { ascending: false })
    .limit(200);
  if (shareholdersRes.error && isMissingDbObjectError(shareholdersRes.error.message)) {
    shareholdersExtended = false;
    const fallback = await admin
      .from('shareholders')
      .select('id, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering')
      .order('antall_aksjer', { ascending: false })
      .limit(200);
    shareholders = fallback.data;
    shareholdersError = fallback.error?.message || null;
  } else {
    shareholders = shareholdersRes.data;
    shareholdersError = shareholdersRes.error?.message || null;
  }

  const txRes = await admin
    .from('transactions')
    .select('id, type, antall, pris, dato, total_amount, fee_amount, buyer, seller, order_id')
    .order('dato', { ascending: false })
    .limit(200);
  const tx = txRes.data;

  const queryError =
    settingsRes.error?.message ||
    offeringRes.error?.message ||
    (companyMissing ? null : companyRes.error?.message) ||
    pendingRes.error?.message ||
    shareholdersError ||
    txRes.error?.message ||
    null;
  const looksLikeMissingTables = !!queryError && /does not exist|relation|could not find the table/i.test(queryError);
  const needsMigration = companyMissing || !shareholdersExtended;
  const holdingId = String(settings?.holding_shareholder_id || '');
  const visibleShareholders = (shareholders || []).filter((s: any) => {
    const count = Number(s?.antall_aksjer || 0);
    if (count > 0) return true;
    return holdingId && String(s?.id || '') === holdingId;
  });

  const errorParam = searchParams?.error;
  const okParam = searchParams?.ok;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/dashboard" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Dashboard
          </Link>
          <div className="text-sm text-gray-500">Admin</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {errorParam ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {errorParam}
          </div>
        ) : null}
        {okParam ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Lagret.
          </div>
        ) : null}
        {queryError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {looksLikeMissingTables
              ? `Aksje-tabellene finnes ikke i databasen enda: ${queryError}`
              : `Klarte ikke lese aksje-data fra databasen: ${queryError}`}
          </div>
        ) : null}
        {needsMigration ? (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
            Database mangler migrasjon for “formell aksjeeierbok” (selskapsinfo/identitet/adresse/aksjenummer). Kjør migrasjonen og “Reload schema cache” i Supabase hvis du får cache-feil.
          </div>
        ) : null}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h1 className="text-lg font-black text-gray-900">Oppsett</h1>
          <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Holding shares</div>
              <div className="font-bold text-gray-900">{Number(settings?.total_shares || 0)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Fee rate</div>
              <div className="font-bold text-gray-900">{Number(settings?.fee_rate ?? 0.02)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Holding ID</div>
              <div className="font-bold text-gray-900 truncate">{settings?.holding_shareholder_id || '-'}</div>
            </div>
          </div>

          <DangerInitResetForm defaultTotalShares={Number(settings?.total_shares || 100000)} dangerPasswordConfigured={dangerPasswordConfigured} />
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Emisjon</h2>
          <div className="mt-2 text-sm text-gray-600">
            Siste: {offering?.id ? `${Number(offering.price_per_share || 0).toFixed(2)} • tilgjengelig ${Number(offering.available_shares || 0)} • ${offering.active ? 'aktiv' : 'inaktiv'}` : 'Ingen'}
          </div>

          <form action={adminSetOffering} className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pris per aksje</label>
              <input
                name="pricePerShare"
                type="number"
                min={0.01}
                step="0.01"
                defaultValue={Number(offering?.price_per_share || 100)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Antall tilgjengelig</label>
              <input
                name="availableShares"
                type="number"
                min={0}
                defaultValue={Number(offering?.available_shares || 0)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700">
              <input name="active" type="checkbox" defaultChecked />
              Aktiv emisjon
            </label>
            <button className="col-span-2 py-3 rounded-xl bg-gray-900 text-white font-bold">Lagre</button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-bold text-gray-900">Selskapsinfo</h2>
            <form action={adminRebuildShareLots}>
              <button className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold">Bygg aksjenummer på nytt</button>
            </form>
          </div>
          {companyMissing ? (
            <div className="mt-4 text-sm text-yellow-900 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              Database mangler migrasjon for selskapsinfo (inkl. adressefelter). Kjør migrasjonen og trykk “Reload schema cache” i Supabase.
            </div>
          ) : null}
          <form action={adminUpdateCompanyInfo} className="mt-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Selskapsnavn</label>
              <input
                name="companyName"
                defaultValue={company?.company_name || 'AI Innovate AS'}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse</label>
              <input
                name="addressLine1"
                defaultValue={(company as any)?.address_line1 || ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse (linje 2)</label>
              <input
                name="addressLine2"
                defaultValue={(company as any)?.address_line2 || ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Postnr</label>
              <input
                name="postalCode"
                inputMode="numeric"
                defaultValue={(company as any)?.postal_code || ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Sted</label>
              <input
                name="city"
                defaultValue={(company as any)?.city || ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Land</label>
              <input
                name="country"
                defaultValue={(company as any)?.country || 'NO'}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Org.nr</label>
              <input
                name="orgnr"
                defaultValue={company?.orgnr || ''}
                placeholder="9 siffer"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Dato for opprettelse</label>
              <input
                name="incorporationDate"
                type="date"
                defaultValue={company?.incorporation_date || ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Aksjekapital</label>
              <input
                name="shareCapital"
                type="number"
                min={0}
                step="0.01"
                defaultValue={company?.share_capital ?? ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pålydende per aksje</label>
              <input
                name="parValue"
                type="number"
                min={0}
                step="0.000001"
                defaultValue={company?.par_value ?? ''}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <button className="col-span-2 py-3 rounded-xl bg-gray-900 text-white font-bold">Lagre</button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Ordre</h2>
          <div className="mt-3 space-y-2">
            {(pending || []).length === 0 ? (
              <div className="text-sm text-gray-500">Ingen ordre.</div>
            ) : (
              (pending || []).map((o: any) => (
                <div key={o.id} className="rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {o.type === 'emission' ? 'Emisjon' : 'Videresalg'} • {o.share_count} aksjer • {Number(o.total_amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {o.payment_method} • {o.payment_reference} • {o.status}
                      </div>
                      <div className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString('nb-NO')}</div>
                    </div>
                    <div className="flex gap-2">
                      {o.status === 'pending_approval' ? (
                        <>
                          <form action={adminApproveOrder}>
                            <input type="hidden" name="orderId" value={o.id} />
                            <button className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold">Godkjenn</button>
                          </form>
                          <form action={adminRejectOrder}>
                            <input type="hidden" name="orderId" value={o.id} />
                            <button className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold">Avvis</button>
                          </form>
                        </>
                      ) : (
                        <Link
                          href={`/aksjer/admin/orders/${o.id}`}
                          className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold"
                        >
                          Åpne
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Aksjeeierbok</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/api/aksjer/shareholders/pdf"
              className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold"
            >
              Last ned PDF
            </a>
            <Link href="/aksjer/admin/print" className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-bold">
              Utskrift
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Navn</th>
                  <th className="py-2 pr-4">Identitet</th>
                  <th className="py-2 pr-4">Adresse</th>
                  <th className="py-2 pr-4">Aksjer</th>
                  <th className="py-2 pr-4">Snitt</th>
                  <th className="py-2 pr-4">Oppdatert</th>
                  {shareholdersExtended ? <th className="py-2 pr-4"></th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleShareholders.map((s: any) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-2 pr-4 font-semibold text-gray-900">{s.navn}</td>
                    <td className="py-2 pr-4 text-gray-700">
                      {shareholdersExtended
                        ? s.entity_type === 'company'
                          ? s.orgnr || '-'
                          : s.entity_type === 'person'
                            ? s.national_id || (s.birth_date ? String(s.birth_date) : '-')
                            : '-'
                        : '-'}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {shareholdersExtended
                        ? s.address_line1
                          ? `${s.address_line1}${s.postal_code ? `, ${s.postal_code}` : ''}${s.city ? ` ${s.city}` : ''}${s.country ? `, ${s.country}` : ''}`
                          : '-'
                        : '-'}
                    </td>
                    <td className="py-2 pr-4">{s.antall_aksjer}</td>
                    <td className="py-2 pr-4">{Number(s.gjennomsnittspris || 0).toFixed(2)}</td>
                    <td className="py-2 pr-4">{new Date(s.siste_oppdatering).toLocaleString('nb-NO')}</td>
                    {shareholdersExtended ? (
                      <td className="py-2 pr-4">
                        <Link href={`/aksjer/admin/shareholders/${s.id}`} className="font-bold text-gray-900 hover:underline">
                          Rediger
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Transaksjonslogg</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Dato</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Antall</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Gebyr</th>
                  <th className="py-2 pr-4">Ordre</th>
                </tr>
              </thead>
              <tbody>
                {(tx || []).map((t: any) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2 pr-4">{new Date(t.dato).toLocaleString('nb-NO')}</td>
                    <td className="py-2 pr-4 font-semibold text-gray-900">{t.type}</td>
                    <td className="py-2 pr-4">{t.antall}</td>
                    <td className="py-2 pr-4">{Number(t.total_amount || 0).toFixed(2)}</td>
                    <td className="py-2 pr-4">{Number(t.fee_amount || 0).toFixed(2)}</td>
                    <td className="py-2 pr-4">
                      {t.order_id ? (
                        <Link href={`/aksjer/admin/orders/${t.order_id}`} className="font-semibold text-gray-900 hover:underline">
                          Åpne
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
