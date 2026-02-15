import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
  const body = await req.json();
  const alias = String(body.alias || '').trim().toLowerCase();
  const phrase = String(body.phrase || '').trim().toLowerCase();
  if (!alias || !phrase) return NextResponse.json({ error: 'Mangler alias eller phrase' }, { status: 400 });
  const { error } = await supabase
    .from('user_voice_aliases')
    .insert({ user_id: user.id, alias, phrase });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
