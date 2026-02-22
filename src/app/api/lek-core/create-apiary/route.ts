import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apiaryName?: string; apiaryId?: string };
    const apiaryName = body.apiaryName?.trim();
    const localApiaryId = body.apiaryId;

    if (!apiaryName || !localApiaryId) {
      return NextResponse.json({ error: 'Mangler navn eller lokal apiary-id' }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: beekeeper, error: beekeeperError } = await admin
      .from('lek_core_beekeepers')
      .select('beekeeper_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (beekeeperError) {
      return NextResponse.json(
        { error: 'Kunne ikke hente LEK Core-birøkter: ' + beekeeperError.message },
        { status: 500 }
      );
    }

    if (!beekeeper?.beekeeper_id) {
      return NextResponse.json(
        { error: 'Ingen LEK Core-birøkter koblet til denne brukeren' },
        { status: 400 }
      );
    }

    const { data: coreApiary, error: apiaryError } = await admin
      .from('lek_core_apiaries')
      .insert({
        beekeeper_id: beekeeper.beekeeper_id,
        name: apiaryName,
      })
      .select('apiary_id, beekeeper_id, name')
      .single();

    if (apiaryError || !coreApiary) {
      return NextResponse.json(
        { error: apiaryError?.message || 'Kunne ikke opprette LEK Core-bigård' },
        { status: 500 }
      );
    }

    const supabaseWithRls = createClient();

    const { error: linkError } = await supabaseWithRls
      .from('apiaries')
      .update({ core_apiary_id: coreApiary.apiary_id })
      .eq('id', localApiaryId)
      .eq('user_id', user.id);

    if (linkError) {
      return NextResponse.json(
        { error: 'LEK Core-bigård opprettet, men kobling feilet: ' + linkError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        coreApiaryId: coreApiary.apiary_id,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Ukjent feil i /api/lek-core/create-apiary' },
      { status: 500 }
    );
  }
}
