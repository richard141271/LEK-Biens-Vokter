import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isAdmin: false,
      errorResponse: NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 }),
    };
  }

  const adminVerifier = createAdminClient();
  const { data: adminProfile, error: profileError } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return {
      user,
      isAdmin: false,
      errorResponse: NextResponse.json({ error: 'Kunne ikke verifisere tilgang' }, { status: 500 }),
    };
  }

  const isAdmin = adminProfile?.role === 'admin';
  if (!isAdmin) {
    return {
      user,
      isAdmin: false,
      errorResponse: NextResponse.json({ error: 'Ingen tilgang: Krever admin-rettigheter' }, { status: 403 }),
    };
  }

  return { user, isAdmin: true, errorResponse: null };
}

type AdminTab = 'new' | 'critical' | 'wish' | 'done';

function applyTabFilter(q: any, tab: AdminTab) {
  if (tab === 'new') {
    return q.eq('status', 'NY');
  }
  if (tab === 'done') {
    return q.in('status', ['LØST', 'IGNORERT']);
  }
  if (tab === 'wish') {
    return q.eq('type', 'wish').not('status', 'in', '("LØST","IGNORERT")');
  }
  return q
    .not('status', 'in', '("LØST","IGNORERT")')
    .or('priority.eq.KRITISK,duplicate_count.gte.3');
}

async function getCounts(adminClient: ReturnType<typeof createAdminClient>) {
  const [newRes, critRes, wishRes, doneRes] = await Promise.all([
    adminClient.from('feedback_reports').select('*', { count: 'exact', head: true }).eq('status', 'NY'),
    adminClient
      .from('feedback_reports')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("LØST","IGNORERT")')
      .or('priority.eq.KRITISK,duplicate_count.gte.3'),
    adminClient
      .from('feedback_reports')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'wish')
      .not('status', 'in', '("LØST","IGNORERT")'),
    adminClient.from('feedback_reports').select('*', { count: 'exact', head: true }).in('status', ['LØST', 'IGNORERT']),
  ]);

  return {
    new: newRes.count || 0,
    critical: critRes.count || 0,
    wish: wishRes.count || 0,
    done: doneRes.count || 0,
  };
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.isAdmin && auth.errorResponse) return auth.errorResponse;

  const adminClient = createAdminClient();

  try {
    const url = new URL(req.url);
    const mode = String(url.searchParams.get('mode') || '').trim();

    const counts = await getCounts(adminClient);
    if (mode === 'counts') {
      return NextResponse.json({ counts }, { status: 200 });
    }

    const tab = (url.searchParams.get('tab') || 'new') as AdminTab;

    let q = adminClient
      .from('feedback_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(120);

    q = applyTabFilter(q, tab);
    const { data: reports, error } = await q;
    if (error) {
      return NextResponse.json({ error: 'Kunne ikke hente tilbakemeldinger' }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [], counts }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Uventet feil ved henting av tilbakemeldinger' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.isAdmin && auth.errorResponse) return auth.errorResponse;

  const adminClient = createAdminClient();

  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 });

    const next: any = {};
    const status = body?.status ? String(body.status).trim() : '';
    const adminComment = body?.adminComment != null ? String(body.adminComment) : null;
    const priority = body?.priority ? String(body.priority).trim() : '';

    if (status) {
      const allowed = new Set(['NY', 'UNDER_ARBEID', 'LØST', 'IGNORERT']);
      if (!allowed.has(status)) return NextResponse.json({ error: 'Ugyldig status' }, { status: 400 });
      next.status = status;
    }
    if (priority) {
      const allowed = new Set(['LAV', 'NORMAL', 'KRITISK']);
      if (!allowed.has(priority)) return NextResponse.json({ error: 'Ugyldig prioritet' }, { status: 400 });
      next.priority = priority;
    }
    if (adminComment !== null) {
      next.admin_comment = adminComment;
    }

    if (Object.keys(next).length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { error } = await adminClient.from('feedback_reports').update(next).eq('id', id);
    if (error) return NextResponse.json({ error: 'Kunne ikke oppdatere' }, { status: 500 });

    const counts = await getCounts(adminClient);
    return NextResponse.json({ ok: true, counts }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Uventet feil ved oppdatering' }, { status: 500 });
  }
}
