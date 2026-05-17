import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const normalize = (t: string) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('voice2_aliases')
      .select('alias_norm,intent,usage_count,updated_at')
      .order('usage_count', { ascending: false })
      .limit(800);

    if (error) {
      return NextResponse.json({ ok: false, skipped: true, reason: error.message, items: [] }, { status: 200 });
    }

    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { aliasText?: unknown; expectedIntent?: unknown };
    const aliasText = typeof body.aliasText === 'string' ? body.aliasText.trim() : '';
    const expectedIntent = body.expectedIntent as any;
    const aliasNorm = normalize(aliasText);

    if (!aliasNorm || aliasNorm.length < 2) return NextResponse.json({ error: 'Mangler aliasText' }, { status: 400 });
    if (!expectedIntent || typeof expectedIntent !== 'object') {
      return NextResponse.json({ error: 'Mangler expectedIntent' }, { status: 400 });
    }

    const admin = createAdminClient();
    const existing = await admin
      .from('voice2_aliases')
      .select('usage_count')
      .eq('alias_norm', aliasNorm)
      .maybeSingle();

    const nextCount = (existing.data?.usage_count || 0) + 1;

    const { error } = await admin
      .from('voice2_aliases')
      .upsert(
        {
          alias_text: aliasText,
          alias_norm: aliasNorm,
          intent: expectedIntent,
          created_by: user.id,
          usage_count: nextCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'alias_norm' }
      );

    if (error) {
      return NextResponse.json({ ok: false, skipped: true, reason: error.message }, { status: 200 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Serverfeil' }, { status: 500 });
  }
}

