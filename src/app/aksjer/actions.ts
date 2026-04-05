'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function getClientIp() {
  const h = headers();
  const forwarded = h.get('x-forwarded-for');
  if (!forwarded) return null;
  return forwarded.split(',')[0]?.trim() || null;
}

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/aksjer/signin');
  return user;
}

async function requireStockAdmin() {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  const isVip = [
    'richard141271@gmail.com',
    'richard141271@gmail.no',
    'lek@kias.no',
    'jorn@kias.no',
  ].includes((user.email || '').toLowerCase());
  const isAdmin = profile?.role === 'admin' || isVip;
  if (!isAdmin) redirect('/aksjer/dashboard');
  return user;
}

function randomRef() {
  const chunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AI-${chunk}`;
}

async function ensureUniqueRef(admin: ReturnType<typeof createAdminClient>) {
  for (let i = 0; i < 8; i++) {
    const ref = randomRef();
    const { data } = await admin.from('stock_orders').select('id').eq('payment_reference', ref).maybeSingle();
    if (!data?.id) return ref;
  }
  return `AI-${Date.now().toString(36).toUpperCase()}`;
}

export async function createEmissionOrder(formData: FormData) {
  const user = await requireUser();
  const admin = createAdminClient();

  const shareCount = Number(formData.get('shareCount') || 0);
  const paymentMethod = String(formData.get('paymentMethod') || 'bank');
  const fullName = String(formData.get('fullName') || '').trim();
  const agreed = String(formData.get('agreed') || '') === 'on';

  if (!Number.isFinite(shareCount) || shareCount <= 0) return;
  if (paymentMethod !== 'bank' && paymentMethod !== 'usdt_trc20') return;
  if (!agreed) return;

  if (fullName) {
    await admin.from('stock_profiles').upsert({ id: user.id, full_name: fullName, email: user.email }, { onConflict: 'id' });
  }

  const { data: offering } = await admin
    .from('stock_offerings')
    .select('id, price_per_share, available_shares, active')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!offering?.id || !offering.active) return;
  if ((offering.available_shares || 0) < shareCount) return;

  const { data: settings } = await admin.from('stock_settings').select('fee_rate').eq('id', 1).maybeSingle();
  const feeRate = Number(settings?.fee_rate ?? 0.02);
  const pricePerShare = Number(offering.price_per_share);
  const totalAmount = Number((shareCount * pricePerShare).toFixed(2));
  const feeAmount = Number((totalAmount * feeRate).toFixed(2));

  const ref = await ensureUniqueRef(admin);
  const ip = getClientIp();
  const nowIso = new Date().toISOString();

  const agreement = {
    company: 'AI Innovate AS',
    buyerName: fullName || user.email,
    buyerEmail: user.email,
    shareCount,
    pricePerShare,
    totalAmount,
    date: nowIso,
    type: 'emisjon',
    acceptedAt: nowIso,
    acceptedIp: ip,
  };

  const { data: order, error } = await admin
    .from('stock_orders')
    .insert({
      type: 'emission',
      buyer_id: user.id,
      offering_id: offering.id,
      share_count: shareCount,
      price_per_share: pricePerShare,
      fee_rate: feeRate,
      total_amount: totalAmount,
      fee_amount: feeAmount,
      payment_method: paymentMethod,
      payment_reference: ref,
      status: 'awaiting_payment',
      agreement_json: agreement,
      signed_at: nowIso,
      signed_ip: ip,
      buyer_ip: ip,
    })
    .select('id')
    .single();

  if (error || !order?.id) return;

  revalidatePath('/aksjer/dashboard');
  redirect(`/aksjer/orders/${order.id}`);
}

export async function createListing(formData: FormData) {
  const user = await requireUser();
  const admin = createAdminClient();

  const shareCount = Number(formData.get('shareCount') || 0);
  const pricePerShare = Number(formData.get('pricePerShare') || 0);

  if (!Number.isFinite(shareCount) || shareCount <= 0) {
    redirect('/aksjer/sell?error=Ugyldig%20antall');
  }
  if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) {
    redirect('/aksjer/sell?error=Ugyldig%20pris');
  }

  const { data: sh } = await admin.from('shareholders').select('antall_aksjer').eq('user_id', user.id).maybeSingle();
  const owned = Number(sh?.antall_aksjer || 0);
  if (owned <= 0) {
    redirect('/aksjer/sell?error=Du%20har%20ingen%20aksjer%20%C3%A5%20selge');
  }

  const { data: activeListings, error: activeErr } = await admin
    .from('stock_listings')
    .select('share_count')
    .eq('seller_id', user.id)
    .eq('status', 'active')
    .limit(500);
  if (activeErr) {
    const msg = encodeURIComponent(activeErr.message || 'Kunne%20ikke%20sjekke%20aktive%20annonser');
    redirect(`/aksjer/sell?error=${msg}`);
  }
  const alreadyListed = (activeListings || []).reduce((sum: number, row: any) => sum + Number(row?.share_count || 0), 0);
  const availableToList = Math.max(0, owned - alreadyListed);
  if (shareCount > availableToList) {
    redirect(
      `/aksjer/sell?error=${encodeURIComponent(
        `Du kan ikke legge ut ${shareCount} aksjer. Du har ${availableToList} tilgjengelig (eier ${owned}, ${alreadyListed} er allerede lagt ut).`
      )}`
    );
  }

  const { error } = await admin
    .from('stock_listings')
    .insert({ seller_id: user.id, share_count: shareCount, price_per_share: pricePerShare, status: 'active' });

  if (error) {
    const msg = encodeURIComponent(error.message || 'Kunne%20ikke%20legge%20ut%20annonse');
    redirect(`/aksjer/sell?error=${msg}`);
  }
  revalidatePath('/aksjer/sell');
  redirect('/aksjer/sell?ok=1');
}

export async function cancelListing(formData: FormData) {
  const user = await requireUser();
  const admin = createAdminClient();
  const listingId = String(formData.get('listingId') || '');
  if (!listingId) return;

  await admin
    .from('stock_listings')
    .update({ status: 'cancelled' })
    .eq('id', listingId)
    .eq('seller_id', user.id);

  revalidatePath('/aksjer/sell');
}

export async function createResaleOrder(formData: FormData) {
  const user = await requireUser();
  const admin = createAdminClient();

  const listingId = String(formData.get('listingId') || '');
  const shareCount = Number(formData.get('shareCount') || 0);
  const paymentMethod = String(formData.get('paymentMethod') || 'bank');
  const fullName = String(formData.get('fullName') || '').trim();
  const agreed = String(formData.get('agreed') || '') === 'on';

  if (!listingId) return;
  if (!Number.isFinite(shareCount) || shareCount <= 0) return;
  if (paymentMethod !== 'bank' && paymentMethod !== 'usdt_trc20') return;
  if (!agreed) return;

  if (fullName) {
    await admin.from('stock_profiles').upsert({ id: user.id, full_name: fullName, email: user.email }, { onConflict: 'id' });
  }

  const { data: listing } = await admin
    .from('stock_listings')
    .select('id, seller_id, share_count, price_per_share, status')
    .eq('id', listingId)
    .single();

  if (!listing?.id || listing.status !== 'active') return;
  if (listing.seller_id === user.id) return;
  if ((listing.share_count || 0) < shareCount) return;

  const { data: settings } = await admin.from('stock_settings').select('fee_rate').eq('id', 1).maybeSingle();
  const feeRate = Number(settings?.fee_rate ?? 0.02);
  const pricePerShare = Number(listing.price_per_share);
  const totalAmount = Number((shareCount * pricePerShare).toFixed(2));
  const feeAmount = Number((totalAmount * feeRate).toFixed(2));

  const ref = await ensureUniqueRef(admin);
  const ip = getClientIp();
  const nowIso = new Date().toISOString();

  const agreement = {
    company: 'AI Innovate AS',
    buyerName: fullName || user.email,
    buyerEmail: user.email,
    shareCount,
    pricePerShare,
    totalAmount,
    date: nowIso,
    type: 'videresalg',
    acceptedAt: nowIso,
    acceptedIp: ip,
  };

  const { data: order, error } = await admin
    .from('stock_orders')
    .insert({
      type: 'resale',
      buyer_id: user.id,
      seller_id: listing.seller_id,
      listing_id: listing.id,
      share_count: shareCount,
      price_per_share: pricePerShare,
      fee_rate: feeRate,
      total_amount: totalAmount,
      fee_amount: feeAmount,
      payment_method: paymentMethod,
      payment_reference: ref,
      status: 'awaiting_payment',
      agreement_json: agreement,
      signed_at: nowIso,
      signed_ip: ip,
      buyer_ip: ip,
    })
    .select('id')
    .single();

  if (error || !order?.id) return;

  revalidatePath('/aksjer/sell');
  redirect(`/aksjer/orders/${order.id}`);
}

export async function markPaid(formData: FormData) {
  await requireUser();
  const supabase = createClient();
  const orderId = String(formData.get('orderId') || '');
  if (!orderId) return;

  const ip = getClientIp();
  const { error } = await supabase.rpc('stock_mark_paid', { order_id_input: orderId, payer_ip: ip });
  if (error) return;

  revalidatePath(`/aksjer/orders/${orderId}`);
  revalidatePath('/aksjer/dashboard');
  redirect(`/aksjer/orders/${orderId}`);
}

export async function adminInitSetup(formData: FormData) {
  const adminUser = await requireStockAdmin();
  const admin = createAdminClient();
  const totalShares = Number(formData.get('totalShares') || 0);
  if (!Number.isFinite(totalShares) || totalShares < 0) {
    redirect('/aksjer/admin?error=Ugyldig%20antall');
  }
  const { error } = await admin.rpc('stock_admin_init_setup', { total_shares_input: totalShares });
  if (error) {
    const msg = encodeURIComponent(error.message || 'Kunne ikke initialisere holding');
    redirect(`/aksjer/admin?error=${msg}`);
  }
  revalidatePath('/aksjer/admin');
  redirect('/aksjer/admin?ok=1');
}

export async function adminSetOffering(formData: FormData) {
  const adminUser = await requireStockAdmin();
  const admin = createAdminClient();

  const pricePerShare = Number(formData.get('pricePerShare') || 0);
  const availableShares = Number(formData.get('availableShares') || 0);
  const active = String(formData.get('active') || '') === 'on';

  if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) {
    redirect('/aksjer/admin?error=Ugyldig%20pris');
  }
  if (!Number.isFinite(availableShares) || availableShares < 0) {
    redirect('/aksjer/admin?error=Ugyldig%20antall');
  }

  const { error: deactivateError } = await admin.from('stock_offerings').update({ active: false }).eq('active', true);
  if (deactivateError) {
    const msg = encodeURIComponent(deactivateError.message || 'Kunne ikke deaktivere eksisterende emisjon');
    redirect(`/aksjer/admin?error=${msg}`);
  }

  const { error: insertError } = await admin.from('stock_offerings').insert({
    active,
    price_per_share: pricePerShare,
    available_shares: availableShares,
    created_by: adminUser.id,
  });
  if (insertError) {
    const raw = insertError.message || 'Kunne ikke lagre emisjon';
    const msg = encodeURIComponent(raw.includes('does not exist') ? 'Database%20mangler%20migrasjon%20for%20aksjer' : raw);
    redirect(`/aksjer/admin?error=${msg}`);
  }

  revalidatePath('/aksjer/buy');
  revalidatePath('/aksjer/admin');
  redirect('/aksjer/admin?ok=1');
}

export async function adminApproveOrder(formData: FormData) {
  const adminUser = await requireStockAdmin();
  const admin = createAdminClient();
  const orderId = String(formData.get('orderId') || '');
  if (!orderId) redirect('/aksjer/admin?error=Mangler%20ordre-ID');
  const ip = getClientIp();
  const { error } = await admin.rpc('stock_admin_approve_order', { order_id_input: orderId, admin_user_id: adminUser.id, admin_ip: ip });
  if (error) {
    const msg = encodeURIComponent(error.message || 'Kunne ikke godkjenne ordre');
    redirect(`/aksjer/admin?error=${msg}`);
  }
  revalidatePath('/aksjer/admin');
  revalidatePath('/aksjer/dashboard');
  redirect('/aksjer/admin?ok=1');
}

export async function adminRejectOrder(formData: FormData) {
  const adminUser = await requireStockAdmin();
  const admin = createAdminClient();
  const orderId = String(formData.get('orderId') || '');
  if (!orderId) redirect('/aksjer/admin?error=Mangler%20ordre-ID');
  const ip = getClientIp();
  const { error } = await admin.rpc('stock_admin_reject_order', { order_id_input: orderId, admin_user_id: adminUser.id, admin_ip: ip });
  if (error) {
    const msg = encodeURIComponent(error.message || 'Kunne ikke avvise ordre');
    redirect(`/aksjer/admin?error=${msg}`);
  }
  revalidatePath('/aksjer/admin');
  redirect('/aksjer/admin?ok=1');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/aksjer/signin');
}
