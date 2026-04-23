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

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Ikke logget inn' }, { status: 401 });
    }

    const admin = createAdminClient();

    const [outgoingAccessRes, incomingAccessRes, outgoingInvitesRes] = await Promise.all([
      admin
        .from('account_access')
        .select('owner_id, member_id, role, can_write, can_delete, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
      admin
        .from('account_access')
        .select('owner_id, member_id, role, can_write, can_delete, created_at')
        .eq('member_id', user.id)
        .order('created_at', { ascending: false }),
      admin
        .from('account_invites')
        .select('id, owner_id, email, role, can_write, can_delete, token, expires_at, accepted_at, created_at')
        .eq('owner_id', user.id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ]);

    const err = outgoingAccessRes.error || incomingAccessRes.error || outgoingInvitesRes.error;
    if (err) {
      const msg = String(err?.message || 'Kunne ikke hente tilganger');
      if (msg.toLowerCase().includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Database mangler migrasjon for tilgangsinvitasjoner (account_invites/account_access).' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    const outgoingAccess = outgoingAccessRes.data || [];
    const incomingAccess = incomingAccessRes.data || [];
    const outgoingInvites = outgoingInvitesRes.data || [];

    const memberIds = Array.from(new Set(outgoingAccess.map((a: any) => String(a.member_id))));
    const ownerIds = Array.from(new Set(incomingAccess.map((a: any) => String(a.owner_id))));
    const profileIds = Array.from(new Set([...memberIds, ...ownerIds]));

    const profilesRes = profileIds.length
      ? await admin.from('profiles').select('id, full_name, city').in('id', profileIds)
      : { data: [] as any[], error: null as any };

    if (profilesRes.error) {
      return NextResponse.json({ success: false, error: profilesRes.error.message }, { status: 500 });
    }

    const profiles = profilesRes.data || [];
    const byId = new Map<string, any>(profiles.map((p: any) => [String(p.id), p]));

    return NextResponse.json({
      success: true,
      outgoing: outgoingAccess.map((a: any) => ({
        ...a,
        memberProfile: byId.get(String(a.member_id)) || null,
      })),
      incoming: incomingAccess.map((a: any) => ({
        ...a,
        ownerProfile: byId.get(String(a.owner_id)) || null,
      })),
      invites: outgoingInvites.map((i: any) => ({ ...i })),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}

