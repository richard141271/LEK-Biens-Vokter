import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isVip(email: string | null | undefined) {
  const e = (email || '').toLowerCase();
  return ['richard141271@gmail.com', 'richard141271@gmail.no', 'lek@kias.no', 'jorn@kias.no'].includes(e);
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
  company: string;
  generatedAt: string;
  totalShares: number;
  rows: Array<{ navn: string; email: string; antall: number; snitt: number; oppdatert: string }>;
}) {
  const { company, generatedAt, totalShares, rows } = params;
  const tableRows = rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.navn)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td class="num">${r.antall}</td>
        <td class="num">${r.snitt.toFixed(2)}</td>
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
        .footer { margin-top: 12px; font-size: 11px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Aksjeeierbok – ${escapeHtml(company)}</h1>
        <div class="meta">Generert: ${escapeHtml(generatedAt)} • Totalt registrerte aksjer (holding): ${totalShares}</div>
        <table>
          <thead>
            <tr>
              <th>Navn</th>
              <th>E-post</th>
              <th class="num">Aksjer</th>
              <th class="num">Snitt</th>
              <th>Oppdatert</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
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

  const settingsRes = await admin.from('stock_settings').select('total_shares').eq('id', 1).maybeSingle();
  const shareholdersRes = await admin
    .from('shareholders')
    .select('navn, email, antall_aksjer, gjennomsnittspris, siste_oppdatering')
    .order('antall_aksjer', { ascending: false })
    .limit(5000);

  const queryError = settingsRes.error?.message || shareholdersRes.error?.message || null;
  if (queryError) {
    return NextResponse.json({ error: queryError }, { status: 500 });
  }

  const rows = (shareholdersRes.data || []).map((s: any) => ({
    navn: String(s.navn || ''),
    email: String(s.email || ''),
    antall: Number(s.antall_aksjer || 0),
    snitt: Number(s.gjennomsnittspris || 0),
    oppdatert: s.siste_oppdatering ? new Date(s.siste_oppdatering).toLocaleString('nb-NO') : '-',
  }));

  const generatedAt = new Date().toLocaleString('nb-NO');
  const html = generateShareholderRegisterHtml({
    company: 'AI Innovate AS',
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

