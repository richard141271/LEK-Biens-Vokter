import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { buildPublicCompletedSigningUrl, getBaseUrlFromHeaders, normalizeSignRequestStatus } from '@/lib/signing';
import { generateSigningReceiptHtml } from '@/lib/signing-receipt';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function createPdfBufferFromHtml(html: string) {
  let browser: any;

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

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
  } finally {
    await browser.close();
  }
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const id = String(context.params.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Mangler id' }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: signRequest, error } = await admin
      .from('sign_requests')
      .select('*')
      .eq('id', id)
      .eq('created_by_user_id', user.id)
      .single();

    if (error || !signRequest) {
      return NextResponse.json({ error: 'Fant ikke signering' }, { status: 404 });
    }

    if (normalizeSignRequestStatus(signRequest as any) !== 'COMPLETED') {
      return NextResponse.json({ error: 'Kvittering kan genereres når begge har signert' }, { status: 400 });
    }

    const publicCompletedUrl = buildPublicCompletedSigningUrl(getBaseUrlFromHeaders(new Headers(request.headers)), signRequest.token);
    const receiptPdfPath = `${user.id}/signing-receipts/${signRequest.id}.pdf`;

    const html = generateSigningReceiptHtml({
      title: String(signRequest.title || ''),
      description: signRequest.description,
      token: String(signRequest.token || ''),
      recipientName: String(signRequest.recipient_name || ''),
      recipientEmail: String(signRequest.recipient_email || ''),
      recipientSignedAt: signRequest.recipient_signed_at,
      recipientSignatureName: signRequest.recipient_signature_name,
      senderName: String(signRequest.sender_signature_name || ''),
      senderSignedAt: signRequest.sender_signed_at,
      senderSignatureName: signRequest.sender_signature_name,
      generatedAt: new Date().toISOString(),
      publicCompletedUrl,
    });

    const pdfBuffer = await createPdfBufferFromHtml(html);
    const { error: uploadError } = await admin.storage.from('sign-documents').upload(receiptPdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: 'Kunne ikke generere kvittering' }, { status: 500 });
    }

    await admin
      .from('sign_requests')
      .update({ receipt_pdf_path: receiptPdfPath, updated_at: new Date().toISOString() })
      .eq('id', signRequest.id);

    const signed = await admin.storage.from('sign-documents').createSignedUrl(receiptPdfPath, 60 * 60);
    return NextResponse.json({ ok: true, receiptPdfUrl: signed.data?.signedUrl || null, publicCompletedUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
