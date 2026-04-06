import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isVip(email: string | null | undefined) {
  const e = (email || '').toLowerCase();
  return ['richard141271@gmail.com', 'richard141271@gmail.no', 'lek@kias.no', 'jorn@kias.no'].includes(e);
}

function isMissingDbObjectError(message: string | null | undefined) {
  const m = (message || '').toLowerCase();
  if (!m) return false;
  return (
    m.includes('could not find the table') ||
    m.includes('does not exist') ||
    (m.includes('column') && m.includes('does not exist')) ||
    m.includes('schema cache')
  );
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function generateShareholderRegisterHtml(params: {
  company: {
    name: string;
    address: string | null;
    orgnr: string | null;
    incorporationDate: string | null;
    shareCapital: string | null;
    parValue: string | null;
  };
  generatedAt: string;
  totalShares: number;
  rows: Array<{
    navn: string;
    identitet: string;
    adresse: string;
    aksjeklasse: string;
    aksjenummer: string;
    antall: number;
    oppdatert: string;
  }>;
}) {
  const { company, generatedAt, totalShares, rows } = params;
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.navn)}</td>
        <td>${escapeHtml(r.identitet)}</td>
        <td>${escapeHtml(r.adresse)}</td>
        <td>${escapeHtml(r.aksjeklasse)}</td>
        <td>${escapeHtml(r.aksjenummer)}</td>
        <td class="num">${r.antall}</td>
        <td>${escapeHtml(r.oppdatert)}</td>
      </tr>`
    )
    .join('\n');

  return `<!doctype html>
  <html lang="nb">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Aksjeeierbok</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #111827; margin: 0; padding: 24px; }
        h1 { font-size: 18px; margin: 0; }
        .meta { margin-top: 6px; font-size: 12px; color: #6b7280; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { padding: 8px 10px; border-top: 1px solid #e5e7eb; font-size: 12px; vertical-align: top; }
        th { text-align: left; color: #6b7280; border-top: none; }
        .num { text-align: right; white-space: nowrap; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .siggrid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; font-size: 11px; color: #374151; }
        .sigbox { border-top: 1px solid #e5e7eb; padding-top: 10px; }
        .sigline { margin-top: 28px; border-bottom: 1px solid #111827; height: 18px; }
        .footer { margin-top: 12px; font-size: 11px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Aksjeeierbok – ${escapeHtml(company.name)}</h1>
        <div class="meta">
          Generert: ${escapeHtml(generatedAt)} • Totalt aksjer: ${totalShares} • Org.nr: ${escapeHtml(company.orgnr || '-')} • Stiftet: ${escapeHtml(company.incorporationDate || '-')}
          • Aksjekapital: ${escapeHtml(company.shareCapital || '-')} • Pålydende: ${escapeHtml(company.parValue || '-')}
          ${company.address ? `• Adresse: ${escapeHtml(company.address)}` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Navn</th>
              <th>Identitet</th>
              <th>Adresse</th>
              <th>Aksjeklasse</th>
              <th>Aksjenummer</th>
              <th class="num">Antall</th>
              <th>Oppdatert</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="siggrid">
          <div class="sigbox">
            <div><strong>Styrets godkjenning</strong></div>
            <div class="sigline"></div>
            <div>Dato / Signatur</div>
          </div>
          <div class="sigbox">
            <div><strong>Styreleder / daglig leder</strong></div>
            <div class="sigline"></div>
            <div>Navn</div>
          </div>
        </div>
        <div class="footer">Kilde: LEK-Biens Vokter – Aksjeplattform</div>
      </div>
    </body>
  </html>`;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin' && !isVip(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settingsRes = await admin.from('stock_settings').select('total_shares, holding_shareholder_id').eq('id', 1).maybeSingle();
  const companyRes = await admin
    .from('stock_company_info')
    .select('company_name, orgnr, incorporation_date, share_capital, par_value, address_line1, address_line2, postal_code, city, country')
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

  const queryError =
    settingsRes.error?.message ||
    (companyMissing ? null : companyRes.error?.message) ||
    shareholdersError ||
    (lotsMissing ? null : lotsRes.error?.message) ||
    null;
  if (queryError) {
    return NextResponse.json({ error: queryError }, { status: 500 });
  }

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

  const holdingId = String(settingsRes.data?.holding_shareholder_id || '');
  const visibleShareholders = (shareholders || []).filter((s: any) => {
    const count = Number(s?.antall_aksjer || 0);
    if (count > 0) return true;
    return holdingId && String(s?.id || '') === holdingId;
  });

  const rows = visibleShareholders.map((s: any) => {
    const identitet = shareholdersExtended
      ? s.entity_type === 'company'
        ? String(s.orgnr || '')
        : s.entity_type === 'person'
          ? String(s.national_id || (s.birth_date ? String(s.birth_date) : ''))
          : ''
      : '';

    const adresse = shareholdersExtended
      ? s.address_line1
        ? `${String(s.address_line1)}${s.address_line2 ? `, ${String(s.address_line2)}` : ''}${s.postal_code ? `, ${String(s.postal_code)}` : ''}${s.city ? ` ${String(s.city)}` : ''}${s.country ? `, ${String(s.country)}` : ''}`
        : ''
      : '';

    return {
      navn: String(s.navn || ''),
      identitet: identitet || '-',
      adresse: adresse || '-',
      aksjeklasse: 'A',
      aksjenummer: (lotsByShareholder.get(String(s.id)) || []).join(', ') || '-',
      antall: Number(s.antall_aksjer || 0),
      oppdatert: s.siste_oppdatering ? new Date(s.siste_oppdatering).toLocaleString('nb-NO') : '-',
    };
  });

  const generatedAt = new Date().toLocaleString('nb-NO');
  const companyAddressParts = [
    !companyMissing && (companyRes.data as any)?.address_line1 ? String((companyRes.data as any).address_line1) : '',
    !companyMissing && (companyRes.data as any)?.address_line2 ? String((companyRes.data as any).address_line2) : '',
    !companyMissing && (companyRes.data as any)?.postal_code ? String((companyRes.data as any).postal_code) : '',
    !companyMissing && (companyRes.data as any)?.city ? String((companyRes.data as any).city) : '',
    !companyMissing && (companyRes.data as any)?.country ? String((companyRes.data as any).country) : '',
  ].filter(Boolean);
  const companyAddress = companyAddressParts.length ? companyAddressParts.join(', ') : null;
  const html = generateShareholderRegisterHtml({
    company: {
      name: String((companyMissing ? null : companyRes.data?.company_name) || 'AI Innovate AS'),
      address: companyAddress,
      orgnr: !companyMissing && companyRes.data?.orgnr ? String(companyRes.data.orgnr) : null,
      incorporationDate: !companyMissing && companyRes.data?.incorporation_date ? String(companyRes.data.incorporation_date) : null,
      shareCapital: !companyMissing && companyRes.data?.share_capital != null ? String(companyRes.data.share_capital) : null,
      parValue: !companyMissing && companyRes.data?.par_value != null ? String(companyRes.data.par_value) : null,
    },
    generatedAt,
    totalShares: Number(settingsRes.data?.total_shares || 0),
    rows,
  });

  try {
    let browser;

    if (process.env.NODE_ENV === 'production') {
      const chromium = require('@sparticuz/chromium');
      const puppeteerCore = require('puppeteer-core');
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({ headless: 'new' });
    }

    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Aksjeeierbok-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
