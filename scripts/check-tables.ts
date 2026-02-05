
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking tables in project:', supabaseUrl);
  
  // We can't easily query information_schema via the JS client with anon key usually, 
  // unless we have a specific function or permissions. 
  // However, we can try to simply select from the tables and see if we get an error or data.
  // Actually, 'rpc' is better if we had a function, but we don't.
  // Let's try to just list tables by trying to select count from them.
  
  const tables = [
    'document_templates',
    'generated_documents',
    'document_signatures',
    'document_placeholders',
    'signatures', // trying variants
    'documents',
    'templates'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') { // undefined_table
        console.log(`Table '${table}' DOES NOT exist.`);
      } else {
        console.log(`Table '${table}' exists (or other error: ${error.message})`);
      }
    } else {
      console.log(`Table '${table}' EXISTS.`);
    }
  }
}

checkTables();
