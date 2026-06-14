import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { buildPublicCompletedSigningUrl, getBaseUrlFromHeaders, normalizeSignRequestStatus } from '@/lib/signing';
import { generateSigningReceiptHtml } from '@/lib/signing-receipt';
import { getMailService } from '@/services/mail';

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
    const body = await request.json().catch(() => ({}));
    const signatureName = String(body?.signatureName || '').trim();

    if (!id || !signatureName) {
      return NextResponse.json({ error: 'Mangler data' }, { status: 400 });
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

    const normalizedStatus = normalizeSignRequestStatus(signRequest as any);

    if (!signRequest.recipient_signed_at && normalizedStatus !== 'SIGNED_BY_RECIPIENT' && normalizedStatus !== 'COMPLETED') {
      return NextResponse.json({ error: 'Mottaker må signere først' }, { status: 400 });
    }

    if (normalizedStatus === 'COMPLETED') {
      return NextResponse.json({ ok: true });
    }

    if (signRequest.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Signeringen er avbrutt' }, { status: 400 });
    }

    const completedPdfPath =
      signRequest.completed_pdf_path || `${user.id}/signing-completed/${signRequest.id}-${Date.now()}.pdf`;

    if (!signRequest.completed_pdf_path) {
      const { error: copyError } = await admin.storage.from('sign-documents').copy(signRequest.pdf_path, completedPdfPath);
      if (copyError) {
        return NextResponse.json({ error: 'Kunne ikke lagre ferdig signert dokument' }, { status: 500 });
      }
    }

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from('sign_requests')
      .update({
        sender_signature_name: signatureName,
        sender_signed_at: now,
        status: 'COMPLETED',
        updated_at: now,
        completed_pdf_path: completedPdfPath,
      })
      .eq('id', signRequest.id);

    if (updateError) {
      return NextResponse.json({ error: 'Kunne ikke fullfoere signering' }, { status: 500 });
    }

    const publicCompletedUrl = buildPublicCompletedSigningUrl(getBaseUrlFromHeaders(new Headers(request.headers)), signRequest.token);
    const receiptPdfPath = `${user.id}/signing-receipts/${signRequest.id}.pdf`;
    let receiptGenerated = false;

    try {
      const html = generateSigningReceiptHtml({
        title: String(signRequest.title || ''),
        description: signRequest.description,
        token: String(signRequest.token || ''),
        recipientName: String(signRequest.recipient_name || ''),
        recipientEmail: String(signRequest.recipient_email || ''),
        recipientSignedAt: signRequest.recipient_signed_at,
        recipientSignatureName: signRequest.recipient_signature_name,
        senderName: signatureName,
        senderSignedAt: now,
        senderSignatureName: signatureName,
        generatedAt: new Date().toISOString(),
        publicCompletedUrl,
      });

      const pdfBuffer = await createPdfBufferFromHtml(html);
      const { error: uploadError } = await admin.storage.from('sign-documents').upload(receiptPdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

      if (!uploadError) {
        await admin
          .from('sign_requests')
          .update({ receipt_pdf_path: receiptPdfPath, updated_at: new Date().toISOString() })
          .eq('id', signRequest.id);
        receiptGenerated = true;
      }
    } catch {}

    try {
      const mail = getMailService(admin);
      await mail.sendMail(
        'LEK-Signering',
        String(signRequest.recipient_email || ''),
        `Ferdig signert: ${signRequest.title}`,
        [
          `Hei ${signRequest.recipient_name},`,
          '',
          'Dokumentet er nå ferdig signert av begge parter.',
          '',
          `Åpne ferdig signert dokument: ${publicCompletedUrl}`,
          '',
          `<a href="${publicCompletedUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">Åpne ferdig signert dokument</a>`,
        ].join('\n'),
        user.id,
      );
    } catch {}

    return NextResponse.json({ ok: true, publicCompletedUrl, receiptGenerated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
