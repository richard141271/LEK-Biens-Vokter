import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMailProviderName, getMailService } from '@/services/mail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    method: 'POST',
    provider: getMailProviderName(),
    body: {
      to: 'mottaker@example.no',
      subject: 'Valgfritt',
      message: 'Valgfritt',
    },
  });
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Ikke logget inn' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const to = String(body?.to || body?.email || '').trim().toLowerCase();
    const subject = String(body?.subject || 'Test-e-post fra LEK-Biens Vokter').trim();
    const message = String(
      body?.message ||
        'Dette er en test-e-post sendt fra LEK-Biens Vokter via konfigurert e-postprovider.',
    ).trim();

    if (!to) {
      return NextResponse.json({ error: 'Mangler mottaker' }, { status: 400 });
    }

    if (!isValidEmail(to)) {
      return NextResponse.json({ error: 'Ugyldig e-postadresse' }, { status: 400 });
    }

    const provider = getMailProviderName();
    const admin = createAdminClient();
    const mail = getMailService(admin);
    const result = await mail.sendMail(
      'LEK-Biens Vokter',
      to,
      subject,
      `${message}\n\nSendt av: ${user.email || user.id}\nProvider: ${provider}`,
      user.id,
    );

    if (result?.error) {
      console.error('[API][test-email] Testutsending feilet', {
        to,
        subject,
        userId: user.id,
        provider,
        error: result.error,
      });
      return NextResponse.json(
        { error: 'Kunne ikke sende test-e-post', detail: result.error, provider },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      provider,
      to,
      subject,
      from: 'LEK-Biens Vokter <post@leksystem.no>',
    });
  } catch (error: any) {
    console.error('[API][test-email] Uventet feil', {
      error: error?.message || error,
    });
    return NextResponse.json({ error: error?.message || 'Ukjent feil' }, { status: 500 });
  }
}
