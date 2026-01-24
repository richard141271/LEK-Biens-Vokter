
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { generateFranchiseReportHtml } from '@/utils/franchise-report-pdf-template';

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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const reportId = params.id;

  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Fetch Report
  const { data: report, error: reportError } = await adminClient
    .from('franchise_weekly_reports')
    .select('*, franchise_units(name), profiles:submitted_by(first_name, last_name, email)')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Format names
  const franchiseName = report.franchise_units?.name || 'Ukjent Enhet';
  const profile = report.profiles as any;
  const ownerName = profile ? `${profile.first_name} ${profile.last_name}` : 'Ukjent Bruker';

  // --- Generate HTML ---
  const html = generateFranchiseReportHtml(report, franchiseName, ownerName);

  // --- Generate PDF with Puppeteer ---
  try {
    let browser;
    
    if (process.env.NODE_ENV === 'production') {
      const chromium = require('@sparticuz/chromium');
      const puppeteerCore = require('puppeteer-core');
      
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: "new"
      });
    }

    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Ukesrapport-${report.week}-${report.year}-${franchiseName}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
