import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const body = await request.json();
    // Expected fields: recognized_text, matched_phrase, similarity, expected_parse, parsed_before, parsed_after, source
    const payload = {
      user_id: user.id,
      source: body?.source === 'training' ? 'training' : 'inspection',
      recognized_text: body?.recognized_text || '',
      matched_phrase: body?.matched_phrase || null,
      similarity: typeof body?.similarity === 'number' ? body.similarity : null,
      expected_parse: body?.expected_parse || null,
      parsed_before: body?.parsed_before || null,
      parsed_after: body?.parsed_after || null
    };

    const { error } = await supabase
      .from('voice_failures')
      .insert(payload);

    if (error) {
      // If table/policies are not yet in place, return soft success with debug
      console.warn('voice_failures insert error:', error);
      return NextResponse.json({ ok: false, skipped: true, reason: error.message }, { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('voice/log API error:', e);
    return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
  }
}
