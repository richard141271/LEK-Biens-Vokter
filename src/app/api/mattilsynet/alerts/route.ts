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
    const { data: adminProfile } = await adminVerifier
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isVip = user.email === 'richard141271@gmail.com';
    const isInspector = adminProfile?.role === 'mattilsynet' || adminProfile?.role === 'admin';

    if (!isInspector && !isVip) {
      return NextResponse.json(
        { error: 'Ingen tilgang: Krever mattilsynet-rettigheter' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();
    
    // Fetch active sickness alerts
    const { data: alerts, error } = await adminClient
      .from('hive_logs')
      .select(`
        *,
        reporter:user_id (
          full_name,
          email,
          phone_number
        ),
        hives (
          hive_number,
          apiaries (
            name,
            location
          )
        )
      `)
      .eq('action', 'SYKDOM')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Feil ved henting av sykdomsvarsler:', error);
      return NextResponse.json({ error: 'Kunne ikke hente varsler' }, { status: 500 });
    }

    // Also fetch stats for the dashboard
    const { count: apiaryCount } = await adminClient
        .from('apiaries')
        .select('*', { count: 'exact', head: true });

    const { count: inspectionCount } = await adminClient
        .from('hive_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'INSPEKSJON');

    return NextResponse.json({ 
        alerts: alerts || [],
        stats: {
            apiaries: apiaryCount || 0,
            inspections: inspectionCount || 0
        }
    }, { status: 200 });

  } catch (e) {
    console.error('Uventet feil i Mattilsynet alerts API:', e);
    return NextResponse.json(
      { error: 'Uventet feil ved henting av varsler' },
      { status: 500 }
    );
  }
}
