'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function signup(formData: any) {
  const adminClient = createAdminClient()
  const supabase = createClient()
  const origin = headers().get('origin') || ''

  const {
    email,
    password,
    fullName,
    role,
    address,
    postalCode,
    city,
    phoneNumber,
    isNorgesBirokterlagMember,
    memberNumber,
    localAssociation,
    isLekHonningMember,
    interests,
    beekeepingType,
    companyName,
    orgNumber,
    companyBankAccount,
    companyAddress,
    privateBankAccount
  } = formData

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedFullName = String(fullName || '').trim()
  const normalizedPassword = String(password || '')

  const isStagingRequest =
    process.env.VERCEL_ENV === 'preview' ||
    origin.includes('staging.') ||
    origin.includes('localhost')

  const isEmailRateLimitError = (message: string) => {
    const m = (message || '').toLowerCase()
    return m.includes('email rate limit') || m.includes('over_email_send_rate_limit')
  }

  let userId: string | null = null
  let userEmail: string | null = normalizedEmail || null

  if (!isStagingRequest) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        data: { full_name: normalizedFullName },
        emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    })

    if (error) {
      if (!isEmailRateLimitError(error.message)) {
        console.error('Signup error:', error)
        return { error: error.message }
      }
    } else {
      userId = data.user?.id ?? null
      userEmail = data.user?.email ?? userEmail
    }
  }

  if (isStagingRequest || !userId) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: normalizedPassword,
      email_confirm: true,
      user_metadata: { full_name: normalizedFullName }
    })

    if (error) {
      console.error('Signup error:', error)
      return { error: error.message }
    }

    userId = data.user?.id ?? null
    userEmail = data.user?.email ?? userEmail
  }

  if (!userId) {
    return { error: 'Noe gikk galt under registrering (ingen bruker opprettet)' }
  }

  // 2. Create Profile (using Admin Client to bypass RLS)
  // This ensures profile is created even if email verification is pending
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: userId,
      role: role || 'beekeeper',
      full_name: normalizedFullName,
      address: address,
      postal_code: postalCode,
      city: city,
      phone_number: phoneNumber,
      is_norges_birokterlag_member: isNorgesBirokterlagMember || false,
      member_number: memberNumber || null,
      local_association: localAssociation || null,
      is_lek_honning_member: isLekHonningMember || false,
      interests: interests || [],
      beekeeping_type: beekeepingType || 'hobby',
      company_name: companyName || null,
      org_number: orgNumber || null,
      company_bank_account: companyBankAccount || null,
      company_address: companyAddress || null,
      private_bank_account: privateBankAccount || null
    })

  if (profileError) {
    console.error('Profile creation failed:', profileError)
    await adminClient.from('profiles').delete().eq('id', userId)
    await adminClient.auth.admin.deleteUser(userId)
    return { error: 'Bruker opprettet, men profilfeil: ' + profileError.message }
  }

  const { data: lekBeekeeper, error: beekeeperError } = await adminClient
    .from('lek_core_beekeepers')
    .insert({
      auth_user_id: userId,
      full_name: normalizedFullName,
      email: userEmail,
      phone_number: phoneNumber,
      address,
      postal_code: postalCode,
      city
    })
    .select('beekeeper_id')
    .single()

  if (beekeeperError || !lekBeekeeper) {
    console.error('LEK Core beekeeper creation failed:', beekeeperError)
    await adminClient.from('profiles').delete().eq('id', userId)
    await adminClient.auth.admin.deleteUser(userId)
    if (beekeeperError?.message?.includes("auth_user_id") && beekeeperError?.message?.includes('schema cache')) {
      return {
        error:
          "Staging-databasen mangler feltet 'auth_user_id' i LEK Core. Kjør DB-oppdatering (migration 66) i Supabase, og reload schema cache."
      }
    }
    return { error: 'Bruker opprettet, men LEK Core-birøkterfeil: ' + (beekeeperError?.message || 'Ukjent feil') }
  }

  const numericMember = (lekBeekeeper.beekeeper_id as string).replace(/^BR-/, '')

  await adminClient
    .from('profiles')
    .update({ member_number: numericMember })
    .eq('id', userId)

  return { success: true, user: { id: userId, email: userEmail } }
}
