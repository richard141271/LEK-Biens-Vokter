import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';
import BuyClient from './ui';

export default async function BuyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('stock_profiles').select('full_name').eq('id', user.id).maybeSingle();
  const { data: offering } = await admin
    .from('stock_offerings')
    .select('id, price_per_share, available_shares, active')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: settings } = await admin.from('stock_settings').select('fee_rate').eq('id', 1).maybeSingle();

  return (
    <BuyClient
      userEmail={user.email || ''}
      defaultFullName={profile?.full_name || (user.user_metadata as any)?.full_name || ''}
      pricePerShare={Number(offering?.price_per_share || 0)}
      availableShares={Number(offering?.available_shares || 0)}
      active={Boolean(offering?.active)}
      feeRate={Number(settings?.fee_rate ?? 0.02)}
    />
  );
}
