import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 }),
      supabase,
    };
  }

  return { user, errorResponse: null, supabase };
}

async function syncDuplicateCount(reportId: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from('feedback_votes')
    .select('*', { count: 'exact', head: true })
    .eq('report_id', reportId);

  const nextCount = count || 0;
  await admin.from('feedback_reports').update({ duplicate_count: nextCount }).eq('id', reportId);
  return nextCount;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const reportId = String(body?.reportId || '').trim();
  if (!reportId) return NextResponse.json({ error: 'Mangler reportId' }, { status: 400 });

  const { error } = await auth.supabase.from('feedback_votes').insert({
    report_id: reportId,
    user_id: auth.user!.id,
  } as any);

  if (error) {
    const code = (error as any)?.code;
    if (code !== '23505') return NextResponse.json({ error: 'Kunne ikke stemme' }, { status: 500 });
  }

  const duplicateCount = await syncDuplicateCount(reportId);
  return NextResponse.json({ ok: true, duplicateCount }, { status: 200 });
}

export async function DELETE(req: Request) {
  const auth = await requireUser();
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => ({}));
  const reportId = String(body?.reportId || '').trim();
  if (!reportId) return NextResponse.json({ error: 'Mangler reportId' }, { status: 400 });

  const { error } = await auth.supabase
    .from('feedback_votes')
    .delete()
    .eq('report_id', reportId)
    .eq('user_id', auth.user!.id);

  if (error) return NextResponse.json({ error: 'Kunne ikke fjerne stemme' }, { status: 500 });

  const duplicateCount = await syncDuplicateCount(reportId);
  return NextResponse.json({ ok: true, duplicateCount }, { status: 200 });
}

