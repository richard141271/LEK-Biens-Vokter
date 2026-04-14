import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const admin = createAdminClient();
  const { slug } = params;

  const publicSlug = String(slug || '').trim().toLowerCase();
  if (!publicSlug) {
    return NextResponse.json({ error: 'Mangler slug' }, { status: 400 });
  }

  const { data: company, error: companyError } = await admin
    .from('companies')
    .select('id, name, public_slug, city')
    .eq('public_slug', publicSlug)
    .maybeSingle();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  if (!company?.id) {
    return NextResponse.json({ error: 'Fant ikke bedrift' }, { status: 404 });
  }

  const { data: apiary, error: apiaryError } = await admin
    .from('apiaries')
    .select('package_type, status')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (apiaryError) {
    return NextResponse.json({ error: apiaryError.message }, { status: 500 });
  }

  return NextResponse.json({
    company: {
      name: company.name,
      public_slug: company.public_slug,
      city: company.city,
    },
    package_type: apiary?.package_type || null,
    status: apiary?.status || null,
  });
}
