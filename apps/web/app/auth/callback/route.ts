import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getSafeNext(searchParams: URLSearchParams) {
  const next = searchParams.get('next') ?? '/dashboard'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}

function getRedirectOrigin(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'

  if (process.env.NODE_ENV !== 'development' && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return requestUrl.origin
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function ensureProfile(supabase: SupabaseClient, user: User) {
  const metadata = user.user_metadata as Record<string, unknown>
  const email = user.email ?? readString(metadata.email)
  const fullName =
    readString(metadata.full_name) ??
    readString(metadata.name) ??
    readString(metadata.fullName)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError

  if (!profile) {
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      email,
      full_name: fullName,
      metadata: {},
    })
    if (error) throw error
    return
  }

  if (!profile.full_name && fullName) {
    const updates: { full_name: string; email?: string } = { full_name: fullName }
    if (email) updates.email = email

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (error) throw error
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = getSafeNext(requestUrl.searchParams)
  const redirectOrigin = getRedirectOrigin(request)

  if (!code) {
    return NextResponse.redirect(`${redirectOrigin}/login`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${redirectOrigin}/login`)
  }

  if (!data.user) {
    throw new Error('Authenticated user was not found after callback')
  }

  await ensureProfile(supabase, data.user)

  return NextResponse.redirect(`${redirectOrigin}${next}`)
}
