import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 };
  const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
  const isAdmin = profile?.role === 'admin' || user.email === 'richard141271@gmail.com';
  if (!isAdmin) return { ok: false as const, status: 403 };
  return { ok: true as const, user };
}

export async function GET() {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('voice_failures')
    .select('id, user_id, recognized_text, matched_phrase, similarity, expected_parse, parsed_before, created_at, source')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
