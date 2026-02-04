import { createClient } from '@/utils/supabase/client';

export default async function checkColumns() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('founder_ambitions')
        .select('*')
        .limit(1);
    
    console.log('Data:', data);
    console.log('Error:', error);
}
