import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('contacts').select('id').limit(1);
  if (error) {
    console.error("Error fetching from contacts:", error.message);
  } else {
    console.log("Contacts table exists, data:", data);
  }
}

main();