import { betterFetch } from "@better-fetch/fetch"
import type { Session } from "better-auth/types"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Import public config to get BETTER_AUTH_URL
// Note: We can't directly import from lib/public-config in middleware due to edge runtime
// So we'll read from env directly
const BETTER_AUTH_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL

/**
 * Middleware to protect routes requiring authentication.
 * Checks for valid session and redirects to login if not authenticated.
 */
export async function middleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: BETTER_AUTH_URL,
      headers: {
        // Forward the cookie header to the session endpoint
        cookie: request.headers.get("cookie") || ""
      }
    }
  )

  // If no session exists, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Allow the request to proceed
  return NextResponse.next()
}

/**
 * Configure which routes should be protected by this middleware.
 * Matches all routes under /dashboard and /create, excluding API routes.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api routes (API routes)
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. /login, /register, /verify-email, /forgot-password, /reset-password (public auth pages)
     * 6. Static files (*.ico, *.png, *.svg, *.jpg, *.jpeg, *.gif, *.webp, *.woff, *.woff2, *.ttf, *.otf, *.eot)
     */
    "/((?!api|_next|_static|_vercel|login|register|verify-email|forgot-password|reset-password|.*\\..*).*)"
  ]
}
