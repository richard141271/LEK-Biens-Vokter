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
      .select('beekeeper_id, full_name, auth_user_id');

    if (coreBeekeeperError) {
      console.error('Feil ved henting av LEK Core-birøktere:', coreBeekeeperError);
    }

    const coreBeekeeperMap = new Map(
      (coreBeekeepers || []).map((b: any) => [b.beekeeper_id, b])
    );
    const coreBeekeeperByAuthMap = new Map(
      (coreBeekeepers || []).map((b: any) => [b.auth_user_id, b])
    );

    // 4a. Backfill: Opprett manglende Core-bigårder for lokale bigårder uten core_id
    const { data: localApiariesNoCore, error: localNoCoreError } = await adminClient
      .from('apiaries')
      .select('id, user_id, name, core_apiary_id')
      .is('core_apiary_id', null);

    if (localNoCoreError) {
      console.error('Feil ved henting av lokale bigårder uten core_id:', localNoCoreError);
    } else if (localApiariesNoCore && localApiariesNoCore.length > 0) {
      for (const a of localApiariesNoCore) {
        try {
          const beek = coreBeekeeperByAuthMap.get(a.user_id);
          if (!beek || !beek.beekeeper_id) continue;
          const { data: createdCore, error: createErr } = await adminClient
            .from('lek_core_apiaries')
            .insert({
              beekeeper_id: beek.beekeeper_id,
              name: a.name,
              local_apiary_id: a.id,
            })
            .select('apiary_id')
            .single();
          if (createErr || !createdCore) {
            console.error('Backfill: Feil ved oppretting av LEK Core-bigård:', createErr);
            continue;
          }
          const { error: linkErr } = await adminClient
            .from('apiaries')
            .update({ core_apiary_id: createdCore.apiary_id })
            .eq('id', a.id);
          if (linkErr) {
            console.error('Backfill: Feil ved linking av core_apiary_id til lokal bigård:', linkErr);
          }
        } catch (e) {
          console.error('Backfill: Uventet feil for lokal bigård:', e);
        }
      }
    }

    // 4b. Hent alle LEK Core-bigårder
    const { data: coreApiaries, error: coreApiaryError } = await adminClient
      .from('lek_core_apiaries')
      .select('apiary_id, beekeeper_id, name, created_at');

    if (coreApiaryError) {
      console.error('Feil ved henting av LEK Core-bigårder:', coreApiaryError);
    }

    // Bygg sekvensielle nummer per birøkter (001, 002, 003 ...)
    const apiaryIndexMap = new Map<string, number>();
    if (coreApiaries && coreApiaries.length > 0) {
      const byBeekeeper = new Map<string, any[]>();
      for (const a of coreApiaries) {
        const list = byBeekeeper.get(a.beekeeper_id) || [];
        list.push(a);
        byBeekeeper.set(a.beekeeper_id, list);
      }
      byBeekeeper.forEach((list) => {
        list
          .sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return aTime - bTime;
          })
          .forEach((a, idx) => {
            apiaryIndexMap.set(a.apiary_id, idx + 1);
          });
      });
    }

    const apiaries =
      coreApiaries?.map((a: any) => {
        const owner = coreBeekeeperMap.get(a.beekeeper_id);
        const index = apiaryIndexMap.get(a.apiary_id) || 0;
        const indexStr = index ? index.toString().padStart(3, '0') : '';
        return {
          id: a.apiary_id,
          apiary_number: indexStr ? `BG-${indexStr}` : a.apiary_id,
          name: a.name,
          location: '',
          type: 'bigård',
          core_apiary_id: a.apiary_id,
          beekeeper_id: a.beekeeper_id,
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
      .select('hive_id, apiary_id, created_at');

    if (coreHiveError) {
      console.error('Feil ved henting av LEK Core-bikuber:', coreHiveError);
    }

    // Bygg sekvensielle kube-nummer per birøkter (001, 002, 003 ...)
    const hiveIndexMap = new Map<string, number>();
    if (coreHives && coreHives.length > 0) {
      const byBeekeeper = new Map<string, any[]>();
      for (const h of coreHives) {
        const apiary = apiaryMap.get(h.apiary_id);
        const beekeeperId = apiary?.beekeeper_id;
        if (!beekeeperId) continue;
        const list = byBeekeeper.get(beekeeperId) || [];
        list.push(h);
        byBeekeeper.set(beekeeperId, list);
      }
      byBeekeeper.forEach((list) => {
        list
          .sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return aTime - bTime;
          })
          .forEach((h, idx) => {
            hiveIndexMap.set(h.hive_id, idx + 1);
          });
      });
    }

    const hives =
      coreHives?.map((h: any) => {
        const apiary = apiaryMap.get(h.apiary_id);
        const ownerName = apiary?.profiles?.full_name;
        const index = hiveIndexMap.get(h.hive_id) || 0;
        const indexStr = index ? index.toString().padStart(3, '0') : '';
        return {
          id: h.hive_id,
          hive_number: indexStr ? `KUBE-${indexStr}` : h.hive_id,
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
