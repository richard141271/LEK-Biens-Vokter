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
      .select('*');
      // .eq('role', 'beekeeper'); // Removed to show all users in registry during pilot

    if (beekeeperError) {
      console.error('Feil ved henting av birøktere:', beekeeperError);
      return NextResponse.json(
        { error: 'Kunne ikke hente birøktere' },
        { status: 500 }
      );
    }

    // 2. Hent alle bigårder med eier-info
    const { data: apiaries, error: apiaryError } = await adminClient
      .from('apiaries')
      .select('*, profiles(full_name)');

    if (apiaryError) {
      console.error('Feil ved henting av bigårder:', apiaryError);
      // Ikke stopp hele requesten, men logg feilen
    }

    // 3. Hent alle bikuber med bigård og eier-info
    const { data: hives, error: hiveError } = await adminClient
      .from('hives')
      .select('*, apiaries(name, location), profiles(full_name)');

    if (hiveError) {
      console.error('Feil ved henting av bikuber:', hiveError);
    }

    // 4. Hent e-postadresser fra Auth API (da de ikke ligger i profiles)
    let enrichedBeekeepers = beekeepers || [];
    try {
      const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers({
        perPage: 1000 // Hent nok brukere for piloten
      });

      if (!authError && authUsers) {
        const emailMap = new Map(authUsers.map(u => [u.id, u.email]));
        
        enrichedBeekeepers = enrichedBeekeepers.map(b => ({
          ...b,
          email: emailMap.get(b.id) || null
        }));
      } else {
        console.error('Kunne ikke hente brukere fra Auth:', authError);
      }
    } catch (err) {
      console.error('Feil ved berikelse av e-post:', err);
    }

    return NextResponse.json(
      {
        beekeepers: enrichedBeekeepers,
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
