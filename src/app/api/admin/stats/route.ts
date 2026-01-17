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
    const isAdmin = adminProfile?.role === 'admin';

    if (!isAdmin && !isVip) {
      return NextResponse.json(
        { error: 'Ingen tilgang: Krever admin-rettigheter' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('role');

    if (error || !profiles) {
      console.error('Feil ved henting av profiler for stats:', error);
      return NextResponse.json(
        { error: 'Kunne ikke hente brukerstats' },
        { status: 500 }
      );
    }

    const totalUsers = profiles.length;
    const admins = profiles.filter((p) => p.role === 'admin').length;
    const mattilsynet = profiles.filter((p) => p.role === 'mattilsynet').length;
    const beekeepers = profiles.filter(
      (p) => p.role === 'beekeeper' || !p.role
    ).length;

    const { count: activeAlertsCount, error: alertsError } = await adminClient
      .from('hive_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'SYKDOM')
      .neq('admin_status', 'resolved');

    if (alertsError) {
      console.error('Feil ved henting av sykdomsvarsler for admin-stats:', alertsError);
    }

    return NextResponse.json(
      {
        totalUsers,
        admins,
        mattilsynet,
        beekeepers,
        activeAlerts: activeAlertsCount || 0,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error('Uventet feil i admin stats API:', e);
    return NextResponse.json(
      { error: 'Uventet feil ved henting av statistikk' },
      { status: 500 }
    );
  }
}
