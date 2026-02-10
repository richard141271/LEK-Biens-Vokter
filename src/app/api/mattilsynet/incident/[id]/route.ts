import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    // Verify access
    const adminVerifier = createAdminClient();
    const { data: adminProfile } = await adminVerifier
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isVip = user.email === 'richard141271@gmail.com';
    const isInspector = adminProfile?.role === 'mattilsynet' || adminProfile?.role === 'admin';

    if (!isInspector && !isVip) {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch Alert Details
    const { data: alert, error: alertError } = await adminClient
      .from('hive_logs')
      .select(`
        *,
        reporter:user_id (
            id, full_name, email, phone_number
        ),
        hives (
            id, hive_number,
            apiaries (
                id, name, location
            )
        )
      `)
      .eq('id', params.id)
      .single();

    if (alertError) {
      console.error('Error fetching alert:', alertError);
      return NextResponse.json({ error: 'Fant ikke hendelsen' }, { status: 404 });
    }

    // 2. Fetch All Apiaries for Map (including owner info)
    const { data: apiaries, error: apiariesError } = await adminClient
      .from('apiaries')
      .select(`
        *,
        users (full_name, phone_number, email)
      `);

    if (apiariesError) {
      console.error('Error fetching apiaries:', apiariesError);
      return NextResponse.json({ error: 'Kunne ikke hente bigårder' }, { status: 500 });
    }

    return NextResponse.json({ alert, apiaries });

  } catch (e) {
    console.error('Unexpected error in incident API:', e);
    return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
  }
}
