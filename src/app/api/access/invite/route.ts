import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return `${proto}://${host}`;
}

type InviteRole = 'viewer' | 'family' | 'substitute';

function computePermissions(role: InviteRole, canWriteInput: unknown, canDeleteInput: unknown) {
  if (role === 'viewer') return { can_write: false, can_delete: false };
  if (role === 'substitute') return { can_write: true, can_delete: false };
  return { can_write: Boolean(canWriteInput), can_delete: Boolean(canDeleteInput) };
}

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
    const email = String(body?.email || '').trim().toLowerCase();
    const role = String(body?.role || '').trim() as InviteRole;

    if (!email) return NextResponse.json({ success: false, error: 'Mangler e-post' }, { status: 400 });
    if (role !== 'viewer' && role !== 'family' && role !== 'substitute') {
      return NextResponse.json({ success: false, error: 'Ugyldig rolle' }, { status: 400 });
    }

    const perms = computePermissions(role, body?.canWrite, body?.canDelete);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const admin = createAdminClient();
    const { error } = await admin.from('account_invites').insert({
      owner_id: user.id,
      email,
      role,
      can_write: perms.can_write,
      can_delete: perms.can_delete,
      token,
      expires_at: expiresAt,
    });

    if (error) {
      const msg = String(error?.message || 'Kunne ikke opprette invitasjon');
      if (msg.toLowerCase().includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Database mangler migrasjon for tilgangsinvitasjoner (account_invites/account_access).' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    const inviteUrl = `${getBaseUrl(request)}/settings/access/accept?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ success: true, inviteUrl });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}

