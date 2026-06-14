import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isStagingLikeHost } from '@/lib/signing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function createSimplePdfBuffer(title: string, description: string) {
  const lines = [
    title,
    '',
    description,
    '',
    'LEK-Signering demo dokument',
    `Generert: ${new Date().toLocaleString('nb-NO')}`,
  ];

  let content = 'BT\n/F1 20 Tf\n40 780 Td\n';
  lines.forEach((line, index) => {
    if (index > 0) {
      content += '0 -28 Td\n';
    }
    content += `(${escapePdfText(line)}) Tj\n`;
  });
  content += 'ET';

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export async function POST(request: Request) {
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    if (!isStagingLikeHost(host)) {
      return NextResponse.json({ error: 'Kun tilgjengelig i staging' }, { status: 404 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { count } = await admin
      .from('sign_requests')
      .select('*', { count: 'exact', head: true })
      .eq('created_by_user_id', user.id);

    if ((count || 0) > 0) {
      return NextResponse.json({ ok: true, alreadyExists: true });
    }

    const demoItems = [
      {
        title: 'Studentavtale sommer 2026',
        description: 'Demoavtale som allerede er signert av mottaker og venter på avsender.',
        recipient_name: 'Torgeir Gran Fjereide',
        recipient_email: 'torgeir.demo@example.com',
        recipient_phone: '900 00 001',
        status: 'SIGNED_BY_RECIPIENT',
        recipient_signature_name: 'Torgeir Gran Fjereide',
        recipient_signed_at: '2026-06-14T16:42:00.000Z',
      },
      {
        title: 'Samarbeidsavtale utstyr',
        description: 'Demoavtale som er sendt og klar til mottakersignering.',
        recipient_name: 'Anne Lise Demo',
        recipient_email: 'anne.demo@example.com',
        recipient_phone: '900 00 002',
        status: 'SENT',
        recipient_signature_name: null,
        recipient_signed_at: null,
      },
      {
        title: 'Fullført demoavtale',
        description: 'Demoavtale som er ferdig signert og ligger klar i arkiv.',
        recipient_name: 'Vidar Demo',
        recipient_email: 'vidar.demo@example.com',
        recipient_phone: '900 00 003',
        status: 'COMPLETED',
        recipient_signature_name: 'Vidar Demo',
        recipient_signed_at: '2026-06-10T10:15:00.000Z',
        sender_signature_name: 'LEK Demo',
        sender_signed_at: '2026-06-10T10:45:00.000Z',
      },
    ];

    const inserts = [];
    for (const item of demoItems) {
      const fileSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const pdfPath = `${user.id}/signing-demo/${fileSlug}.pdf`;
      const pdfBuffer = createSimplePdfBuffer(item.title, item.description);
      const { error: uploadError } = await admin.storage.from('sign-documents').upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

      if (uploadError) {
        return NextResponse.json({ error: 'Kunne ikke laste opp demo-PDF' }, { status: 500 });
      }

      inserts.push({
        created_by_user_id: user.id,
        title: item.title,
        description: item.description,
        pdf_path: pdfPath,
        completed_pdf_path: item.status === 'COMPLETED' ? pdfPath : null,
        recipient_name: item.recipient_name,
        recipient_email: item.recipient_email,
        recipient_phone: item.recipient_phone,
        token: crypto.randomBytes(24).toString('base64url'),
        status: item.status,
        recipient_signature_name: item.recipient_signature_name,
        recipient_signed_at: item.recipient_signed_at,
        sender_signature_name: (item as any).sender_signature_name || null,
        sender_signed_at: (item as any).sender_signed_at || null,
      });
    }

    const { data, error } = await admin.from('sign_requests').insert(inserts).select('id, token, title, status');
    if (error) {
      return NextResponse.json({ error: 'Kunne ikke opprette demo-data' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, requests: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
