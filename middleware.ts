import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    ''
  const host = rawHost.split(',')[0]?.trim().split(':')[0]?.toLowerCase() || ''
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  const isStagingHost = isLocalhost || host === 'staging.lekbie.no' || host.startsWith('staging.')
  const isStockHost = host === 'aksjer.lekbie.no' || host.startsWith('aksjer.')
  const isAdminHost = host === 'admin.lekbie.no' || host.startsWith('admin.')
  const isMattilsynetHost =
    host === 'mattilsynet.lekbie.no' || host.startsWith('mattilsynet.')

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

  const isTemadagPath =
    pathname === '/dashboard/admin/temadag' || pathname.startsWith('/dashboard/admin/temadag/')
  const isDemoApiPath = pathname === '/api/demo' || pathname.startsWith('/api/demo/')

  if ((isTemadagPath || isDemoApiPath) && !isStagingHost) {
    if (isDemoApiPath) {
      return NextResponse.json({ success: false, error: 'Not available' }, { status: 404 })
    }

    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = '/_not-found'
    rewriteUrl.search = ''
    return NextResponse.rewrite(rewriteUrl)
  }

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

  if (isAdminHost) {
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return response
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return response

    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`
    return NextResponse.rewrite(rewriteUrl)
  }

  if (isMattilsynetHost) {
    if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return response
    if (pathname === '/mattilsynet' || pathname.startsWith('/mattilsynet/')) return response

    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = pathname === '/' ? '/mattilsynet' : `/mattilsynet${pathname}`
    return NextResponse.rewrite(rewriteUrl)
  }

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

  const protectedPrefixes = [
    '/dashboard',
    '/apiaries',
    '/hives',
    '/settings',
    '/network',
    '/wallet',
    '/missions',
    '/referater',
    '/archive',
    '/scan',
    '/shop',
    '/honey-exchange',
  ]
  const isProtectedPath = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if (isProtectedPath) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/signin'
      redirectUrl.search = ''
      const requestedPath = `${pathname}${request.nextUrl.search || ''}`
      redirectUrl.searchParams.set('next', requestedPath)

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
