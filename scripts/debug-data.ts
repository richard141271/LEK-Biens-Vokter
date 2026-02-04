
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Fetching founder profiles...');
  const { data: founders, error: fError } = await supabase.from('founder_profiles').select('*');
  if (fError) console.error('Error fetching founders:', fError);
  else console.log('Founders:', founders);

  if (founders && founders.length > 0) {
    const ids = founders.map(f => f.id);
    console.log('Fetching profiles for IDs:', ids);
    
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', ids);
        
    if (pError) console.error('Error fetching profiles:', pError);
    else console.log('Profiles found:', profiles);
    
    // Check for missing
    const foundIds = profiles?.map(p => p.id) || [];
    const missing = ids.filter(id => !foundIds.includes(id));
    console.log('Missing profile IDs:', missing);
  }
}

main();
