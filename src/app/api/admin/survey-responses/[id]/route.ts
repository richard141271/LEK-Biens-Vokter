import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false, errorResponse: NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 }) };
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.isAdmin && auth.errorResponse) return auth.errorResponse;

  const adminClient = createAdminClient();
  const body = await request.json();

  const { action } = body as { action: 'mark_test' | 'mark_invalid' | 'restore' };

  try {
    if (action === 'mark_test') {
      const { error } = await adminClient
        .from('survey_responses')
        .update({ is_test: true, is_invalid: false })
        .eq('id', params.id);

      if (error) {
        console.error('Feil ved markering som test', error);
        return NextResponse.json(
          { error: 'Kunne ikke markere som testdata' },
          { status: 500 }
        );
      }
    } else if (action === 'mark_invalid') {
      const { error } = await adminClient
        .from('survey_responses')
        .update({ is_invalid: true })
        .eq('id', params.id);

      if (error) {
        console.error('Feil ved markering som ugyldig', error);
        return NextResponse.json(
          { error: 'Kunne ikke markere som ugyldig' },
          { status: 500 }
        );
      }
    } else if (action === 'restore') {
      const { error } = await adminClient
        .from('survey_responses')
        .update({ is_test: false, is_invalid: false })
        .eq('id', params.id);

      if (error) {
        console.error('Feil ved gjenoppretting av svar', error);
        return NextResponse.json(
          { error: 'Kunne ikke gjenopprette svaret' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Ukjent handling' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('Uventet feil ved oppdatering av svar', e);
    return NextResponse.json(
      { error: 'Uventet feil ved oppdatering av svar' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (!auth.isAdmin && auth.errorResponse) return auth.errorResponse;

  const adminClient = createAdminClient();

  try {
    const { error } = await adminClient
      .from('survey_responses')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Feil ved sletting av svar', error);
      return NextResponse.json(
        { error: 'Kunne ikke slette svaret' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('Uventet feil ved sletting av svar', e);
    return NextResponse.json(
      { error: 'Uventet feil ved sletting av svar' },
      { status: 500 }
    );
  }
}

