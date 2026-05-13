import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    let approvedRows: any[] = [];
    const approvedQ1 = await supabase
      .from('voice_aliases')
      .select('alias, correct_phrase, status')
      .eq('status', 'approved');
    if (!approvedQ1.error) {
      approvedRows = (approvedQ1.data || []).map((r: any) => ({ alias: r.alias, phrase: r.correct_phrase, status: r.status }));
    } else {
      const approvedQ2 = await supabase
        .from('voice_aliases')
        .select('phrase, alias, status')
        .eq('status', 'approved');
      approvedRows = approvedQ2.data || [];
    }

    let personalRows: any[] = [];
    const personalQ1 = await supabase
      .from('user_voice_aliases')
      .select('phrase, alias')
      .eq('user_id', user.id);
    if (!personalQ1.error) {
      personalRows = personalQ1.data || [];
    } else {
      const personalQ2 = await supabase
        .from('user_voice_aliases')
        .select('alias, correct_phrase')
        .eq('user_id', user.id);
      personalRows = (personalQ2.data || []).map((r: any) => ({ alias: r.alias, phrase: r.correct_phrase }));
    }

    return NextResponse.json({
      approved: approvedRows,
      personal: personalRows
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
  }
}
