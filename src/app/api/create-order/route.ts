import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMailService } from '@/services/mail';

export const dynamic = 'force-dynamic';

const ALLOWED_ORIGINS = ['https://minbigard.no', 'http://localhost', 'https://localhost'];

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return `${proto}://${host}`;
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.startsWith('http://localhost:')) return true;
  if (origin.startsWith('https://localhost:')) return true;
  return false;
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  const allowOrigin = isAllowedOrigin(origin) ? (origin as string) : 'https://minbigard.no';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function ok(request: Request) {
  return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders(request) });
}

function fail(request: Request, status: number, error: string) {
  return NextResponse.json(
    { success: false, error },
    { status, headers: corsHeaders(request) }
  );
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  return NextResponse.json(
    { success: false, error: 'Bruk POST /api/create-order' },
    { status: 200, headers: corsHeaders(request) }
  );
}

function normalizeOrgNumber(v: unknown) {
  return String(v || '').replace(/\s+/g, '').trim();
}

function slugifyCompanyName(input: string) {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  return s || 'company';
}

function normalizePackageType(v: unknown):
  | '6_kuber'
  | '8_kuber'
  | '10_kuber'
  | 'honningkollektiv'
  | null {
  const raw = String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (raw === '6_kuber' || raw === '6kuber') return '6_kuber';
  if (raw === '8_kuber' || raw === '8kuber') return '8_kuber';
  if (raw === '10_kuber' || raw === '10kuber') return '10_kuber';
  if (raw === 'honningkollektiv') return 'honningkollektiv';
  return null;
}

export async function POST(request: Request) {
  const admin = createAdminClient();

  try {
    const body = await request.json().catch(() => ({}));

    const companyName = String(body?.company?.name || body?.firmanavn || '').trim();
    const orgNumber = normalizeOrgNumber(body?.company?.org_number || body?.org_number);
    const address = String(body?.company?.address || '').trim() || null;
    const postalCode = String(body?.company?.postal_code || '').trim() || null;
    const city = String(body?.company?.city || '').trim() || null;

    const contactName = String(body?.contact?.name || '').trim();
    const contactEmail = String(body?.contact?.email || '').trim().toLowerCase();
    const contactPhone = String(body?.contact?.phone || '').trim() || null;

    const packageType = normalizePackageType(body?.package || body?.package_type);

    if (!companyName) {
      return fail(request, 400, 'Mangler firmanavn');
    }
    if (!orgNumber) {
      return fail(request, 400, 'Mangler organisasjonsnummer');
    }
    if (!contactName) {
      return fail(request, 400, 'Mangler navn (kontaktperson)');
    }
    if (!contactEmail) {
      return fail(request, 400, 'Mangler e-post (kontaktperson)');
    }
    if (!packageType) {
      return fail(request, 400, 'Mangler eller ugyldig pakke');
    }

    const { data: existingCompany } = await admin
      .from('companies')
      .select('id')
      .eq('org_number', orgNumber)
      .maybeSingle();

    if (existingCompany?.id) {
      return fail(request, 400, 'Bedrift finnes allerede');
    }

    const baseSlug = slugifyCompanyName(companyName);
    let slug = baseSlug;
    for (let i = 0; i < 25; i++) {
      const { data } = await admin
        .from('companies')
        .select('id')
        .eq('public_slug', slug)
        .maybeSingle();
      if (!data?.id) break;
      slug = `${baseSlug}_${i + 2}`;
    }

    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: contactEmail,
      email_confirm: true,
      user_metadata: {
        account_type: 'company',
        company_name: companyName,
        company_slug: slug,
        full_name: contactName,
        phone_number: contactPhone,
        address,
        postal_code: postalCode,
        city,
      },
    });

    if (createUserError || !createdUser?.user?.id) {
      console.error('create-order createUser failed:', createUserError);
      const msg = String(createUserError?.message || 'Kunne ikke opprette bruker');
      const isDuplicate =
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('registered') ||
        msg.toLowerCase().includes('exists');
      return fail(request, isDuplicate ? 400 : 500, msg);
    }

    const userId = createdUser.user.id;

    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert({
        name: companyName,
        org_number: orgNumber,
        address,
        postal_code: postalCode,
        city,
        public_slug: slug,
      })
      .select('id, name, public_slug')
      .single();

    if (companyError || !company?.id) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {}
      return NextResponse.json(
        { success: false, error: 'Kunne ikke opprette bedrift' },
        { status: 500, headers: corsHeaders(request) }
      );
    }

    const companyId = company.id;

    const { error: userRowError } = await admin.from('users').insert({
      id: userId,
      email: contactEmail,
      company_id: companyId,
    });

    if (userRowError) {
      try {
        await admin.from('companies').delete().eq('id', companyId);
      } catch {}
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {}
      return NextResponse.json(
        { success: false, error: 'Kunne ikke koble bruker til bedrift' },
        { status: 500, headers: corsHeaders(request) }
      );
    }

    const { error: contactError } = await admin.from('contacts').insert({
      created_by: userId,
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      address,
      postal_code: postalCode,
      city,
      company_id: companyId,
    });

    if (contactError) {
      try {
        await admin.from('companies').delete().eq('id', companyId);
      } catch {}
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {}
      return NextResponse.json(
        { success: false, error: 'Kunne ikke opprette kontakt' },
        { status: 500, headers: corsHeaders(request) }
      );
    }

    const apiaryName = `${companyName} – bedriftsbigård`;
    const apiaryNumber = `BED-${orgNumber.replace(/\D/g, '')}`.slice(0, 32) || null;
    const location = [address, postalCode, city].filter(Boolean).join(', ') || null;

    const { data: apiary, error: apiaryError } = await admin
      .from('apiaries')
      .insert({
        user_id: userId,
        name: apiaryName,
        apiary_number: apiaryNumber,
        type: 'bigård',
        location,
        company_id: companyId,
        package_type: packageType,
        status: 'under_etablering',
      })
      .select('id')
      .single();

    if (apiaryError || !apiary?.id) {
      try {
        await admin.from('companies').delete().eq('id', companyId);
      } catch {}
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {}
      return NextResponse.json(
        { success: false, error: 'Kunne ikke opprette bigård' },
        { status: 500, headers: corsHeaders(request) }
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const { error: tokenError } = await admin.from('magic_tokens').insert({
      email: contactEmail,
      token,
      expires_at: expiresAt,
      used: false,
      purpose: 'company_login',
      user_id: userId,
    });

    if (tokenError) {
      try {
        await admin.from('companies').delete().eq('id', companyId);
      } catch {}
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {}
      return NextResponse.json(
        { success: false, error: 'Kunne ikke opprette innloggingslenke' },
        { status: 500, headers: corsHeaders(request) }
      );
    }

    const loginUrl = `${getBaseUrl(request)}/login?token=${encodeURIComponent(token)}`;

    const mail = getMailService(admin);
    const mailResult = await mail.sendMail(
      'Biens Vokter',
      contactEmail,
      'Din bedriftsbigård er opprettet',
      [
        `Hei ${contactName}!`,
        '',
        `Din bedriftsbigård for ${companyName} er opprettet.`,
        '',
        `Logg inn her: ${loginUrl}`,
        '',
        `<a href="${loginUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">Logg inn</a>`,
      ].join('\n'),
      userId
    );

    if (mailResult?.error) {
      console.error('create-order mail failed:', mailResult.error);
    }

    return ok(request);
  } catch (e: any) {
    return fail(request, 500, e?.message || 'Ukjent feil');
  }
}
