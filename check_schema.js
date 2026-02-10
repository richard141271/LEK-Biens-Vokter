
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('apiaries')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('No data found to infer columns, but query worked.');
    }
  }
}

checkSchema();
