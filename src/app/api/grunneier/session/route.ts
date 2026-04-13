import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'grunneier_token';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || '';

    if (!token) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: magicToken, error: tokenError } = await admin
      .from('magic_tokens')
      .select('email, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !magicToken) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const expiresAtMs = new Date(magicToken.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return NextResponse.json({ error: 'Utløpt', expired: true }, { status: 401 });
    }

    const email = String(magicToken.email || '').trim();
    if (!email) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const { data: contacts } = await admin
      .from('contacts')
      .select('id, name, email, address, postal_code, city, phone')
      .ilike('email', email);

    const contactIds = (contacts || []).map((c: any) => c.id);
    if (contactIds.length === 0) {
      return NextResponse.json({ apiaries: [], contacts: [] });
    }

    const { data: apiaryContacts } = await admin
      .from('apiary_contacts')
      .select('apiary_id, contact_id, role')
      .in('contact_id', contactIds)
      .limit(500);

    const apiaryIds = Array.from(
      new Set((apiaryContacts || []).map((ac: any) => ac.apiary_id))
    );

    const { data: apiaries } = apiaryIds.length
      ? await admin
          .from('apiaries')
          .select('id, name, apiary_number, latitude, longitude, location, type')
          .in('id', apiaryIds)
          .limit(500)
      : { data: [] as any[] };

    const apiaryMap = new Map((apiaries || []).map((a: any) => [a.id, a]));
    const contactMap = new Map((contacts || []).map((c: any) => [c.id, c]));

    const linkedApiaries =
      (apiaryContacts || [])
        .map((ac: any) => {
          const apiary = apiaryMap.get(ac.apiary_id);
          const contact = contactMap.get(ac.contact_id);
          if (!apiary || !contact) return null;
          return {
            apiary: {
              id: apiary.id,
              name: apiary.name,
              apiary_number: apiary.apiary_number,
              latitude: apiary.latitude,
              longitude: apiary.longitude,
              location: apiary.location,
              type: apiary.type,
            },
            contact: {
              id: contact.id,
              name: contact.name,
              email: contact.email,
              address: contact.address,
              postal_code: contact.postal_code,
              city: contact.city,
              phone: contact.phone,
            },
            role: ac.role,
          };
        })
        .filter(Boolean) || [];

    return NextResponse.json({
      email,
      contacts: contacts || [],
      apiaries: linkedApiaries,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
