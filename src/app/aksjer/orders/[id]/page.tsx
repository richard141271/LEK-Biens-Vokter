import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { markPaid } from '@/app/aksjer/actions';

const BANK_ACCOUNT = '3606 26 47110';
const USDT_TRC20_ADDRESS = 'TJ64DHa2zLRntt2PpghTm3jMWVjv6fLvG1';

export default async function OrderPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: order } = await admin
    .from('stock_orders')
    .select('id, buyer_id, type, share_count, price_per_share, total_amount, fee_amount, payment_method, payment_reference, status, agreement_json, created_at, paid_at, approved_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!order?.id) redirect('/aksjer/dashboard');
  if (order.buyer_id !== user.id) redirect('/aksjer/dashboard');

  const paymentMethod = String(order.payment_method);
  const status = String(order.status);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/dashboard" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Dashboard
          </Link>
          <div className="text-sm text-gray-500">Ordre</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">Referanse</div>
              <div className="text-lg font-black text-gray-900">{order.payment_reference}</div>
              <div className="text-xs text-gray-500 mt-1">Status: {status}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-2xl font-black text-gray-900">{Number(order.total_amount || 0).toFixed(2)}</div>
              <div className="text-xs text-gray-500">{order.share_count} aksjer</div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Betalingsinstruks</h2>
          {paymentMethod === 'bank' ? (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div>
                Kontonummer: <span className="font-bold text-gray-900">{BANK_ACCOUNT}</span>
              </div>
              <div>
                Referanse: <span className="font-bold text-gray-900">{order.payment_reference}</span>
              </div>
              <div className="text-gray-600">Bruk korrekt referanse, ellers kan betalingen bli forsinket.</div>
            </div>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div>
                Adresse: <span className="font-bold text-gray-900 break-all">{USDT_TRC20_ADDRESS}</span>
              </div>
              <div className="text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                Kun USDT (TRC20). Andre kryptovalutaer vil gå tapt.
              </div>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <div className="font-bold text-gray-900">Viktig</div>
            <div>Betalingen må godkjennes av admin før aksjene overføres og registreres i aksjeeierboken.</div>
          </div>

          {status === 'awaiting_payment' ? (
            <form action={markPaid} className="mt-4">
              <input type="hidden" name="orderId" value={order.id} />
              <button className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">Jeg har betalt</button>
            </form>
          ) : null}

          {status === 'pending_approval' ? (
            <div className="mt-4 p-4 rounded-xl bg-yellow-50 border border-yellow-100 text-sm text-yellow-900">
              Venter godkjenning. Du får aksjene når admin godkjenner betalingen.
            </div>
          ) : null}

          {status === 'approved' ? (
            <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-100 text-sm text-green-900">
              Godkjent. Aksjene er overført og registrert i aksjeeierboken.
            </div>
          ) : null}

          {status === 'rejected' ? (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-900">
              Avvist. Ta kontakt hvis dette er en feil.
            </div>
          ) : null}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Avtale</h2>
          <div className="mt-3 text-sm text-gray-700 space-y-1">
            <div>Type: {order.type === 'emission' ? 'Emisjon' : 'Videresalg'}</div>
            <div>Pris per aksje: {Number(order.price_per_share || 0).toFixed(2)}</div>
            <div>Antall: {order.share_count}</div>
            <div>Dato: {new Date(order.created_at).toLocaleString('nb-NO')}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
