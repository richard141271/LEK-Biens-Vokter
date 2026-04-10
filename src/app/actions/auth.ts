'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function signup(formData: any) {
  const adminClient = createAdminClient()

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

  const userId = data.user?.id ?? null
  const userEmail = data.user?.email ?? normalizedEmail ?? null

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
    return { error: 'Bruker opprettet, men LEK Core-birøkterfeil: ' + (beekeeperError?.message || 'Ukjent feil') }
  }

  const numericMember = (lekBeekeeper.beekeeper_id as string).replace(/^BR-/, '')

  await adminClient
    .from('profiles')
    .update({ member_number: numericMember })
    .eq('id', userId)

  return { success: true, user: { id: userId, email: userEmail } }
}
