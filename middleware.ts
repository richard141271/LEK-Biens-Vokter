import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const host = request.headers.get('host') || ''
  const isStockHost = host.toLowerCase().startsWith('aksjer.')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  const isAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/workbox-')

  if (isAsset) return response

  if (isStockHost) {
    if (pathname === '/signin' || pathname === '/') {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (pathname === '/signin' && user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/dashboard'
        redirectUrl.search = ''

        const redirectResponse = NextResponse.redirect(redirectUrl)
        for (const cookie of response.cookies.getAll()) {
          redirectResponse.cookies.set(cookie)
        }
        return redirectResponse
      }
    }

    if (pathname === '/aksjer' || pathname.startsWith('/aksjer/')) {
      const redirectUrl = request.nextUrl.clone()
      const nextPath = pathname.replace(/^\/aksjer/, '') || '/'
      redirectUrl.pathname = nextPath

      const redirectResponse = NextResponse.redirect(redirectUrl)
      for (const cookie of response.cookies.getAll()) {
        redirectResponse.cookies.set(cookie)
      }
      return redirectResponse
    }

    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = `/aksjer${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(rewriteUrl)
  }

  if (pathname === '/aksjer' || pathname.startsWith('/aksjer/')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    redirectUrl.search = ''
    const redirectResponse = NextResponse.redirect(redirectUrl)
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie)
    }
    return redirectResponse
  }

  if (pathname === '/' || pathname === '/signin') {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (pathname === '/') {
      const target = user ? '/dashboard' : '/signin'
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = target
      redirectUrl.search = ''

      const redirectResponse = NextResponse.redirect(redirectUrl)
      for (const cookie of response.cookies.getAll()) {
        redirectResponse.cookies.set(cookie)
      }
      return redirectResponse
    }

    if (pathname === '/signin' && user) {
      const nextParam = request.nextUrl.searchParams.get('next')
      const safeNext =
        nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null

      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = safeNext || '/dashboard'
      redirectUrl.search = ''

      const redirectResponse = NextResponse.redirect(redirectUrl)
      for (const cookie of response.cookies.getAll()) {
        redirectResponse.cookies.set(cookie)
      }
      return redirectResponse
    }
  }

  return response
}

export const config = {
  matcher: ['/:path*'],
}
