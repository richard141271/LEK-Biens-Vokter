import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AksjerIndex() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? '/aksjer/dashboard' : '/aksjer/signin');
}

