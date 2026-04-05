import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { cancelListing, createListing, createResaleOrder } from '@/app/aksjer/actions';

export default async function SellPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('stock_profiles').select('full_name').eq('id', user.id).maybeSingle();
  const { data: sh } = await admin.from('shareholders').select('antall_aksjer').eq('user_id', user.id).maybeSingle();
  const owned = Number(sh?.antall_aksjer || 0);
  const defaultFullName = profile?.full_name || (user.user_metadata as any)?.full_name || '';

  const { data: myListings } = await admin
    .from('stock_listings')
    .select('id, share_count, price_per_share, status, created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: listings } = await admin
    .from('stock_listings')
    .select('id, seller_id, share_count, price_per_share, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/dashboard" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Dashboard
          </Link>
          <div className="text-sm text-gray-500">Selg / Markedsplass</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {searchParams?.ok ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Lagret.
          </div>
        ) : null}
        {searchParams?.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {decodeURIComponent(searchParams.error)}
          </div>
        ) : null}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500">Mine aksjer</div>
              <div className="text-2xl font-black text-gray-900">{owned}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Legg ut for salg</div>
              <div className="text-xs text-gray-500">Fri pris</div>
            </div>
          </div>

          <form action={createListing} className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Antall</label>
              <input
                name="shareCount"
                type="number"
                min={1}
                max={Math.max(1, owned)}
                defaultValue={1}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pris per aksje</label>
              <input
                name="pricePerShare"
                type="number"
                min={0.01}
                step="0.01"
                defaultValue={100}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
            <button className="col-span-2 py-3 rounded-xl bg-gray-900 text-white font-bold">Legg ut</button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Mine annonser</h2>
          <div className="mt-3 space-y-2">
            {(myListings || []).length === 0 ? (
              <div className="text-sm text-gray-500">Ingen annonser enda.</div>
            ) : (
              (myListings || []).map((l: any) => (
                <div key={l.id} className="rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{l.share_count} aksjer</div>
                      <div className="text-xs text-gray-500 truncate">
                        Pris: {Number(l.price_per_share || 0).toFixed(2)} • Status: {l.status}
                      </div>
                    </div>
                    {l.status === 'active' ? (
                      <form action={cancelListing}>
                        <input type="hidden" name="listingId" value={l.id} />
                        <button className="text-sm font-bold text-gray-900 hover:underline">Avbryt</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Markedsplass</h2>
          <div className="mt-3 space-y-3">
            {(listings || []).filter((l: any) => l.seller_id !== user.id).length === 0 ? (
              <div className="text-sm text-gray-500">Ingen aktive annonser akkurat nå.</div>
            ) : (
              (listings || [])
                .filter((l: any) => l.seller_id !== user.id)
                .map((l: any) => (
                  <div key={l.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-500">Til salgs</div>
                        <div className="text-lg font-black text-gray-900">{l.share_count} aksjer</div>
                        <div className="text-sm text-gray-600 mt-1">Pris per aksje: {Number(l.price_per_share || 0).toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Total</div>
                        <div className="text-lg font-black text-gray-900">
                          {(Number(l.share_count || 0) * Number(l.price_per_share || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <form action={createResaleOrder} className="mt-4 space-y-3">
                      <input type="hidden" name="listingId" value={l.id} />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Navn</label>
                          <input
                            name="fullName"
                            required
                            defaultValue={defaultFullName}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                            placeholder="Navn etternavn"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Antall</label>
                          <input
                            name="shareCount"
                            type="number"
                            min={1}
                            max={Math.max(1, Number(l.share_count || 1))}
                            defaultValue={Number(l.share_count || 1)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="rounded-xl border border-gray-200 p-3 flex items-center gap-2">
                          <input type="radio" name="paymentMethod" value="bank" defaultChecked />
                          <span className="text-sm font-semibold text-gray-900">Bank</span>
                        </label>
                        <label className="rounded-xl border border-gray-200 p-3 flex items-center gap-2">
                          <input type="radio" name="paymentMethod" value="usdt_trc20" />
                          <span className="text-sm font-semibold text-gray-900">USDT (TRC20)</span>
                        </label>
                      </div>

                      <label className="flex items-start gap-2 text-sm text-gray-700">
                        <input name="agreed" type="checkbox" required className="mt-1" />
                        <span>Jeg godtar avtalen og bekrefter bestillingen.</span>
                      </label>

                      <button className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">Kjøp</button>
                    </form>
                  </div>
                ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
