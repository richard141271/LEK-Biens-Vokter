'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signup(formData: any) {
  const supabase = createClient()
  const origin = headers().get('origin')

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

  // 1. Sign Up User
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (authError) {
    console.error('Signup error:', authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Noe gikk galt under registrering (ingen bruker opprettet)' }
  }

  // 2. Create Profile (using Admin Client to bypass RLS)
  // This ensures profile is created even if email verification is pending
  const adminClient = createAdminClient()
  
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({
      id: authData.user.id,
      role: role || 'beekeeper',
      full_name: fullName,
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
    // If profile creation fails, we might want to clean up the user?
    // Or just return error.
    return { error: 'Bruker opprettet, men profilfeil: ' + profileError.message }
  }

  return { success: true, user: authData.user }
}
