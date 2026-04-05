import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export default async function TransactionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: tx } = await admin
    .from('transactions')
    .select('id, type, antall, pris, dato, total_amount, fee_amount, buyer, seller, order_id')
    .or(`buyer.eq.${user.id},seller.eq.${user.id}`)
    .order('dato', { ascending: false })
    .limit(200);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/dashboard" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Dashboard
          </Link>
          <div className="text-sm text-gray-500">Transaksjoner</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h1 className="text-lg font-black text-gray-900">Mine transaksjoner</h1>
          <div className="mt-4 space-y-2">
            {(tx || []).length === 0 ? (
              <div className="text-sm text-gray-500">Ingen transaksjoner enda.</div>
            ) : (
              (tx || []).map((t: any) => (
                <div key={t.id} className="rounded-xl border border-gray-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {t.type === 'emisjon' ? 'Emisjon' : t.type === 'videresalg' ? 'Videresalg' : 'Import'} • {t.antall} aksjer
                      </div>
                      <div className="text-xs text-gray-500">{new Date(t.dato).toLocaleString('nb-NO')}</div>
                      {t.order_id ? (
                        <Link href={`/aksjer/orders/${t.order_id}`} className="text-xs font-semibold text-gray-700 hover:underline">
                          Åpne ordre
                        </Link>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-gray-900">{Number(t.total_amount || 0).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Gebyr: {Number(t.fee_amount || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

