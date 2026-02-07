import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - manifest.json, sw.js, workbox-*.js (PWA files)
     * - favicon.ico, images
     */
    '/((?!_next/static|_next/image|manifest.json|sw.js|workbox-.*\\.js|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}