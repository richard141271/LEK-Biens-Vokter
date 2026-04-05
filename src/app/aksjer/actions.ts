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

function isMissingDbObjectError(message: string | null | undefined) {
  const m = (message || '').toLowerCase();
  if (!m) return false;
  return m.includes('could not find the table') || m.includes('does not exist') || m.includes('column') && m.includes('does not exist');
}

async function ensureShareholderForUser(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { error } = await admin.rpc('stock_ensure_shareholder_for_user', { target_user_id: userId });
  if (error && !isMissingDbObjectError(error.message)) {
    redirect(`/aksjer/dashboard?error=${encodeURIComponent(error.message || 'Kunne ikke opprette aksjonær')}`);
  }
}

async function requireFormalShareholderInfo(userId: string, nextPath: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shareholders')
    .select('entity_type, birth_date, national_id, orgnr, address_line1, postal_code, city, country')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingDbObjectError(error.message)) return;
    redirect(`/aksjer/dashboard?error=${encodeURIComponent(error.message || 'Kunne ikke lese aksjonær')}`);
  }
  if (!data) return;

  const entityType = String((data as any).entity_type || 'unknown');
  const nationalId = String((data as any).national_id || '').trim();
  const orgnr = String((data as any).orgnr || '').trim();
  const addressLine1 = String((data as any).address_line1 || '').trim();
  const postalCode = String((data as any).postal_code || '').trim();
  const city = String((data as any).city || '').trim();

  const missingIdentity = (entityType === 'person' && !nationalId) || (entityType === 'company' && !orgnr) || entityType === 'unknown';
  const missingAddress = !addressLine1 || !postalCode || !city;

  if (missingIdentity || missingAddress) {
    redirect(`/aksjer/profile?next=${encodeURIComponent(nextPath)}&error=${encodeURIComponent('Fyll inn identitet og adresse før du kan gjennomføre kjøp/videresalg.')}`);
  }
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

  await ensureShareholderForUser(admin, user.id);
  await requireFormalShareholderInfo(user.id, '/aksjer/buy');

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

  await ensureShareholderForUser(admin, user.id);
  await requireFormalShareholderInfo(user.id, '/aksjer/sell');

  const payoutRes = await admin
    .from('shareholders')
    .select('payout_bank_account, payout_vipps, payout_usdt_trc20')
    .eq('user_id', user.id)
    .maybeSingle();
  if (payoutRes.error) {
    const msg = encodeURIComponent(payoutRes.error.message || 'Kunne ikke lese utbetalingsinfo');
    redirect(`/aksjer/profile?next=/aksjer/sell&error=${msg}`);
  }
  const payout = payoutRes.data as any;
  const hasPayout =
    Boolean(String(payout?.payout_bank_account || '').trim()) ||
    Boolean(String(payout?.payout_vipps || '').trim()) ||
    Boolean(String(payout?.payout_usdt_trc20 || '').trim());
  if (!hasPayout) {
    redirect(
      `/aksjer/profile?next=/aksjer/sell&error=${encodeURIComponent(
        'Du må registrere minst én utbetalingsmetode (bank/Vipps/krypto) før du kan legge ut aksjer for videresalg.'
      )}`
    );
  }

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

  await ensureShareholderForUser(admin, user.id);
  await requireFormalShareholderInfo(user.id, '/aksjer/buy');

  const listingId = String(formData.get('listingId') || '');
  const shareCount = Number(formData.get('shareCount') || 0);
  const paymentMethod = String(formData.get('paymentMethod') || 'bank');
  const fullName = String(formData.get('fullName') || '').trim();
  const agreed = String(formData.get('agreed') || '') === 'on';

  if (!listingId) return;
  if (!Number.isFinite(shareCount) || shareCount <= 0) return;
  if (paymentMethod !== 'bank' && paymentMethod !== 'vipps' && paymentMethod !== 'usdt_trc20') return;
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

  const sellerPayoutRes = await admin
    .from('shareholders')
    .select('payout_bank_account, payout_vipps, payout_usdt_trc20')
    .eq('user_id', listing.seller_id)
    .maybeSingle();
  if (sellerPayoutRes.error) {
    return redirect(`/aksjer/sell?error=${encodeURIComponent(sellerPayoutRes.error.message || 'Kunne ikke lese selgers utbetalingsinfo')}`);
  }
  const sellerPayout = sellerPayoutRes.data as any;
  const sellerBank = String(sellerPayout?.payout_bank_account || '').trim();
  const sellerVipps = String(sellerPayout?.payout_vipps || '').trim();
  const sellerUsdt = String(sellerPayout?.payout_usdt_trc20 || '').trim();
  const hasMethod =
    (paymentMethod === 'bank' && Boolean(sellerBank)) ||
    (paymentMethod === 'vipps' && Boolean(sellerVipps)) ||
    (paymentMethod === 'usdt_trc20' && Boolean(sellerUsdt));
  if (!hasMethod) {
    return redirect(
      `/aksjer/sell?error=${encodeURIComponent(
        'Selger har ikke registrert denne betalingsmetoden. Velg en annen eller be selger oppdatere profilen sin.'
      )}`
    );
  }

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
  await requireStockAdmin();
  const admin = createAdminClient();

  const expectedPassword = process.env.STOCK_ADMIN_DANGER_PASSWORD || '';
  if (!expectedPassword) {
    redirect('/aksjer/admin?error=Admin-passord%20er%20ikke%20konfigurert');
  }

  const adminPassword = String(formData.get('adminPassword') || '');
  if (adminPassword !== expectedPassword) {
    redirect('/aksjer/admin?error=Feil%20admin-passord');
  }

  const confirmPhrase = String(formData.get('confirmPhrase') || '').trim().toUpperCase();
  if (confirmPhrase !== 'RESET') {
    redirect('/aksjer/admin?error=Du%20m%C3%A5%20skrive%20RESET%20for%20%C3%A5%20bekrefte');
  }

  const confirmReset = String(formData.get('confirmReset') || '') === 'on';
  if (!confirmReset) {
    redirect('/aksjer/admin?error=Du%20m%C3%A5%20bekrefte%20reset');
  }

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

  const { data: currentActive, error: activeErr } = await admin
    .from('stock_offerings')
    .select('id, price_per_share')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeErr) {
    const raw = activeErr.message || 'Kunne ikke lese emisjon';
    const msg = encodeURIComponent(raw.includes('does not exist') ? 'Database%20mangler%20migrasjon%20for%20aksjer' : raw);
    redirect(`/aksjer/admin?error=${msg}`);
  }

  if (currentActive?.id) {
    if (Number(currentActive.price_per_share || 0) !== pricePerShare) {
      redirect('/aksjer/admin?error=Deaktiver%20emisjonen%20f%C3%B8rst%20for%20%C3%A5%20endre%20pris');
    }
    const { error: updErr } = await admin
      .from('stock_offerings')
      .update({ active, available_shares: availableShares })
      .eq('id', currentActive.id);
    if (updErr) {
      redirect(`/aksjer/admin?error=${encodeURIComponent(updErr.message || 'Kunne ikke oppdatere emisjon')}`);
    }
  } else {
    if (active) {
      const { error: deactivateError } = await admin.from('stock_offerings').update({ active: false }).eq('active', true);
      if (deactivateError) {
        const msg = encodeURIComponent(deactivateError.message || 'Kunne ikke deaktivere eksisterende emisjon');
        redirect(`/aksjer/admin?error=${msg}`);
      }
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
  }

  revalidatePath('/aksjer/buy');
  revalidatePath('/aksjer/admin');
  redirect('/aksjer/admin?ok=1');
}

export async function adminUpdateCompanyInfo(formData: FormData) {
  await requireStockAdmin();
  const admin = createAdminClient();

  const companyName = String(formData.get('companyName') || '').trim() || 'AI Innovate AS';
  const orgnr = String(formData.get('orgnr') || '').trim() || null;
  const incorporationDate = String(formData.get('incorporationDate') || '').trim() || null;
  const shareCapitalRaw = String(formData.get('shareCapital') || '').trim();
  const parValueRaw = String(formData.get('parValue') || '').trim();

  const shareCapital = shareCapitalRaw ? Number(shareCapitalRaw) : null;
  const parValue = parValueRaw ? Number(parValueRaw) : null;

  if (orgnr && !/^\d{9}$/.test(orgnr)) {
    redirect('/aksjer/admin?error=Ugyldig%20orgnr');
  }
  if (shareCapital !== null && (!Number.isFinite(shareCapital) || shareCapital < 0)) {
    redirect('/aksjer/admin?error=Ugyldig%20aksjekapital');
  }
  if (parValue !== null && (!Number.isFinite(parValue) || parValue < 0)) {
    redirect('/aksjer/admin?error=Ugyldig%20p%C3%A5lydende');
  }

  const payload: any = {
    id: 1,
    company_name: companyName,
    orgnr,
    share_capital: shareCapital,
    par_value: parValue,
  };
  if (incorporationDate) payload.incorporation_date = incorporationDate;

  const { error } = await admin.from('stock_company_info').upsert(payload, { onConflict: 'id' });
  if (error) {
    redirect(`/aksjer/admin?error=${encodeURIComponent(error.message || 'Kunne ikke lagre selskapsinfo')}`);
  }

  revalidatePath('/aksjer/admin');
  redirect('/aksjer/admin?ok=1');
}

export async function adminRebuildShareLots() {
  const adminUser = await requireStockAdmin();
  const admin = createAdminClient();
  const ip = getClientIp();

  const { error } = await admin.rpc('stock_admin_rebuild_share_lots', { admin_user_id: adminUser.id, admin_ip: ip });
  if (error) {
    redirect(`/aksjer/admin?error=${encodeURIComponent(error.message || 'Kunne ikke gjenoppbygge aksjenummer')}`);
  }

  revalidatePath('/aksjer/admin');
  revalidatePath('/aksjer/admin/print');
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

export async function adminUpdateShareholder(formData: FormData) {
  await requireStockAdmin();
  const admin = createAdminClient();

  const shareholderId = String(formData.get('shareholderId') || '');
  if (!shareholderId) redirect('/aksjer/admin?error=Mangler%20aksjon%C3%A6r-ID');

  const entityType = String(formData.get('entityType') || 'unknown');
  const birthDate = String(formData.get('birthDate') || '').trim() || null;
  const nationalId = String(formData.get('nationalId') || '').trim() || null;
  const orgnr = String(formData.get('orgnr') || '').trim() || null;
  const addressLine1 = String(formData.get('addressLine1') || '').trim() || null;
  const addressLine2 = String(formData.get('addressLine2') || '').trim() || null;
  const postalCode = String(formData.get('postalCode') || '').trim() || null;
  const city = String(formData.get('city') || '').trim() || null;
  const country = String(formData.get('country') || '').trim() || 'NO';
  const payoutBankAccount = String(formData.get('payoutBankAccount') || '').trim() || null;
  const payoutVipps = String(formData.get('payoutVipps') || '').trim() || null;
  const payoutUsdtTrc20 = String(formData.get('payoutUsdtTrc20') || '').trim() || null;

  if (!['unknown', 'person', 'company'].includes(entityType)) {
    redirect('/aksjer/admin?error=Ugyldig%20type');
  }
  if (nationalId && !/^\d{11}$/.test(nationalId)) {
    redirect('/aksjer/admin?error=Ugyldig%20f%C3%B8dselsnummer');
  }
  if (orgnr && !/^\d{9}$/.test(orgnr)) {
    redirect('/aksjer/admin?error=Ugyldig%20orgnr');
  }
  if (postalCode && !/^\d{4}$/.test(postalCode)) {
    redirect('/aksjer/admin?error=Ugyldig%20postnr');
  }
  if (payoutBankAccount && !/^[0-9 ]+$/.test(payoutBankAccount)) {
    redirect('/aksjer/admin?error=Ugyldig%20kontonummer');
  }
  if (payoutVipps && !/^[0-9+ ]+$/.test(payoutVipps)) {
    redirect('/aksjer/admin?error=Ugyldig%20Vipps');
  }

  const { error } = await admin
    .from('shareholders')
    .update({
      entity_type: entityType,
      birth_date: birthDate,
      national_id: nationalId,
      orgnr,
      address_line1: addressLine1,
      address_line2: addressLine2,
      postal_code: postalCode,
      city,
      country,
      payout_bank_account: payoutBankAccount,
      payout_vipps: payoutVipps,
      payout_usdt_trc20: payoutUsdtTrc20,
    })
    .eq('id', shareholderId);

  if (error) {
    redirect(`/aksjer/admin?error=${encodeURIComponent(error.message || 'Kunne ikke lagre aksjon%C3%A6r')}`);
  }

  revalidatePath('/aksjer/admin');
  revalidatePath('/aksjer/admin/print');
  redirect(`/aksjer/admin/shareholders/${shareholderId}?ok=1`);
}

export async function updateMyShareholder(formData: FormData) {
  const user = await requireUser();
  const admin = createAdminClient();

  await ensureShareholderForUser(admin, user.id);

  const entityType = String(formData.get('entityType') || 'unknown');
  const birthDate = String(formData.get('birthDate') || '').trim() || null;
  const nationalId = String(formData.get('nationalId') || '').trim() || null;
  const orgnr = String(formData.get('orgnr') || '').trim() || null;
  const addressLine1 = String(formData.get('addressLine1') || '').trim() || null;
  const addressLine2 = String(formData.get('addressLine2') || '').trim() || null;
  const postalCode = String(formData.get('postalCode') || '').trim() || null;
  const city = String(formData.get('city') || '').trim() || null;
  const country = String(formData.get('country') || '').trim() || 'NO';
  const payoutBankAccount = String(formData.get('payoutBankAccount') || '').trim() || null;
  const payoutVipps = String(formData.get('payoutVipps') || '').trim() || null;
  const payoutUsdtTrc20 = String(formData.get('payoutUsdtTrc20') || '').trim() || null;
  const nextPath = String(formData.get('next') || '').trim();

  if (!['unknown', 'person', 'company'].includes(entityType)) {
    redirect('/aksjer/profile?error=Ugyldig%20type');
  }
  if (nationalId && !/^\d{11}$/.test(nationalId)) {
    redirect('/aksjer/profile?error=Ugyldig%20f%C3%B8dselsnummer');
  }
  if (orgnr && !/^\d{9}$/.test(orgnr)) {
    redirect('/aksjer/profile?error=Ugyldig%20orgnr');
  }
  if (postalCode && !/^\d{4}$/.test(postalCode)) {
    redirect('/aksjer/profile?error=Ugyldig%20postnr');
  }
  if (payoutBankAccount && !/^[0-9 ]+$/.test(payoutBankAccount)) {
    redirect('/aksjer/profile?error=Ugyldig%20kontonummer');
  }
  if (payoutVipps && !/^[0-9+ ]+$/.test(payoutVipps)) {
    redirect('/aksjer/profile?error=Ugyldig%20Vipps');
  }

  const { error } = await admin
    .from('shareholders')
    .update({
      entity_type: entityType,
      birth_date: birthDate,
      national_id: nationalId,
      orgnr,
      address_line1: addressLine1,
      address_line2: addressLine2,
      postal_code: postalCode,
      city,
      country,
      payout_bank_account: payoutBankAccount,
      payout_vipps: payoutVipps,
      payout_usdt_trc20: payoutUsdtTrc20,
    })
    .eq('user_id', user.id);

  if (error) {
    const msg = encodeURIComponent(error.message || 'Kunne ikke lagre profil');
    redirect(`/aksjer/profile?error=${msg}`);
  }

  revalidatePath('/aksjer/dashboard');
  const target = nextPath && nextPath.startsWith('/aksjer/') ? nextPath : '/aksjer/dashboard';
  redirect(`${target}?ok=1`);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/aksjer/signin');
}
