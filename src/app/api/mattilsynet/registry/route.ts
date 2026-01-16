import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

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
    const { data: adminProfile, error: profileError } = await adminVerifier
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Feil ved henting av admin-profil:', profileError);
      return NextResponse.json(
        { error: 'Kunne ikke verifisere tilgang' },
        { status: 500 }
      );
    }

    const isVip = user.email === 'richard141271@gmail.com';
    const isInspector =
      adminProfile?.role === 'mattilsynet' || adminProfile?.role === 'admin';

    if (!isInspector && !isVip) {
      return NextResponse.json(
        { error: 'Ingen tilgang: Krever Mattilsynet- eller admin-rolle' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    const { data: beekeepers, error: beekeeperError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('role', 'beekeeper');

    if (beekeeperError) {
      console.error('Feil ved henting av birøktere:', beekeeperError);
      return NextResponse.json(
        { error: 'Kunne ikke hente birøktere' },
        { status: 500 }
      );
    }

    const { data: apiaries, error: apiaryError } = await adminClient
      .from('apiaries')
      .select('*, profiles(full_name, email)');

    if (apiaryError) {
      console.error('Feil ved henting av bigårder:', apiaryError);
      return NextResponse.json(
        { error: 'Kunne ikke hente bigårder' },
        { status: 500 }
      );
    }

    const { data: hives, error: hiveError } = await adminClient
      .from('hives')
      .select('*, apiaries(name, location), profiles(full_name)');

    if (hiveError) {
      console.error('Feil ved henting av bikuber:', hiveError);
      return NextResponse.json(
        { error: 'Kunne ikke hente bikuber' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        beekeepers: beekeepers || [],
        apiaries: apiaries || [],
        hives: hives || [],
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('Uventet feil i Mattilsynet registry API:', e);
    return NextResponse.json(
      { error: 'Uventet feil ved henting av register' },
      { status: 500 }
    );
  }
}

