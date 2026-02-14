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

    const { data: approved } = await supabase
      .from('voice_aliases')
      .select('phrase, alias, status')
      .eq('status', 'approved');

    const { data: personal } = await supabase
      .from('user_voice_aliases')
      .select('phrase, alias')
      .eq('user_id', user.id);

    return NextResponse.json({
      approved: approved || [],
      personal: personal || []
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
  }
}
