import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const adminVerifier = createAdminClient();
    const { data: adminProfile } = await adminVerifier
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: agreements, error: agreementsError } = await admin
      .from('grunneier_agreements')
      .select(
        'id, status, apiary_id, contact_id, created_by, role, contact_signed_at, beekeeper_signed_at, created_at, updated_at, terminated_at, terminated_by'
      )
      .order('updated_at', { ascending: false })
      .limit(200);

    if (agreementsError) {
      return NextResponse.json({ error: agreementsError.message }, { status: 500 });
    }

    const apiaryIds = Array.from(new Set((agreements || []).map((a: any) => a.apiary_id).filter(Boolean)));
    const contactIds = Array.from(new Set((agreements || []).map((a: any) => a.contact_id).filter(Boolean)));
    const beekeeperIds = Array.from(new Set((agreements || []).map((a: any) => a.created_by).filter(Boolean)));

    const [apiariesRes, contactsRes, profilesRes] = await Promise.all([
      apiaryIds.length
        ? admin
            .from('apiaries')
            .select('id, name, apiary_number, location')
            .in('id', apiaryIds)
        : Promise.resolve({ data: [] as any[], error: null as any }),
      contactIds.length
        ? admin.from('contacts').select('id, name, email').in('id', contactIds)
        : Promise.resolve({ data: [] as any[], error: null as any }),
      beekeeperIds.length
        ? admin.from('profiles').select('id, full_name').in('id', beekeeperIds)
        : Promise.resolve({ data: [] as any[], error: null as any }),
    ]);

    if (apiariesRes.error) return NextResponse.json({ error: apiariesRes.error.message }, { status: 500 });
    if (contactsRes.error) return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });
    if (profilesRes.error) return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });

    const apiaryMap = new Map((apiariesRes.data || []).map((a: any) => [a.id, a]));
    const contactMap = new Map((contactsRes.data || []).map((c: any) => [c.id, c]));
    const beekeeperMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

    const enriched = (agreements || []).map((a: any) => ({
      ...a,
      apiary: a.apiary_id ? apiaryMap.get(a.apiary_id) || null : null,
      contact: a.contact_id ? contactMap.get(a.contact_id) || null : null,
      beekeeper: a.created_by ? beekeeperMap.get(a.created_by) || null : null,
    }));

    return NextResponse.json({ agreements: enriched }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}

