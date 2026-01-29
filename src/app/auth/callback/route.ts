import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Parse the current request URL to extract query parameters.
  const { searchParams } = new URL(request.url)
  // The "code" parameter is required for exchanging for a session.
  const code = searchParams.get('code')
  // The "next" parameter determines where to redirect after authentication succeeds;
  // defaults to "/set-password" if not provided.
  const next = searchParams.get('next') ?? '/set-password'

  if (code) {
    const response = NextResponse.redirect(new URL(next, request.url))
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
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return response
    }
  }

  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('error', 'auth_callback_failed')
  return NextResponse.redirect(url)
}
