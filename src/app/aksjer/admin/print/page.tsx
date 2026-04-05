import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

function isVip(email: string | null | undefined) {
  const e = (email || '').toLowerCase();
  return ['richard141271@gmail.com', 'richard141271@gmail.no', 'lek@kias.no', 'jorn@kias.no'].includes(e);
}

export default async function StockAdminPrintPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin' && !isVip(user.email)) redirect('/aksjer/dashboard');

  const settingsRes = await admin.from('stock_settings').select('total_shares').eq('id', 1).maybeSingle();
  const shareholdersRes = await admin
    .from('shareholders')
    .select('id, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering')
    .order('antall_aksjer', { ascending: false })
    .limit(5000);

  const error = settingsRes.error?.message || shareholdersRes.error?.message || null;
  if (error) {
    redirect(`/aksjer/admin?error=${encodeURIComponent(error)}`);
  }

  const generatedAt = new Date().toLocaleString('nb-NO');

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/admin" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Admin
          </Link>
          <div className="text-sm text-gray-500">Utskrift</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="print:hidden mb-4 text-sm text-gray-600">
          Bruk nettleserens utskrift (Cmd+P / Ctrl+P) for å skrive ut eller lagre som PDF.
        </div>

        <div className="border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500">Aksjeeierbok</div>
              <div className="text-lg font-black text-gray-900">AI Innovate AS</div>
              <div className="text-xs text-gray-500 mt-1">Generert: {generatedAt}</div>
            </div>
            <div className="text-right text-xs text-gray-500">
              Totalt registrerte aksjer (holding): {Number(settingsRes.data?.total_shares || 0)}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Navn</th>
                  <th className="py-2 pr-4">E-post</th>
                  <th className="py-2 pr-4 text-right">Aksjer</th>
                  <th className="py-2 pr-4 text-right">Snitt</th>
                  <th className="py-2 pr-4">Oppdatert</th>
                </tr>
              </thead>
              <tbody>
                {(shareholdersRes.data || []).map((s: any) => (
                  <tr key={s.id} className="border-t">
                    <td className="py-2 pr-4 font-semibold text-gray-900">{s.navn}</td>
                    <td className="py-2 pr-4 text-gray-700">{s.email}</td>
                    <td className="py-2 pr-4 text-right">{s.antall_aksjer}</td>
                    <td className="py-2 pr-4 text-right">{Number(s.gjennomsnittspris || 0).toFixed(2)}</td>
                    <td className="py-2 pr-4">{new Date(s.siste_oppdatering).toLocaleString('nb-NO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

