import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isAdmin: false,
      errorResponse: NextResponse.json(
        { error: 'Ikke logget inn' },
        { status: 401 }
      ),
    };
  }

  const adminVerifier = createAdminClient();
  const { data: adminProfile, error: profileError } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Feil ved henting av admin-profil:', profileError);
    return {
      user,
      isAdmin: false,
      errorResponse: NextResponse.json(
        { error: 'Kunne ikke verifisere tilgang' },
        { status: 500 }
      ),
    };
  }

  const isVip = user.email === 'richard141271@gmail.com';
  const isAdmin = adminProfile?.role === 'admin' || isVip;

  if (!isAdmin) {
    return {
      user,
      isAdmin: false,
      errorResponse: NextResponse.json(
        { error: 'Ingen tilgang: Krever admin-rettigheter' },
        { status: 403 }
      ),
    };
  }

  return { user, isAdmin: true, errorResponse: null };
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.isAdmin && auth.errorResponse) return auth.errorResponse;

  const adminClient = createAdminClient();

  try {
    const { error: newError } = await adminClient
      .from('pilot_interest')
      .delete()
      .eq('id', params.id);

    if (newError) {
      console.error(
        'Feil ved sletting av pilot-interesse (pilot_interest)',
        newError
      );
      return NextResponse.json(
        { error: 'Kunne ikke slette pilot-interesse' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('Uventet feil ved sletting av pilot-interesse', e);
    return NextResponse.json(
      { error: 'Uventet feil ved sletting av pilot-interesse' },
      { status: 500 }
    );
  }
}

