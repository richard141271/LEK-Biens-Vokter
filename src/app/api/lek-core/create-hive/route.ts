import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      apiaryId?: string;
      hiveLocalId?: string;
    };

    const apiaryId = body.apiaryId;
    const hiveLocalId = body.hiveLocalId;

    if (!apiaryId || !hiveLocalId) {
      return NextResponse.json(
        { error: 'Mangler apiaryId eller hiveLocalId' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const { data: localApiary, error: localApiaryError } = await supabase
      .from('apiaries')
      .select('core_apiary_id')
      .eq('id', apiaryId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (localApiaryError) {
      return NextResponse.json(
        { error: 'Kunne ikke hente lokal bigård: ' + localApiaryError.message },
        { status: 500 }
      );
    }

    if (!localApiary?.core_apiary_id) {
      return NextResponse.json(
        { error: 'Mangler core_apiary_id for denne bigården' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: coreHive, error: hiveError } = await admin
      .from('lek_core_hives')
      .insert({
        apiary_id: localApiary.core_apiary_id,
        local_hive_id: hiveLocalId,
      })
      .select('hive_id, apiary_id')
      .single();

    if (hiveError || !coreHive) {
      return NextResponse.json(
        { error: hiveError?.message || 'Kunne ikke opprette LEK Core-kube' },
        { status: 500 }
      );
    }

    const { error: linkError } = await supabase
      .from('hives')
      .update({ core_hive_id: coreHive.hive_id })
      .eq('id', hiveLocalId)
      .eq('apiary_id', apiaryId)
      .eq('user_id', user.id);

    if (linkError) {
      return NextResponse.json(
        { error: 'LEK Core-kube opprettet, men kobling feilet: ' + linkError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        coreHiveId: coreHive.hive_id,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Ukjent feil i /api/lek-core/create-hive' },
      { status: 500 }
    );
  }
}
