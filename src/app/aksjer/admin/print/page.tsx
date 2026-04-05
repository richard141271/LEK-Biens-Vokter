import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

function isVip(email: string | null | undefined) {
  const e = (email || '').toLowerCase();
  return ['richard141271@gmail.com', 'richard141271@gmail.no', 'lek@kias.no', 'jorn@kias.no'].includes(e);
}

function isMissingDbObjectError(message: string | null | undefined) {
  const m = (message || '').toLowerCase();
  if (!m) return false;
  return m.includes('could not find the table') || m.includes('does not exist') || (m.includes('column') && m.includes('does not exist'));
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
  const companyRes = await admin
    .from('stock_company_info')
    .select('company_name, orgnr, incorporation_date, share_capital, par_value')
    .eq('id', 1)
    .maybeSingle();
  const companyMissing = isMissingDbObjectError(companyRes.error?.message);

  let shareholdersExtended = true;
  let shareholders: any[] | null = null;
  let shareholdersError: string | null = null;
  const shareholdersRes = await admin
    .from('shareholders')
    .select('id, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering, entity_type, birth_date, national_id, orgnr, address_line1, address_line2, postal_code, city, country')
    .order('antall_aksjer', { ascending: false })
    .limit(5000);
  if (shareholdersRes.error && isMissingDbObjectError(shareholdersRes.error.message)) {
    shareholdersExtended = false;
    const fallback = await admin
      .from('shareholders')
      .select('id, navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering')
      .order('antall_aksjer', { ascending: false })
      .limit(5000);
    shareholders = fallback.data;
    shareholdersError = fallback.error?.message || null;
  } else {
    shareholders = shareholdersRes.data;
    shareholdersError = shareholdersRes.error?.message || null;
  }

  const lotsRes = await admin
    .from('stock_share_lots')
    .select('shareholder_id, share_class, start_no, end_no')
    .order('shareholder_id', { ascending: true })
    .order('start_no', { ascending: true })
    .limit(20000);
  const lotsMissing = isMissingDbObjectError(lotsRes.error?.message);

  const error =
    settingsRes.error?.message ||
    (companyMissing ? null : companyRes.error?.message) ||
    shareholdersError ||
    (lotsMissing ? null : lotsRes.error?.message) ||
    null;
  if (error) {
    redirect(`/aksjer/admin?error=${encodeURIComponent(error)}`);
  }

  const generatedAt = new Date().toLocaleString('nb-NO');
  const companyName = (companyMissing ? null : companyRes.data?.company_name) || 'AI Innovate AS';
  const totalShares = Number(settingsRes.data?.total_shares || 0);

  const lotsByShareholder = new Map<string, string[]>();
  if (!lotsMissing) {
    for (const l of lotsRes.data || []) {
      const key = String((l as any).shareholder_id);
      const label = `${String((l as any).share_class || 'A')}: ${Number((l as any).start_no)}–${Number((l as any).end_no)}`;
      const list = lotsByShareholder.get(key) || [];
      list.push(label);
      lotsByShareholder.set(key, list);
    }
  }

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
              <div className="text-lg font-black text-gray-900">{companyName}</div>
              <div className="text-xs text-gray-500 mt-1">Generert: {generatedAt}</div>
              <div className="text-xs text-gray-500 mt-1">
                Org.nr: {(companyMissing ? null : companyRes.data?.orgnr) || '-'} • Stiftet:{' '}
                {(companyMissing ? null : companyRes.data?.incorporation_date) || '-'} • Aksjekapital:{' '}
                {(companyMissing ? null : companyRes.data?.share_capital) ?? '-'} • Pålydende: {(companyMissing ? null : companyRes.data?.par_value) ?? '-'}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              Totalt aksjer: {totalShares}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Navn</th>
                  <th className="py-2 pr-4">Identitet</th>
                  <th className="py-2 pr-4">Adresse</th>
                  <th className="py-2 pr-4">Aksjeklasse</th>
                  <th className="py-2 pr-4">Aksjenummer</th>
                  <th className="py-2 pr-4 text-right">Antall</th>
                  <th className="py-2 pr-4">Oppdatert</th>
                </tr>
              </thead>
              <tbody>
                {(shareholders || []).map((s: any) => (
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
                          ? `${s.address_line1}${s.address_line2 ? `, ${s.address_line2}` : ''}${s.postal_code ? `, ${s.postal_code}` : ''}${s.city ? ` ${s.city}` : ''}${s.country ? `, ${s.country}` : ''}`
                          : '-'
                        : '-'}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">A</td>
                    <td className="py-2 pr-4 text-gray-700">{(lotsByShareholder.get(String(s.id)) || []).join(', ') || '-'}</td>
                    <td className="py-2 pr-4 text-right">{s.antall_aksjer}</td>
                    <td className="py-2 pr-4">{new Date(s.siste_oppdatering).toLocaleString('nb-NO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 text-xs text-gray-700">
            <div className="border-t pt-3">
              <div className="font-bold text-gray-900">Styrets godkjenning</div>
              <div className="mt-6">______________________________</div>
              <div>Dato / Signatur</div>
            </div>
            <div className="border-t pt-3">
              <div className="font-bold text-gray-900">Styreleder / daglig leder</div>
              <div className="mt-6">______________________________</div>
              <div>Navn</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
