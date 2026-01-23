import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import puppeteer from 'puppeteer';
import { generatePdfHtml } from '@/utils/pdf-template';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Auth Helper ---
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };

  const adminVerifier = createAdminClient();
  const { data: adminProfile } = await adminVerifier
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isVip = user.email === 'richard141271@gmail.com';
  const isAdmin = adminProfile?.role === 'admin' || isVip;

  return { user, isAdmin };
}

// --- Data Mapping ---
const mapResponseToAnswers = (row: any, type: "BEEKEEPER" | "NON_BEEKEEPER") => {
  if (type === "BEEKEEPER") {
    return {
      hives_count: row.number_of_hives_category,
      nbl_member: row.is_member_norwegian_beekeepers ? 'ja' : 'nei',
      disease_last_3y: row.experienced_disease,
      value_automatic_alert: row.value_warning_system,
      value_nearby_alert: row.value_nearby_alert,
      value_reporting: row.value_reporting,
      value_overview: row.value_better_overview,
      would_use_system: row.would_use_system_choice,
      pilot_interest: row.pilot_answer,
      biggest_challenge: row.biggest_challenge,
    };
  } else {
    return {
      rental_interest: row.rental_interest,
      pollinator_importance: row.pollinator_importance,
      digital_tool_interest: row.digital_tool_interest,
      disease_awareness: row.disease_awareness,
      pilot_interest: row.pilot_answer,
      nb_eats_honey: row.eats_honey,
    } as any;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || 'BEEKEEPER') as 'BEEKEEPER' | 'NON_BEEKEEPER';
  
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: allResponses } = await adminClient
    .from('survey_responses')
    .select('*')
    .order('created_at', { ascending: false });

  if (!allResponses) {
    return NextResponse.json({ error: 'No data' }, { status: 404 });
  }

  // --- Process Data ---
  const submissions = allResponses.map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    is_beekeeper: row.is_beekeeper,
    answers: mapResponseToAnswers(row, row.is_beekeeper ? "BEEKEEPER" : "NON_BEEKEEPER")
  }));

  const currentData = submissions.filter(s => 
    type === 'BEEKEEPER' ? s.is_beekeeper : !s.is_beekeeper
  );

  const totalAnswers = currentData.length;
  
  // --- Generate HTML ---
  const html = generatePdfHtml(currentData, totalAnswers, type);

  // --- Generate PDF with Puppeteer ---
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
    });

    await browser.close();

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-${type.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate PDF', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
