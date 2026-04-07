import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { adminUpdateShareholder } from '@/app/aksjer/actions';

function isMissingDbObjectError(message: string | null | undefined) {
  const m = (message || '').toLowerCase();
  if (!m) return false;
  return m.includes('could not find the table') || m.includes('does not exist') || (m.includes('column') && m.includes('does not exist'));
}

export default async function AdminShareholderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { ok?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/aksjer/dashboard');

  let shareholder: any = null;
  let shareholderExtended = true;
  const shareholderRes = await admin
    .from('shareholders')
    .select('id, shareholder_no, navn, email, entity_type, birth_date, national_id, orgnr, address_line1, address_line2, postal_code, city, country')
    .eq('id', params.id)
    .maybeSingle();
  if (shareholderRes.error && isMissingDbObjectError(shareholderRes.error.message)) {
    shareholderExtended = false;
    const fallback = await admin.from('shareholders').select('id, navn, email').eq('id', params.id).maybeSingle();
    shareholder = fallback.data;
    if (fallback.error || !shareholder?.id) {
      redirect(`/aksjer/admin?error=${encodeURIComponent(fallback.error?.message || 'Fant ikke aksjonær')}`);
    }
  } else {
    shareholder = shareholderRes.data;
  }

  const payoutRes = await admin
    .from('shareholders')
    .select('payout_bank_account, payout_vipps, payout_usdt_trc20')
    .eq('id', params.id)
    .maybeSingle();
  const payoutMissing = isMissingDbObjectError(payoutRes.error?.message);
  const payout = payoutMissing ? null : (payoutRes.data as any);

  const lotsRes = await admin
    .from('stock_share_lots')
    .select('share_class, start_no, end_no')
    .eq('shareholder_id', params.id)
    .order('start_no', { ascending: true })
    .limit(2000);

  const lotsMissing = isMissingDbObjectError(lotsRes.error?.message);
  const error = (shareholderExtended ? shareholderRes.error?.message : null) || (lotsMissing ? null : lotsRes.error?.message) || null;
  if (error || !shareholder?.id) {
    redirect(`/aksjer/admin?error=${encodeURIComponent(error || 'Fant ikke aksjonær')}`);
  }

  const okParam = searchParams?.ok;
  const errorParam = searchParams?.error;

  const lotsText = lotsMissing
    ? ''
    : (lotsRes.data || []).map((l: any) => `${String(l.share_class || 'A')}: ${Number(l.start_no)}–${Number(l.end_no)}`).join(', ');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/admin" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Admin
          </Link>
          <div className="text-sm text-gray-500">Aksjonær</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {errorParam ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorParam}</div>
        ) : null}
        {okParam ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">Lagret.</div>
        ) : null}

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h1 className="text-lg font-black text-gray-900">{shareholder.navn}</h1>
          <div className="mt-1 text-sm text-gray-600">
            ID: {(shareholder as any).shareholder_no || '-'} • {shareholder.email || '-'}
          </div>
          <div className="mt-3 text-sm text-gray-700">
            <div className="text-gray-500">Aksjenummer</div>
            <div className="font-semibold text-gray-900 break-words">{lotsText || '-'}</div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Formell info</h2>
          {!shareholderExtended ? (
            <div className="mt-4 text-sm text-yellow-900 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              Database mangler migrasjon for formell aksjeeierbok (identitet/adresse). Kjør migrasjonen først.
            </div>
          ) : null}

          {shareholderExtended ? (
            <form action={adminUpdateShareholder} className="mt-4 space-y-4">
            <input type="hidden" name="shareholderId" value={shareholder.id} />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
              <select
                name="entityType"
                defaultValue={shareholder.entity_type || 'unknown'}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              >
                <option value="unknown">Ukjent</option>
                <option value="person">Person</option>
                <option value="company">Selskap</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fødselsdato</label>
                <input
                  name="birthDate"
                  type="date"
                  defaultValue={shareholder.birth_date || ''}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fødselsnummer</label>
                <input
                  name="nationalId"
                  defaultValue={shareholder.national_id || ''}
                  placeholder="11 siffer"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Org.nr (hvis selskap)</label>
              <input
                name="orgnr"
                defaultValue={shareholder.orgnr || ''}
                placeholder="9 siffer"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse</label>
                <input
                  name="addressLine1"
                  defaultValue={shareholder.address_line1 || ''}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse (linje 2)</label>
                <input
                  name="addressLine2"
                  defaultValue={shareholder.address_line2 || ''}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Postnr</label>
                <input
                  name="postalCode"
                  defaultValue={shareholder.postal_code || ''}
                  placeholder="4 siffer"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Poststed</label>
                <input
                  name="city"
                  defaultValue={shareholder.city || ''}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Land</label>
                <input
                  name="country"
                  defaultValue={shareholder.country || 'NO'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>
            </div>

            {!payoutMissing ? (
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 space-y-3">
                <div className="font-bold text-gray-900">Utbetaling (videresalg)</div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kontonummer</label>
                  <input
                    name="payoutBankAccount"
                    defaultValue={payout?.payout_bank_account || ''}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vipps</label>
                  <input
                    name="payoutVipps"
                    defaultValue={payout?.payout_vipps || ''}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Krypto (USDT – TRC20)</label>
                  <input
                    name="payoutUsdtTrc20"
                    defaultValue={payout?.payout_usdt_trc20 || ''}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-4">
                Utbetalingsfelt er ikke tilgjengelig i databasen ennå. Kjør migrasjon før du kan lagre konto/Vipps/krypto.
              </div>
            )}

            <button className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">Lagre</button>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}
