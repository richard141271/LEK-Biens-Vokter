import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

function isVip(email: string | null | undefined) {
  const e = (email || '').toLowerCase();
  return ['richard141271@gmail.com', 'richard141271@gmail.no', 'lek@kias.no', 'jorn@kias.no'].includes(e);
}

export default async function StockAdminOrderPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin' && !isVip(user.email)) redirect('/aksjer/dashboard');

  const orderId = params.id;
  const { data: order, error } = await admin
    .from('stock_orders')
    .select(
      'id, type, status, buyer_id, seller_id, listing_id, share_count, price_per_share, total_amount, fee_amount, fee_rate, payment_method, payment_reference, agreement_json, created_at, paid_at, approved_at, signed_at, signed_ip, buyer_ip'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order?.id) {
    redirect('/aksjer/admin?error=Fant%20ikke%20ordre');
  }

  const { data: buyerShareholder } = await admin
    .from('shareholders')
    .select('navn, email')
    .eq('user_id', order.buyer_id)
    .maybeSingle();

  const { data: sellerShareholder } = order.seller_id
    ? await admin.from('shareholders').select('navn, email').eq('user_id', order.seller_id).maybeSingle()
    : { data: null };

  const agreementBuyerName = (order.agreement_json as any)?.buyerName || null;
  const agreementBuyerEmail = (order.agreement_json as any)?.buyerEmail || null;
  const isApproved = String(order.status) === 'approved';
  const isRejected = String(order.status) === 'rejected';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/admin" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Admin
          </Link>
          <div className="text-sm text-gray-500">Ordre</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">ID</div>
              <div className="text-sm font-bold text-gray-900 break-all">{order.id}</div>
              <div className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString('nb-NO')}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Status</div>
              <div className="text-sm font-black text-gray-900">{order.status}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Type</div>
              <div className="font-bold text-gray-900">{order.type}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Aksjer</div>
              <div className="font-bold text-gray-900">{order.share_count}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Pris per aksje</div>
              <div className="font-bold text-gray-900">{Number(order.price_per_share || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Total</div>
              <div className="font-bold text-gray-900">{Number(order.total_amount || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Gebyr</div>
              <div className="font-bold text-gray-900">{Number(order.fee_amount || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Betaling</div>
              <div className="font-bold text-gray-900 truncate">{order.payment_method}</div>
              <div className="text-xs text-gray-500 truncate">{order.payment_reference}</div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Kjøper</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Navn</div>
              <div className="font-bold text-gray-900">{buyerShareholder?.navn || agreementBuyerName || '-'}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">E-post</div>
              <div className="font-bold text-gray-900">{buyerShareholder?.email || agreementBuyerEmail || '-'}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Buyer ID</div>
              <div className="font-bold text-gray-900 break-all">{order.buyer_id}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Buyer IP</div>
              <div className="font-bold text-gray-900 break-all">{order.buyer_ip || '-'}</div>
            </div>
          </div>
        </section>

        {order.seller_id ? (
          <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">Selger</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-gray-500">Navn</div>
                <div className="font-bold text-gray-900">{sellerShareholder?.navn || '-'}</div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-gray-500">E-post</div>
                <div className="font-bold text-gray-900">{sellerShareholder?.email || '-'}</div>
              </div>
              <div className="rounded-xl border border-gray-200 p-4 md:col-span-2">
                <div className="text-gray-500">Seller ID</div>
                <div className="font-bold text-gray-900 break-all">{order.seller_id}</div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Tidsstempler</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Signert</div>
              <div className="font-bold text-gray-900">{order.signed_at ? new Date(order.signed_at).toLocaleString('nb-NO') : '-'}</div>
              <div className="text-xs text-gray-500 break-all">{order.signed_ip || '-'}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Markert betalt</div>
              <div className="font-bold text-gray-900">{order.paid_at ? new Date(order.paid_at).toLocaleString('nb-NO') : '-'}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Godkjent</div>
              <div className="font-bold text-gray-900">
                {isApproved && order.approved_at ? new Date(order.approved_at).toLocaleString('nb-NO') : '-'}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-500">Avvist</div>
              <div className="font-bold text-gray-900">
                {isRejected && order.approved_at ? new Date(order.approved_at).toLocaleString('nb-NO') : '-'}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
