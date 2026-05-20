export function getAuthCallbackUrl(next = '/dashboard') {
  const url = new URL('/auth/callback', window.location.origin)
  url.searchParams.set('next', next)
  return url.toString()
}
