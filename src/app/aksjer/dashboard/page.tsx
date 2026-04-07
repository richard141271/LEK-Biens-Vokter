import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/aksjer/actions';

function isMissingDbObjectError(message: string | null | undefined) {
  const m = (message || '').toLowerCase();
  if (!m) return false;
  return m.includes('could not find the table') || m.includes('does not exist') || (m.includes('column') && m.includes('does not exist'));
}

export default async function StockDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';

  await admin.rpc('stock_ensure_shareholder_for_user', { target_user_id: user.id });

  let sh: any = null;
  const shRes = await admin
    .from('shareholders')
    .select('shareholder_no, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering')
    .eq('user_id', user.id)
    .maybeSingle();
  if (shRes.error && isMissingDbObjectError(shRes.error.message)) {
    const fallback = await admin
      .from('shareholders')
      .select('navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering')
      .eq('user_id', user.id)
      .maybeSingle();
    sh = fallback.data;
  } else {
    sh = shRes.data;
  }
  if (!sh) {
    const ensureRes = await admin.rpc('stock_ensure_shareholder_for_user', { target_user_id: user.id });
    if (!ensureRes.error) {
      const retry = await admin
        .from('shareholders')
        .select('shareholder_no, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!retry.error) {
        sh = retry.data;
      } else if (isMissingDbObjectError(retry.error.message)) {
        const retryFallback = await admin
          .from('shareholders')
          .select('navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!retryFallback.error) sh = retryFallback.data;
      }
    }
  }

  const spRes = await admin
    .from('stock_profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();
  if (!spRes.error || isMissingDbObjectError(spRes.error.message)) {
    const desiredName = String((spRes.data as any)?.full_name || '').trim() || String(user.email || '').trim();
    const desiredEmail = String(user.email || '').trim();
    if (sh && (String((sh as any)?.navn || '').trim() !== desiredName || String((sh as any)?.email || '').trim() !== desiredEmail)) {
      const syncRes = await admin
        .from('shareholders')
        .update({ navn: desiredName, email: desiredEmail })
        .eq('user_id', user.id);
      if (!syncRes.error) {
        sh = { ...(sh as any), navn: desiredName, email: desiredEmail };
      }
    }
  }

  const shEmail = String((sh as any)?.email || '').trim().toLowerCase();
  const authEmail = String(user.email || '').trim().toLowerCase();
  const looksMismatched = Boolean(shEmail && authEmail && shEmail !== authEmail);

  const formalRes = await admin
    .from('shareholders')
    .select('entity_type, national_id, orgnr, address_line1, postal_code, city')
    .eq('user_id', user.id)
    .maybeSingle();

  const needsProfile = (() => {
    if (formalRes.error && isMissingDbObjectError(formalRes.error.message)) return false;
    if (!formalRes.data) return false;
    const t = String((formalRes.data as any).entity_type || 'unknown');
    const nid = String((formalRes.data as any).national_id || '').trim();
    const onr = String((formalRes.data as any).orgnr || '').trim();
    const addr = String((formalRes.data as any).address_line1 || '').trim();
    const pc = String((formalRes.data as any).postal_code || '').trim();
    const city = String((formalRes.data as any).city || '').trim();
    const missingIdentity = (t === 'person' && !nid) || (t === 'company' && !onr) || t === 'unknown';
    const missingAddress = !addr || !pc || !city;
    return missingIdentity || missingAddress;
  })();

  const { data: orders } = await admin
    .from('stock_orders')
    .select('id, type, share_count, price_per_share, total_amount, fee_amount, payment_method, payment_reference, status, created_at')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: tx } = await admin
    .from('transactions')
    .select('id, type, antall, pris, dato, total_amount, fee_amount, buyer, seller, order_id')
    .or(`buyer.eq.${user.id},seller.eq.${user.id}`)
    .order('dato', { ascending: false })
    .limit(10);

  const name = looksMismatched ? user.email : (sh as any)?.navn || user.email;
  const shares = Number((sh as any)?.antall_aksjer || 0);
  const avg = Number((sh as any)?.gjennomsnittspris || 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">AI Innovate AS</div>
            <div className="text-lg font-bold text-gray-900">Aksjer</div>
          </div>
          <form action={signOut}>
            <button className="text-sm font-semibold text-gray-700 hover:underline">Logg ut</button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {needsProfile ? (
          <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="text-sm text-gray-800">
              <div className="font-bold text-gray-900">Mangler aksjonærinfo</div>
              <div className="mt-1 text-gray-600">Fyll inn identitet og adresse før du gjennomfører kjøp/videresalg.</div>
              <Link href="/aksjer/profile" className="inline-block mt-3 font-bold text-gray-900 hover:underline">
                Oppdater profil
              </Link>
            </div>
          </section>
        ) : null}

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">Min profil</div>
              <div className="text-base font-bold text-gray-900 truncate">{name}</div>
              <div className="text-sm text-gray-600 truncate">{user.email}</div>
              {looksMismatched ? (
                <div className="text-xs text-red-700">
                  Profildata er ute av sync (aksjeeierbok har en annen e-post enn innloggingen). Kjør reset/synk eller rediger aksjonær i admin.
                </div>
              ) : null}
              {(sh as any)?.shareholder_no ? (
                <div className="text-xs text-gray-500 truncate">Aksjonær-ID: {(sh as any).shareholder_no}</div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Mine aksjer</div>
              <div className="text-2xl font-black text-gray-900">{shares}</div>
              <div className="text-xs text-gray-500">Snittpris: {avg.toFixed(2)}</div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link href="/aksjer/buy" className="bg-gray-900 text-white rounded-2xl p-4 font-bold text-center">
            Kjøp aksjer
          </Link>
          <Link href="/aksjer/sell" className="bg-white border border-gray-200 rounded-2xl p-4 font-bold text-center">
            Selg aksjer
          </Link>
          <Link href="/aksjer/transactions" className="bg-white border border-gray-200 rounded-2xl p-4 font-bold text-center col-span-2">
            Transaksjoner
          </Link>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Siste kjøp</h2>
            <Link href="/aksjer/transactions" className="text-sm font-semibold text-gray-700 hover:underline">
              Se alt
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {(orders || []).length === 0 ? (
              <div className="text-sm text-gray-500">Ingen ordre enda.</div>
            ) : (
              (orders || []).map((o: any) => (
                <Link
                  key={o.id}
                  href={`/aksjer/orders/${o.id}`}
                  className="block rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {o.type === 'emission' ? 'Emisjon' : 'Videresalg'} • {o.share_count} aksjer
                      </div>
                      <div className="text-xs text-gray-500 truncate">Ref: {o.payment_reference}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{Number(o.total_amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{String(o.status)}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Siste transaksjoner</h2>
          <div className="mt-3 space-y-2">
            {(tx || []).length === 0 ? (
              <div className="text-sm text-gray-500">Ingen transaksjoner enda.</div>
            ) : (
              (tx || []).map((t: any) => (
                <div key={t.id} className="rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {t.type === 'emisjon' ? 'Emisjon' : t.type === 'videresalg' ? 'Videresalg' : 'Import'} • {t.antall} aksjer
                      </div>
                      <div className="text-xs text-gray-500 truncate">{new Date(t.dato).toLocaleString('nb-NO')}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{Number(t.total_amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Gebyr: {Number(t.fee_amount || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="text-center">
          {isAdmin ? (
            <Link href="/aksjer/admin" className="text-xs text-gray-500 hover:underline">
              Admin
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}
