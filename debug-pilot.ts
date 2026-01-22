
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkPilotInterests() {
  console.log('Checking pilot_interest table...');
  const { data, error } = await supabase
    .from('pilot_interest')
    .select('*');

  if (error) {
    console.error('Error fetching pilot_interest:', error);
    return;
  }

  console.log('Total rows:', data.length);
  console.table(data);
}

checkPilotInterests();
