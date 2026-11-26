'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value || '').trim().toLowerCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value || '')
  return next.startsWith('/') && !next.startsWith('//') ? next : null
}

function signInPath(error: string, next: string | null) {
  const query = new URLSearchParams({ error })
  if (next) query.set('next', next)
  return `/signin?${query.toString()}`
}

function requestOrigin() {
  const requestHeaders = headers()
  const origin = requestHeaders.get('origin')
  if (origin) return origin.replace(/\/$/, '')

  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host')
  const protocol = requestHeaders.get('x-forwarded-proto') || 'https'
  return host ? `${protocol}://${host}` : ''
}

export async function signIn(formData: FormData) {
  if (formData.get('intent') === 'send-link') {
    return sendSignInLink(formData)
  }

  const email = normalizeEmail(formData.get('email'))
  const password = String(formData.get('password') || '')
  const next = safeNext(formData.get('next'))

  if (!isValidEmail(email) || !password) redirect(signInPath('login-error', next))
  if (email.endsWith('@gmail.no')) redirect(signInPath('gmail-address', next))

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('invalid login credentials')) {
      redirect(signInPath('invalid-login', next))
    }
    if (message.includes('email not confirmed')) {
      redirect(signInPath('email-not-confirmed', next))
    }
    redirect(signInPath('login-error', next))
  }

  redirect(next || '/dashboard')
}

async function sendSignInLink(formData: FormData) {
  const email = normalizeEmail(formData.get('email'))
  const next = safeNext(formData.get('next'))

  if (!isValidEmail(email)) redirect(signInPath('link-error', next))
  if (email.endsWith('@gmail.no')) redirect(signInPath('gmail-address', next))

  const origin = requestOrigin()
  if (!origin) redirect(signInPath('link-error', next))

  const emailRedirectTo = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  })

  redirect(signInPath(error ? 'link-error' : 'link-sent', next))
}
