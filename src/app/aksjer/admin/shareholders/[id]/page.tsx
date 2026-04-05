import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { adminUpdateShareholder } from '@/app/aksjer/actions';

function isVip(email: string | null | undefined) {
  const e = (email || '').toLowerCase();
  return ['richard141271@gmail.com', 'richard141271@gmail.no', 'lek@kias.no', 'jorn@kias.no'].includes(e);
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
  if (profile?.role !== 'admin' && !isVip(user.email)) redirect('/aksjer/dashboard');

  const shareholderRes = await admin
    .from('shareholders')
    .select('id, navn, email, entity_type, birth_date, national_id, orgnr, address_line1, address_line2, postal_code, city, country')
    .eq('id', params.id)
    .maybeSingle();

  const lotsRes = await admin
    .from('stock_share_lots')
    .select('share_class, start_no, end_no')
    .eq('shareholder_id', params.id)
    .order('start_no', { ascending: true })
    .limit(2000);

  const shareholder = shareholderRes.data;
  const error = shareholderRes.error?.message || lotsRes.error?.message || null;
  if (error || !shareholder?.id) {
    redirect(`/aksjer/admin?error=${encodeURIComponent(error || 'Fant ikke aksjonær')}`);
  }

  const okParam = searchParams?.ok;
  const errorParam = searchParams?.error;

  const lotsText = (lotsRes.data || [])
    .map((l: any) => `${String(l.share_class || 'A')}: ${Number(l.start_no)}–${Number(l.end_no)}`)
    .join(', ');

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
          <div className="mt-1 text-sm text-gray-600">{shareholder.email || '-'}</div>
          <div className="mt-3 text-sm text-gray-700">
            <div className="text-gray-500">Aksjenummer</div>
            <div className="font-semibold text-gray-900 break-words">{lotsText || '-'}</div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Formell info</h2>

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

            <button className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">Lagre</button>
          </form>
        </section>
      </main>
    </div>
  );
}

