import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, user: null };
  const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
  const isAdmin = profile?.role === 'admin' || user.email === 'richard141271@gmail.com';
  if (!isAdmin) return { ok: false as const, status: 403, user: null };
  return { ok: true as const, status: 200, user };
}

export async function POST(req: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const admin = createAdminClient();
  const body = await req.json();
  const alias = String(body.alias || '').trim().toLowerCase();
  const correct = String(body.correct_phrase || '').trim().toLowerCase();
  const category = String(body.category || '').trim().toUpperCase();
  const approve = Boolean(body.approve);
  if (!alias || !correct || !category) {
    return NextResponse.json({ error: 'Mangler alias, correct_phrase eller category' }, { status: 400 });
  }
  const payload: any = { alias, correct_phrase: correct, category, status: approve ? 'approved' : 'pending' };
  if (approve) payload.approved_at = new Date().toISOString();
  const { error } = await admin.from('voice_aliases').insert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
