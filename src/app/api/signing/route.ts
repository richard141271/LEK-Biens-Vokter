import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { buildPublicSigningUrl, getBaseUrlFromHeaders } from '@/lib/signing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizeScope(value: string) {
  if (value === 'archive') return 'archive';
  if (value === 'all') return 'all';
  return 'active';
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const scope = normalizeScope(new URL(request.url).searchParams.get('scope') || 'active');

    let query = supabase
      .from('sign_requests')
      .select('*')
      .eq('created_by_user_id', user.id)
      .order('updated_at', { ascending: false });

    if (scope === 'archive') {
      query = query.eq('status', 'COMPLETED');
    } else if (scope === 'active') {
      query = query.not('status', 'in', '("COMPLETED","CANCELLED")');
    }

    const [{ data: requests, error }, { data: profile }] = await Promise.all([
      query,
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    ]);

    if (error) {
      return NextResponse.json({ error: 'Kunne ikke hente signeringer' }, { status: 500 });
    }

    return NextResponse.json({
      requests: requests || [],
      senderName: String(profile?.full_name || user.user_metadata?.full_name || user.email || '').trim(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const recipientName = String(body?.recipientName || '').trim();
    const recipientEmail = String(body?.recipientEmail || '').trim().toLowerCase();
    const recipientPhone = String(body?.recipientPhone || '').trim();
    const pdfPath = String(body?.pdfPath || '').trim();

    if (!title || !recipientName || !recipientEmail || !pdfPath) {
      return NextResponse.json({ error: 'Mangler obligatoriske felt' }, { status: 400 });
    }

    if (!pdfPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Ugyldig PDF-sti' }, { status: 400 });
    }

    const token = crypto.randomBytes(24).toString('base64url');
    const payload = {
      created_by_user_id: user.id,
      title,
      description: description || null,
      pdf_path: pdfPath,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone || null,
      token,
      status: 'SENT',
    };

    const { data, error } = await supabase.from('sign_requests').insert(payload).select('*').single();
    if (error || !data) {
      return NextResponse.json({ error: 'Kunne ikke opprette signering' }, { status: 500 });
    }

    const publicSignUrl = buildPublicSigningUrl(getBaseUrlFromHeaders(new Headers(request.headers)), token);
    return NextResponse.json({ request: data, publicSignUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
