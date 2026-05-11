import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const contactId = String(body?.contactId || '').trim();
  if (!contactId) {
    return NextResponse.json({ error: 'Mangler contactId' }, { status: 400 });
  }

  const name = String(body?.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Navn mangler' }, { status: 400 });
  }

  const emailLower = normalizeEmail(user.email);
  if (!emailLower) {
    return NextResponse.json({ error: 'Mangler e-post på bruker' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: contact, error: contactError } = await admin
    .from('contacts')
    .select('id, email')
    .eq('id', contactId)
    .maybeSingle();

  if (contactError) {
    return NextResponse.json({ error: contactError.message }, { status: 500 });
  }
  if (!contact?.id) {
    return NextResponse.json({ error: 'Fant ikke kontakt' }, { status: 404 });
  }

  const contactEmailLower = normalizeEmail((contact as any)?.email);
  if (!contactEmailLower || contactEmailLower !== emailLower) {
    return NextResponse.json({ error: 'Ingen tilgang til kontakt' }, { status: 403 });
  }

  const phone = body?.phone != null ? String(body.phone).trim() : null;
  const address = body?.address != null ? String(body.address).trim() : null;
  const postal_code = body?.postal_code != null ? String(body.postal_code).trim() : null;
  const city = body?.city != null ? String(body.city).trim() : null;

  const update: any = {
    name,
    phone: phone || null,
    address: address || null,
    postal_code: postal_code || null,
    city: city || null,
  };

  const { data: updated, error: updateError } = await admin
    .from('contacts')
    .update(update)
    .eq('id', contactId)
    .select('id, name, email, phone, address, postal_code, city')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, contact: updated }, { status: 200 });
}
