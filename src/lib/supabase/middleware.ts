/**
 * This middleware function synchronizes Supabase authentication sessions during a Next.js request.
 * 
 * - It creates a Supabase server client, configuring it to manage cookies based on the incoming Next.js request.
 * - The `getAll` and `setAll` cookie methods allow Supabase to update authentication cookies as needed.
 * - When Supabase wants to set cookies, this middleware updates both the request's cookies as well as those sent in the NextResponse.
 * - It then calls `supabase.auth.getClaims()` to refresh the session state without incurring extra database calls (per Supabase documentation).
 * - Finally, it returns a NextResponse instance that includes any new or updated cookies, keeping the user's auth session in sync.
 *
 * In short: This keeps Supabase JWT auth sessions up to date on server-side routes or middleware, so user authentication state is always current.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session; use getClaims() to avoid extra DB call (per Supabase docs).
  // Retrieve the user's authentication claims from the Supabase session. If claims exist, the user is logged in.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // Get the path of the current request, e.g., "/dashboard", "/login", etc.
  const pathname = request.nextUrl.pathname
  // Define some routes that should be accessible without authentication (public pages).
  const publicPaths = [
    '/',
    '/login', 
    '/signup', 
    '/auth/callback', 
    '/manifest.json', // Add this
    '/icons'          // Add this if your icons are in a folder
  ]

  // If there is NO user session and the current path is NOT public, redirect the user to the login page.
  if (!user && !publicPaths.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If a user IS logged in and tries to access the login or signup page, redirect them to the dashboard instead.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
