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

    // 2. Hent e-postadresser fra Auth API (da de ikke ligger i profiles)
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

    // 3. Hent alle LEK Core-birøktere (autoritativt register)
    const { data: coreBeekeepers, error: coreBeekeeperError } = await adminClient
      .from('lek_core_beekeepers')
      .select('beekeeper_id, full_name');

    if (coreBeekeeperError) {
      console.error('Feil ved henting av LEK Core-birøktere:', coreBeekeeperError);
    }

    const coreBeekeeperMap = new Map(
      (coreBeekeepers || []).map((b: any) => [b.beekeeper_id, b])
    );

    // 4. Hent alle LEK Core-bigårder
    const { data: coreApiaries, error: coreApiaryError } = await adminClient
      .from('lek_core_apiaries')
      .select('apiary_id, beekeeper_id, name');

    if (coreApiaryError) {
      console.error('Feil ved henting av LEK Core-bigårder:', coreApiaryError);
    }

    const apiaries =
      coreApiaries?.map((a: any) => {
        const owner = coreBeekeeperMap.get(a.beekeeper_id);
        return {
          id: a.apiary_id,
          apiary_number: a.apiary_id,
          name: a.name,
          location: '',
          type: 'bigård',
          core_apiary_id: a.apiary_id,
          profiles: owner
            ? {
                full_name: owner.full_name,
              }
            : null,
        };
      }) || [];

    const apiaryMap = new Map(apiaries.map((a: any) => [a.core_apiary_id, a]));

    // 5. Hent alle LEK Core-bikuber og koble til bigård + eier
    const { data: coreHives, error: coreHiveError } = await adminClient
      .from('lek_core_hives')
      .select('hive_id, apiary_id');

    if (coreHiveError) {
      console.error('Feil ved henting av LEK Core-bikuber:', coreHiveError);
    }

    const hives =
      coreHives?.map((h: any) => {
        const apiary = apiaryMap.get(h.apiary_id);
        const ownerName = apiary?.profiles?.full_name;
        return {
          id: h.hive_id,
          hive_number: h.hive_id,
          apiary_id: h.apiary_id,
          status: 'aktiv',
          apiaries: apiary
            ? {
                name: apiary.name,
                location: apiary.location,
              }
            : null,
          profiles: ownerName
            ? {
                full_name: ownerName,
              }
            : null,
        };
      }) || [];

    return NextResponse.json(
      {
        beekeepers: enrichedBeekeepers,
        apiaries,
        hives,
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
