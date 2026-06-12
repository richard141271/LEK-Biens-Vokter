import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_FEATURES = new Set([
  'VarroaScan™',
  'AI-inspeksjon',
  'Stemmestyrt registrering',
  'Sensornoder',
  'Bigårdsovervåkning',
]);

const MAX_VOTES_PER_VISITOR = 3;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const feature = String(body?.feature || '').trim();
    const visitorId = String(body?.visitorId || '').trim();
    const route = String(body?.route || '/').trim() || '/';

    if (!feature || !ALLOWED_FEATURES.has(feature)) {
      return NextResponse.json({ error: 'Ugyldig funksjon' }, { status: 400 });
    }

    if (!/^[0-9a-fA-F-]{36}$/.test(visitorId)) {
      return NextResponse.json({ error: 'Ugyldig besoks-id' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { count: existingCount, error: countError } = await admin
      .from('feedback_reports')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'vote')
      .eq('category', 'PRIORITERING')
      .eq('user_id', visitorId);

    if (countError) {
      return NextResponse.json({ error: 'Kunne ikke kontrollere eksisterende stemmer' }, { status: 500 });
    }

    if ((existingCount || 0) >= MAX_VOTES_PER_VISITOR) {
      return NextResponse.json({ error: 'Du har brukt opp dine 3 stemmer.' }, { status: 409 });
    }

    const { count: duplicateCount, error: duplicateError } = await admin
      .from('feedback_reports')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'vote')
      .eq('category', 'PRIORITERING')
      .eq('user_id', visitorId)
      .eq('title', `Prioritering: ${feature}`);

    if (duplicateError) {
      return NextResponse.json({ error: 'Kunne ikke kontrollere om du allerede har stemt' }, { status: 500 });
    }

    if ((duplicateCount || 0) > 0) {
      return NextResponse.json({ error: 'Du har allerede stemt pa denne funksjonen.' }, { status: 409 });
    }

    const payload = {
      user_id: visitorId,
      user_name: 'Anonym besokende',
      type: 'vote',
      category: 'PRIORITERING',
      title: `Prioritering: ${feature}`,
      description: `Bruker har stemt pa ${feature} fra forsiden.`,
      image_urls: [],
      auto_screenshot_url: null,
      app_version: null,
      device_info: {
        source: 'landing-page',
        voteCategory: 'PRIORITERING',
        priorityFeature: feature,
        visitorId,
      },
      route,
      status: 'NY',
      priority: 'LAV',
      duplicate_count: 0,
    };

    const { error: insertError } = await admin.from('feedback_reports').insert(payload as any);
    if (insertError) {
      return NextResponse.json({ error: 'Kunne ikke registrere stemme' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Uventet feil ved registrering av stemme' }, { status: 500 });
  }
}
