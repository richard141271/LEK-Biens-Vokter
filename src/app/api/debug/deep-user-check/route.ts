import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminClient = createAdminClient();
  const report: any[] = [];
  
  const targetNames = [
    "Bahaddin Golparvar",
    "Siri Dalene Dalnoki",
    "Kirsti Olsen",
    "Jørn Thoresen",
    "Trond Vaglen",
    "Ida Strøm",
    "Vidar Thoresen",
    "Helene Høyvik Rossebø",
    "Harald Rusten",
    "Bente K. Rusten",
    "Gunnar Rusten",
    "Ismail Aziz",
    "Nina Bbheiaas",
    "Tormod Heiaas"
  ];

  try {
    // 1. Fetch ALL Auth Users (handling pagination if needed, but 1000 is likely enough for now)
    const { data: { users: authUsers }, error: authError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (authError) throw new Error(`Auth Error: ${authError.message}`);

    // 2. Fetch ALL Profiles
    const { data: profiles, error: profileError } = await adminClient.from('profiles').select('*');
    if (profileError) throw new Error(`Profile Error: ${profileError.message}`);

    // 3. Fetch ALL Apiaries (to check ownership)
    const { data: apiaries, error: apiaryError } = await adminClient.from('apiaries').select('id, user_id');
    
    // 4. Fetch ALL Hives
    const { data: hives, error: hiveError } = await adminClient.from('hives').select('id, user_id');

    // 5. Fetch Admin Logs to find lost IDs
    const { data: logs } = await adminClient.from('admin_logs').select('details, target_id, user_id').order('created_at', { ascending: false }).limit(1000);

    // Helper to find partial matches
    const normalize = (s: string) => s?.toLowerCase().trim() || '';
    
    for (const name of targetNames) {
      const nName = normalize(name);
      const nameParts = nName.split(' ');
      
      // Search in Auth
      const authMatches = authUsers.filter(u => {
        const metaName = normalize(u.user_metadata?.full_name || '');
        const email = normalize(u.email || '');
        
        // Strict check: metaName must NOT be empty to match
        const nameMatch = metaName.length > 2 && (metaName.includes(nName) || nName.includes(metaName));
        
        // Email match: must match first AND last name part if available
        const emailMatch = nameParts.length > 1 && email.includes(nameParts[0]) && email.includes(nameParts[nameParts.length-1]);
        
        return nameMatch || emailMatch;
      });

      const authMatch = authMatches.length > 0 ? authMatches[0] : undefined;

      // Search in Profiles
      const profileMatch = profiles?.find(p => {
        const pName = normalize(p.full_name);
        return pName.includes(nName) || nName.includes(pName);
      });

      // Search in Logs for historical ID
      const logMatch = logs?.find(l => l.details?.toLowerCase().includes(nName));
      const historicalId = logMatch?.target_id || logMatch?.user_id;

      // Cross-reference: If we found auth, look for profile with that ID
      const linkedProfile = authMatch ? profiles?.find(p => p.id === authMatch.id) : null;
      
      // Determine final ID to check data for
      const userId = authMatch?.id || profileMatch?.id || historicalId;

      // Check Data
      const apiaryCount = userId ? (apiaries?.filter(a => a.user_id === userId).length || 0) : 0;
      const hiveCount = userId ? (hives?.filter(h => h.user_id === userId).length || 0) : 0;

      report.push({
        name_searched: name,
        found_in_auth: !!authMatch,
        auth_id: authMatch?.id || null,
        
        found_in_profiles: !!linkedProfile || !!profileMatch,
        profile_id: linkedProfile?.id || profileMatch?.id || null,
        
        found_in_logs: !!logMatch,
        historical_id: historicalId || null,
        
        data_apiaries: apiaryCount,
        data_hives: hiveCount,
        
        status: authMatch ? 'OK' : (historicalId ? (apiaryCount > 0 ? 'GHOST (Deleted but Data Remains)' : 'DELETED (Found in logs)') : 'MISSING (No trace)')
    });
  }

  // 6. Find ORPHAN APIARIES (Data belonging to deleted users)
  // Get all valid user IDs
  const validUserIds = new Set(authUsers.map(u => u.id));
  
  // Find apiaries whose user_id is NOT in validUserIds
  const orphanApiaries = apiaries?.filter(a => !validUserIds.has(a.user_id)).slice(0, 20) || [];
  
  // Fetch details for these orphans to show the user
  let orphanDetails: any[] = [];
  if (orphanApiaries.length > 0) {
      const { data: details } = await adminClient
          .from('apiaries')
          .select('id, name, location, user_id')
          .in('id', orphanApiaries.map(a => a.id));
      orphanDetails = details || [];
  }

  return NextResponse.json({ 
      report,
      orphanApiariesCount: orphanApiaries.length,
      orphanApiaries: orphanDetails
  });
} catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
