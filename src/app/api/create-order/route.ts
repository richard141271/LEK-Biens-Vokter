import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { getMailService } from '@/services/mail';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  return `${proto}://${host}`;
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
      return NextResponse.json({ error: 'Mangler firmanavn' }, { status: 400 });
    }
    if (!orgNumber) {
      return NextResponse.json({ error: 'Mangler organisasjonsnummer' }, { status: 400 });
    }
    if (!contactName) {
      return NextResponse.json({ error: 'Mangler navn (kontaktperson)' }, { status: 400 });
    }
    if (!contactEmail) {
      return NextResponse.json({ error: 'Mangler e-post (kontaktperson)' }, { status: 400 });
    }
    if (!packageType) {
      return NextResponse.json(
        { error: 'Mangler eller ugyldig pakke', allowed: ['6_kuber', '8_kuber', '10_kuber', 'honningkollektiv'] },
        { status: 400 }
      );
    }

    const { data: existingCompany } = await admin
      .from('companies')
      .select('id')
      .eq('org_number', orgNumber)
      .maybeSingle();

    if (existingCompany?.id) {
      return NextResponse.json({ error: 'Bedrift finnes allerede' }, { status: 409 });
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

    const randomPassword = crypto.randomBytes(24).toString('base64url');
    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: contactEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        account_type: 'company',
        company_name: companyName,
        company_slug: slug,
      },
    });

    if (createUserError || !createdUser?.user?.id) {
      const msg = String(createUserError?.message || 'Kunne ikke opprette bruker');
      return NextResponse.json({ error: msg }, { status: 500 });
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
        { error: 'Kunne ikke opprette bedrift', detail: companyError?.message || undefined },
        { status: 500 }
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
        { error: 'Kunne ikke koble bruker til bedrift', detail: userRowError.message },
        { status: 500 }
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
        { error: 'Kunne ikke opprette kontakt', detail: contactError.message },
        { status: 500 }
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
        { error: 'Kunne ikke opprette bigård', detail: apiaryError?.message || undefined },
        { status: 500 }
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
        { error: 'Kunne ikke opprette innloggingslenke', detail: tokenError.message },
        { status: 500 }
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
      return NextResponse.json(
        { error: 'Kunne ikke sende e-post', detail: mailResult.error, loginUrl },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      company: { id: companyId, name: companyName, public_slug: slug },
      apiary: { id: apiary.id, status: 'under_etablering', package_type: packageType },
      loginUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ukjent feil' }, { status: 500 });
  }
}
