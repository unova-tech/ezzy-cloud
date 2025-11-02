import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Import public config to get BETTER_AUTH_URL
// Note: We use native fetch in middleware due to edge runtime limitations
// Eden Treaty is not fully compatible with edge runtime
const BETTER_AUTH_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL

/**
 * Middleware to protect routes requiring authentication.
 * Checks for valid session and redirects to login if not authenticated.
 */
export async function proxy(request: NextRequest) {
  try {
    // Use native fetch instead of Eden Treaty due to edge runtime limitations
    const response = await fetch(`${BETTER_AUTH_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        // Forward the cookie header to the session endpoint
        'cookie': request.headers.get("cookie") || "",
        'content-type': 'application/json'
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const session = await response.json()

    // If no session exists, redirect to login
    if (!session || !session.user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Allow the request to proceed
    return NextResponse.next()
  } catch (error) {
    // On error, redirect to login for safety
    console.error('Session check error:', error)
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

/**
 * Configure which routes should be protected by this middleware.
 * Matches all routes under /workflows, excluding API routes.
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
