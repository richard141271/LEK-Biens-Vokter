import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { updateMyShareholder } from '@/app/aksjer/actions';

function isMissingDbObjectError(message: string | null | undefined) {
  const m = (message || '').toLowerCase();
  if (!m) return false;
  return m.includes('could not find the table') || m.includes('does not exist') || (m.includes('column') && m.includes('does not exist'));
}

export default async function StockProfilePage({
  searchParams,
}: {
  searchParams?: { next?: string; ok?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  await admin.rpc('stock_ensure_shareholder_for_user', { target_user_id: user.id });

  const shareholderRes = await admin
    .from('shareholders')
    .select('navn, email, entity_type, birth_date, national_id, orgnr, address_line1, address_line2, postal_code, city, country')
    .eq('user_id', user.id)
    .maybeSingle();

  const shareholder = shareholderRes.data as any;
  const dbMissing = isMissingDbObjectError(shareholderRes.error?.message);

  const payoutRes = await admin
    .from('shareholders')
    .select('payout_bank_account, payout_vipps, payout_usdt_trc20')
    .eq('user_id', user.id)
    .maybeSingle();
  const payoutMissing = isMissingDbObjectError(payoutRes.error?.message);
  const payout = payoutMissing ? null : (payoutRes.data as any);

  const okParam = searchParams?.ok;
  const errorParam = searchParams?.error;
  const nextPath = String(searchParams?.next || '').trim();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/dashboard" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Dashboard
          </Link>
          <div className="text-sm text-gray-500">Profil</div>
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
          <h1 className="text-lg font-black text-gray-900">Aksjonærinfo</h1>
          <div className="mt-1 text-sm text-gray-600">
            Dette brukes i aksjeeierboken (identitet, adresse og aksjenummer). Fyll inn før du gjennomfører kjøp/videresalg.
          </div>
        </section>

        {dbMissing ? (
          <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-xl p-4">
              Database mangler migrasjon for formell aksjeeierbok. Kjør migrasjonen før du kan lagre identitet/adresse.
            </div>
          </section>
        ) : (
          <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm text-gray-700">
              <div className="font-bold text-gray-900">{shareholder?.navn || user.email}</div>
              <div className="text-gray-600">{shareholder?.email || user.email}</div>
            </div>

            <form action={updateMyShareholder} className="mt-5 space-y-4">
              <input type="hidden" name="next" value={nextPath} />

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                <select
                  name="entityType"
                  defaultValue={shareholder?.entity_type || 'unknown'}
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
                    defaultValue={shareholder?.birth_date || ''}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fødselsnummer</label>
                  <input
                    name="nationalId"
                    defaultValue={shareholder?.national_id || ''}
                    placeholder="11 siffer"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Org.nr (hvis selskap)</label>
                <input
                  name="orgnr"
                  defaultValue={shareholder?.orgnr || ''}
                  placeholder="9 siffer"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse</label>
                  <input
                    name="addressLine1"
                    defaultValue={shareholder?.address_line1 || ''}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Adresse (linje 2)</label>
                  <input
                    name="addressLine2"
                    defaultValue={shareholder?.address_line2 || ''}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Postnr</label>
                  <input
                    name="postalCode"
                    defaultValue={shareholder?.postal_code || ''}
                    placeholder="4 siffer"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Poststed</label>
                  <input
                    name="city"
                    defaultValue={shareholder?.city || ''}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Land</label>
                  <input
                    name="country"
                    defaultValue={shareholder?.country || 'NO'}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
              </div>

              {!payoutMissing ? (
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 space-y-3">
                  <div className="font-bold text-gray-900">Utbetaling (ved videresalg)</div>
                  <div className="text-sm text-gray-600">
                    Ved videresalg skal kjøper betale direkte til selger. Legg inn minst én metode.
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Kontonummer</label>
                    <input
                      name="payoutBankAccount"
                      defaultValue={payout?.payout_bank_account || ''}
                      placeholder="11 siffer"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vipps (telefonnummer)</label>
                    <input
                      name="payoutVipps"
                      defaultValue={payout?.payout_vipps || ''}
                      placeholder="f.eks. 9xxxxxxx"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Krypto (USDT – TRC20)</label>
                    <input
                      name="payoutUsdtTrc20"
                      defaultValue={payout?.payout_usdt_trc20 || ''}
                      placeholder="TRC20-adresse"
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  Utbetalingsfelt er ikke tilgjengelig i databasen ennå. Kjør migrasjon før du kan lagre konto/Vipps/krypto for videresalg.
                </div>
              )}

              <button className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">Lagre</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
