import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Ikke logget inn' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || '').trim();
    if (!token) return NextResponse.json({ success: false, error: 'Mangler token' }, { status: 400 });

    const admin = createAdminClient();
    const { data: invite, error: inviteError } = await admin
      .from('account_invites')
      .select('id, owner_id, role, can_write, can_delete, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) {
      const msg = String(inviteError?.message || 'Kunne ikke lese invitasjon');
      if (msg.toLowerCase().includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Database mangler migrasjon for tilgangsinvitasjoner (account_invites/account_access).' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    if (!invite?.id || !invite.owner_id) {
      return NextResponse.json({ success: false, error: 'Invitasjon finnes ikke' }, { status: 404 });
    }
    if (invite.accepted_at) {
      return NextResponse.json({ success: false, error: 'Invitasjon er allerede brukt' }, { status: 400 });
    }
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ success: false, error: 'Invitasjon er utløpt' }, { status: 400 });
    }
    if (invite.owner_id === user.id) {
      return NextResponse.json({ success: false, error: 'Du kan ikke invitere deg selv' }, { status: 400 });
    }

    const { error: upsertError } = await admin.from('account_access').upsert(
      {
        owner_id: invite.owner_id,
        member_id: user.id,
        role: invite.role,
        can_write: Boolean(invite.can_write),
        can_delete: Boolean(invite.can_delete),
      },
      { onConflict: 'owner_id,member_id' }
    );

    if (upsertError) {
      return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
    }

    await admin
      .from('account_invites')
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq('id', invite.id);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}

