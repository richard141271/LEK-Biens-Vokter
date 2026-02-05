
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName: string) {
  console.log(`\n--- Checking ${tableName} ---`);
  
  // Try HEAD
  const { count, error: headError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (headError) {
    console.error(`HEAD request failed for ${tableName}:`, headError.message);
  } else {
    console.log(`HEAD request succeeded. Count: ${count}`);
  }

  // Try SELECT 1 row
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (error) {
    console.error(`SELECT failed for ${tableName}:`, error.message);
  } else if (data && data.length > 0) {
    console.log(`SELECT success! Found row:`, data[0]);
  } else {
    console.log(`SELECT success but table is empty.`);
  }
}

async function inspectAll() {
  const tables = [
    'profiles'
  ];

  console.log('--- Inspecting Founder Followups ---');
  const { data, error } = await supabase
    .from('founder_followups')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching founder_followups:', error);
  } else {
    console.log('Founder Followups exists');
    if (data && data.length > 0) {
        console.log('Sample row:', data[0]);
    } else {
        console.log('Table is empty');
    }
  }
}

inspectAll();
