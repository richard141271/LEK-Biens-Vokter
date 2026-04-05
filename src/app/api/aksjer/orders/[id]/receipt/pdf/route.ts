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
  return m.includes('could not find the table') || m.includes('does not exist') || (m.includes('column') && m.includes('does not exist'));
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderReceiptHtml(params: {
  companyName: string;
  companyOrgnr: string | null;
  generatedAt: string;
  order: {
    id: string;
    type: string;
    status: string;
    shareCount: number;
    pricePerShare: number;
    totalAmount: number;
    feeAmount: number;
    paymentMethod: string;
    paymentReference: string;
    createdAt: string;
    paidAt: string | null;
    approvedAt: string | null;
  };
  buyer: { name: string; email: string | null; identity: string | null; address: string | null };
  seller: { name: string; email: string | null } | null;
}) {
  const { companyName, companyOrgnr, generatedAt, order, buyer, seller } = params;

  return `<!doctype html>
<html lang="no">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kvittering</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 6px; }
      h2 { font-size: 13px; margin: 18px 0 6px; }
      .muted { color: #666; }
      .box { border: 1px solid #ddd; border-radius: 10px; padding: 14px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { text-align: left; padding: 6px 0; border-bottom: 1px solid #eee; vertical-align: top; }
      th { color: #666; font-weight: bold; width: 40%; }
      .amount { font-size: 16px; font-weight: 800; }
      .right { text-align: right; }
      .small { font-size: 11px; }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="grid">
        <div>
          <h1>Kvittering</h1>
          <div class="muted">${escapeHtml(companyName)}${companyOrgnr ? ` • Org.nr ${escapeHtml(companyOrgnr)}` : ''}</div>
          <div class="muted small">Generert: ${escapeHtml(generatedAt)}</div>
        </div>
        <div class="right">
          <div class="muted">Beløp</div>
          <div class="amount">${Number(order.totalAmount || 0).toFixed(2)}</div>
          <div class="muted small">Ref: ${escapeHtml(order.paymentReference)}</div>
        </div>
      </div>

      <h2>Ordre</h2>
      <table>
        <tbody>
          <tr><th>Type</th><td>${escapeHtml(order.type === 'emission' ? 'Emisjon' : order.type === 'resale' ? 'Videresalg' : order.type)}</td></tr>
          <tr><th>Status</th><td>${escapeHtml(order.status)}</td></tr>
          <tr><th>Antall aksjer</th><td>${escapeHtml(String(order.shareCount))}</td></tr>
          <tr><th>Pris per aksje</th><td>${Number(order.pricePerShare || 0).toFixed(2)}</td></tr>
          <tr><th>Gebyr</th><td>${Number(order.feeAmount || 0).toFixed(2)}</td></tr>
          <tr><th>Betalingsmetode</th><td>${escapeHtml(order.paymentMethod)}</td></tr>
          <tr><th>Opprettet</th><td>${escapeHtml(order.createdAt)}</td></tr>
          <tr><th>Betalt</th><td>${escapeHtml(order.paidAt || '-')}</td></tr>
          <tr><th>Godkjent</th><td>${escapeHtml(order.approvedAt || '-')}</td></tr>
        </tbody>
      </table>

      <h2>Kjøper</h2>
      <table>
        <tbody>
          <tr><th>Navn</th><td>${escapeHtml(buyer.name)}</td></tr>
          <tr><th>E-post</th><td>${escapeHtml(buyer.email || '-')}</td></tr>
          <tr><th>Identitet</th><td>${escapeHtml(buyer.identity || '-')}</td></tr>
          <tr><th>Adresse</th><td>${escapeHtml(buyer.address || '-')}</td></tr>
        </tbody>
      </table>

      ${
        seller
          ? `<h2>Selger</h2>
      <table>
        <tbody>
          <tr><th>Navn</th><td>${escapeHtml(seller.name)}</td></tr>
          <tr><th>E-post</th><td>${escapeHtml(seller.email || '-')}</td></tr>
        </tbody>
      </table>`
          : ''
      }

      <div class="muted small" style="margin-top: 14px;">
        Denne kvitteringen dokumenterer bestilling og betaling/godkjenning i aksjeplattformen.
      </div>
    </div>
  </body>
</html>`;
}

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();

  const orderRes = await admin
    .from('stock_orders')
    .select('id, buyer_id, seller_id, type, status, share_count, price_per_share, total_amount, fee_amount, payment_method, payment_reference, created_at, paid_at, approved_at')
    .eq('id', ctx.params.id)
    .maybeSingle();

  const order = orderRes.data as any;
  if (!order?.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = profile?.role === 'admin' || isVip(user.email);
  if (!isAdmin && String(order.buyer_id) !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyRes = await admin
    .from('stock_company_info')
    .select('company_name, orgnr')
    .eq('id', 1)
    .maybeSingle();
  const companyMissing = isMissingDbObjectError(companyRes.error?.message);

  const buyerRes = await admin
    .from('shareholders')
    .select('navn, email, entity_type, birth_date, national_id, orgnr, address_line1, address_line2, postal_code, city, country')
    .eq('user_id', order.buyer_id)
    .maybeSingle();

  let buyer: any = buyerRes.data;
  let buyerIdentity: string | null = null;
  let buyerAddress: string | null = null;
  if (buyerRes.error && isMissingDbObjectError(buyerRes.error.message)) {
    const fallback = await admin.from('shareholders').select('navn, email').eq('user_id', order.buyer_id).maybeSingle();
    buyer = fallback.data;
  } else {
    if (buyer?.entity_type === 'company') buyerIdentity = buyer?.orgnr ? String(buyer.orgnr) : null;
    if (buyer?.entity_type === 'person') buyerIdentity = buyer?.national_id ? String(buyer.national_id) : buyer?.birth_date ? String(buyer.birth_date) : null;
    buyerAddress = buyer?.address_line1
      ? `${String(buyer.address_line1)}${buyer.address_line2 ? `, ${String(buyer.address_line2)}` : ''}${buyer.postal_code ? `, ${String(buyer.postal_code)}` : ''}${buyer.city ? ` ${String(buyer.city)}` : ''}${buyer.country ? `, ${String(buyer.country)}` : ''}`
      : null;
  }

  let sellerInfo: { name: string; email: string | null } | null = null;
  if (order.type === 'resale' && order.seller_id) {
    const sellerRes = await admin.from('shareholders').select('navn, email').eq('user_id', order.seller_id).maybeSingle();
    if (sellerRes.data?.navn) {
      sellerInfo = { name: String(sellerRes.data.navn), email: sellerRes.data.email ? String(sellerRes.data.email) : null };
    }
  }

  const generatedAt = new Date().toLocaleString('nb-NO');
  const html = renderReceiptHtml({
    companyName: String((companyMissing ? null : companyRes.data?.company_name) || 'AI Innovate AS'),
    companyOrgnr: !companyMissing && companyRes.data?.orgnr ? String(companyRes.data.orgnr) : null,
    generatedAt,
    order: {
      id: String(order.id),
      type: String(order.type),
      status: String(order.status),
      shareCount: Number(order.share_count || 0),
      pricePerShare: Number(order.price_per_share || 0),
      totalAmount: Number(order.total_amount || 0),
      feeAmount: Number(order.fee_amount || 0),
      paymentMethod: String(order.payment_method || ''),
      paymentReference: String(order.payment_reference || ''),
      createdAt: new Date(order.created_at).toLocaleString('nb-NO'),
      paidAt: order.paid_at ? new Date(order.paid_at).toLocaleString('nb-NO') : null,
      approvedAt: order.approved_at ? new Date(order.approved_at).toLocaleString('nb-NO') : null,
    },
    buyer: {
      name: String(buyer?.navn || user.email || ''),
      email: buyer?.email ? String(buyer.email) : user.email ? String(user.email) : null,
      identity: buyerIdentity,
      address: buyerAddress,
    },
    seller: sellerInfo,
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

    const safeRef = String(order.payment_reference || 'kvittering').replaceAll(/[^a-zA-Z0-9_-]/g, '');
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Kvittering-${safeRef || 'ordre'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Receipt PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

