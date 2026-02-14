'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

interface SicknessReportData {
  hiveId: string;
  varroaCount: string;
  behavior: string;
  diseaseType: string;
  mortality: string;
  description: string;
  imageUrls?: string[];
  aiDetails?: string;
}

export async function getSignedUploadUrl(fileName: string) {
  const adminClient = createAdminClient();
  
  // Ensure bucket exists first
  const { error: bucketError } = await adminClient.storage.createBucket('sickness-images', {
    public: true,
    fileSizeLimit: 10485760, // Increased to 10MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
  });
  
  // Ignore bucket already exists error
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Error ensuring bucket exists:', bucketError);
  }

  // Create signed URL for upload (valid for 60 seconds)
  const { data, error } = await adminClient.storage
    .from('sickness-images')
    .createSignedUploadUrl(fileName);

  if (error) {
    console.error('Error creating signed upload URL:', error);
    throw new Error('Kunne ikke forberede bildeopplasting');
  }

  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

export async function submitSicknessReport(data: SicknessReportData) {
  const supabase = createClient();
  const adminClient = createAdminClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Du må være logget inn for å sende rapport");

    // 1. Create the main report for the reporter
    const imageString = data.imageUrls && data.imageUrls.length > 0 
      ? `\nBilder: ${data.imageUrls.join(', ')}` 
      : '';
      
    const details = `Sykdom: ${data.diseaseType}, Atferd: ${data.behavior}, Død: ${data.mortality}, Varroa: ${data.varroaCount}. Beskrivelse: ${data.description}${imageString}${data.aiDetails || ''}`;

    const { error: logError } = await adminClient.from('hive_logs').insert({
      hive_id: data.hiveId || null,
      user_id: user.id,
      action: 'SYKDOM',
      details: data.hiveId ? details : `(Generell Rapport) ${details}`,
      shared_with_mattilsynet: true,
      created_at: new Date().toISOString()
    });

    if (logError) throw logError;

    // Audit Log for verification
    await adminClient.from('admin_logs').insert({
        action: 'SICKNESS_REPORT_RECEIVED',
        details: `Report from ${user.email} for Hive ${data.hiveId || 'Generell'}. Disease: ${data.diseaseType}`,
        target_id: user.id
    });

    // 2. "Neighbor Alert" - Find other beekeepers
    // Since we don't have lat/lon coordinates in the current 'location' string field,
    // we will alert ALL other beekeepers for this pilot phase to ensure safety.
    // In production, this should use PostGIS or lat/lon columns.
    
    const { data: otherBeekeepers, error: userError } = await adminClient
        .from('profiles')
        .select('id, full_name')
        // .eq('role', 'beekeeper') // Removed to ensure all pilot users get alerts
        .neq('id', user.id); // Exclude self

    if (userError) {
        console.error("Failed to fetch neighbors for alert:", userError);
    } else if (otherBeekeepers && otherBeekeepers.length > 0) {
        // Create alert logs for neighbors
        const alerts = otherBeekeepers.map(bk => ({
            user_id: bk.id,
            action: 'SYKDOM', // Using SYKDOM so it shows up in their dashboard alerts
            details: `NABOVARSEL: Smitte (${data.diseaseType}) rapportert i ditt område. Sjekk dine kuber! \n(Dette er et automatisk varsel sendt til birøktere i pilot-gruppen)`,
            created_at: new Date().toISOString(),
            shared_with_mattilsynet: false // No need to spam Mattilsynet with the alerts
        }));

        const { error: alertError } = await adminClient
            .from('hive_logs')
            .insert(alerts);
            
        if (alertError) {
            console.error("Failed to send neighbor alerts:", alertError);
        }
    }

    return { success: true, neighborCount: otherBeekeepers?.length || 0 };

  } catch (error: any) {
    console.error("Error submitting sickness report:", error);
    return { success: false, error: error.message };
  }
}
