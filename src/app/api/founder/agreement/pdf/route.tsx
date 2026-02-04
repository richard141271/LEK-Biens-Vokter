import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateFounderAgreementHtml } from '@/utils/founder-agreement-pdf-template';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch founder profile and ambitions
  const { data: profile } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.status !== 'active') {
    return NextResponse.json({ error: 'Agreement not signed or active' }, { status: 403 });
  }

  const { data: ambitions } = await supabase
    .from('founder_ambitions')
    .select('*')
    .eq('founder_id', user.id)
    .single();

  const { data: userDetails } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  // Fetch checks to determine role
  const { data: checks } = await supabase
    .from('founder_agreement_checks')
    .select('check_key')
    .eq('founder_id', user.id);
  
  const checkedKeys = checks?.map(c => c.check_key) || [];
  const role = checkedKeys.includes('role_shareholder') ? 'Medgründer med aksjepost' : 'Selvstendig næringsdrivende';

  // Read Coat of Arms
  const imagePath = path.join(process.cwd(), 'public', 'BILDER', 'LEK-Biens vokter våpen.png');
  const imageBuffer = await fs.promises.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');

  // Generate HTML
  const html = generateFounderAgreementHtml(profile, userDetails || { email: user.email }, ambitions || {}, base64Image, role);

  // Generate PDF
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

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Vennskapsavtale-${userDetails?.full_name || 'Gründer'}.pdf"`
      }
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
