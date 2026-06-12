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

type AdminTab = 'inbox' | 'critical' | 'wish' | 'priorities' | 'archive';

function isPriorityVote(report: any) {
  const title = String(report?.title || '');
  return (
    report?.type === 'vote' &&
    (report?.category === 'PRIORITERING' ||
      Boolean(report?.device_info?.priorityFeature) ||
      /^Prioritering:\s*/i.test(title))
  );
}

function normalizePriorityReports(reports: any[]) {
  const groupedByUser = new Map<string, any[]>();

  for (const report of reports) {
    if (!isPriorityVote(report)) continue;
    const userKey = String(report?.user_id || '').trim();
    if (!userKey) continue;
    const existing = groupedByUser.get(userKey) || [];
    existing.push(report);
    groupedByUser.set(userKey, existing);
  }

  const normalized = new Map<string, { priority: 'KRITISK' | 'NORMAL' | 'LAV'; priorityRank: number }>();

  for (const [, votes] of Array.from(groupedByUser.entries())) {
    const sortedVotes = [...votes].sort((a, b) => {
      const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (timeDiff !== 0) return timeDiff;
      return String(a.id).localeCompare(String(b.id));
    });

    sortedVotes.forEach((vote, index) => {
      const priorityRank = Math.min(index + 1, 3);
      const priority = priorityRank === 1 ? 'KRITISK' : priorityRank === 2 ? 'NORMAL' : 'LAV';
      normalized.set(String(vote.id), { priority, priorityRank });
    });
  }

  return reports.map((report) => {
    const next = normalized.get(String(report?.id));
    if (!next) return report;

    return {
      ...report,
      priority: next.priority,
      device_info: {
        ...(report?.device_info || {}),
        priorityRank: next.priorityRank,
      },
    };
  });
}

function applyTabFilter(q: any, tab: AdminTab) {
  if (tab === 'archive') {
    return q.in('status', ['LØST', 'IGNORERT']);
  }
  if (tab === 'priorities') {
    return q.eq('type', 'vote').eq('category', 'PRIORITERING');
  }
  if (tab === 'wish') {
    return q.eq('type', 'wish').not('status', 'in', '("LØST","IGNORERT")');
  }
  if (tab === 'critical') {
    return q
      .not('status', 'in', '("LØST","IGNORERT")')
      .or('priority.eq.KRITISK,duplicate_count.gte.3');
  }
  return q.not('status', 'in', '("LØST","IGNORERT")');
}

async function getCounts(adminClient: ReturnType<typeof createAdminClient>) {
  const [newRes, inboxRes, critRes, wishRes, prioritiesRes, archiveRes] = await Promise.all([
    adminClient.from('feedback_reports').select('*', { count: 'exact', head: true }).eq('status', 'NY'),
    adminClient
      .from('feedback_reports')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("LØST","IGNORERT")'),
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
    adminClient
      .from('feedback_reports')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'vote')
      .eq('category', 'PRIORITERING'),
    adminClient.from('feedback_reports').select('*', { count: 'exact', head: true }).in('status', ['LØST', 'IGNORERT']),
  ]);

  return {
    new: newRes.count || 0,
    inbox: inboxRes.count || 0,
    critical: critRes.count || 0,
    wish: wishRes.count || 0,
    priorities: prioritiesRes.count || 0,
    archive: archiveRes.count || 0,
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

    const tab = (url.searchParams.get('tab') || 'inbox') as AdminTab;

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

    return NextResponse.json({ reports: normalizePriorityReports(reports || []), counts }, { status: 200 });
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
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((value: unknown) => String(value || '').trim()).filter(Boolean)
      : [];
    const id = String(body?.id || '').trim();
    const targetIds = ids.length > 0 ? ids : id ? [id] : [];
    if (targetIds.length === 0) return NextResponse.json({ error: 'Mangler id' }, { status: 400 });

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

    const { error } =
      targetIds.length === 1
        ? await adminClient.from('feedback_reports').update(next).eq('id', targetIds[0])
        : await adminClient.from('feedback_reports').update(next).in('id', targetIds);
    if (error) return NextResponse.json({ error: 'Kunne ikke oppdatere' }, { status: 500 });

    const counts = await getCounts(adminClient);
    return NextResponse.json({ ok: true, counts }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Uventet feil ved oppdatering' }, { status: 500 });
  }
}
