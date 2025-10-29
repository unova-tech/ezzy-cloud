# Authentication Documentation

## Overview

Ezzy Cloud uses [Better Auth](https://better-auth.com) v1 for a comprehensive authentication system with support for multiple authentication methods, organizations, API keys, and advanced security features.

## Features

### Authentication Methods
- **Email & Password**: Traditional credential-based authentication
- **OAuth Providers**: Google OAuth integration (extensible for more providers)
- **Email OTP**: One-time password verification for passwordless login
- **Passkeys**: WebAuthn/FIDO2 passwordless authentication
- **Phone Number**: SMS-based authentication (with Harmony plugin)

### Security Features
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA for enhanced security
- **Turnstile CAPTCHA**: Cloudflare Turnstile integration to prevent bots
- **Password Reset**: Secure password recovery flow
- **Email Verification**: Email confirmation for new accounts
- **Session Management**: Secure httpOnly cookie-based sessions

### Organization Management
- **Multi-tenant Support**: Organizations with role-based access
- **Team Collaboration**: Invite members to organizations
- **Role-based Permissions**: Admin, member, and custom roles

### Developer Features
- **API Keys**: Generate API keys for programmatic access
- **Admin Panel**: Built-in admin capabilities
- **MCP Integration**: Model Context Protocol server support
- **Localization**: Multi-language support with Harmony plugin

## Architecture

### Backend (Elysia)

#### Auth Plugin
The authentication is implemented as an Elysia plugin (`backend/better-auth.ts`):

```typescript
export const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers })
        if (!session) return status(401)
        return { user: session.user, session: session.session }
      }
    }
  })
```

This plugin provides:
- **Route mounting**: Mounts Better Auth endpoints at `/api/auth/*`
- **Auth macro**: Decorator for protecting routes with `{ auth: true }`
- **Session resolution**: Extracts user and session from request headers

#### Protected Routes
All API routes are protected using the auth plugin. Example from workflows module:

```typescript
export const workflowsModule = new Elysia({ prefix: "/workflows" })
  .use(betterAuthPlugin)
  .get("/", async ({ user }) => {
    // user.id is automatically available from auth context
    const workflows = await db
      .select()
      .from(workflows)
      .where(eq(workflows.userId, user.id))
    
    return { success: true, workflows }
  }, { auth: true })
```

**Key Points:**
- Import `betterAuthPlugin` from `../better-auth`
- Call `.use(betterAuthPlugin)` on the module
- Add `{ auth: true }` option to route configuration
- Access authenticated user via `{ user }` in handler parameters
- Remove `userId` from query parameters - it's extracted from session

### Frontend (Next.js 15)

#### Middleware Protection
Next.js middleware (`web/src/middleware.ts`) protects routes:

```typescript
export async function middleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  )

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}
```

The middleware:
- Runs on all routes except `/api`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, and static files
- Checks for valid session by calling Better Auth's get-session endpoint
- Redirects to `/login` if no session exists

#### Auth Context
React context provides authentication state throughout the app:

```typescript
// web/src/lib/auth-context.tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  
  return (
    <AuthContext.Provider value={{
      session: session ?? null,
      isLoading: isPending,
      user: session?.user ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
```

Usage in components:

```typescript
const { user, isLoading } = useAuth()

if (isLoading) return <LoadingSpinner />
if (!user) return <div>Not authenticated</div>

return <div>Welcome, {user.name}!</div>
```

#### Protected Routes Layout
Routes under `(app)` directory are automatically protected:

```typescript
// web/src/app/(app)/layout.tsx
export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) return <LoadingSpinner />
  if (!user) return null

  return <>{children}</>
}
```

## Setup Guide

### Environment Variables

Add these to your `.env` file:

```bash
# Better Auth Configuration
BETTER_AUTH_SECRET="your-random-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"

# Turnstile CAPTCHA
TURNSTILE_SECRET_KEY="your-turnstile-secret"
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-turnstile-site-key"

# Secrets Management
SECRETS_MASTER_KEY="your-encryption-key"
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env`

### Turnstile CAPTCHA Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Turnstile
3. Create a new site
4. Copy Site Key and Secret Key to `.env`

### Database Migration

The authentication schema is already migrated. Tables include:
- `user`: User accounts with email, name, password hash
- `session`: Active sessions
- `account`: OAuth provider accounts
- `verification`: Email/phone verification tokens
- `organization`: Organizations for multi-tenancy
- `member`: Organization memberships
- `invitation`: Pending organization invites
- `apikey`: API keys for programmatic access
- `twoFactor`: 2FA settings
- `passkey`: WebAuthn passkeys
- `oauthApplication`: Custom OAuth apps
- `oauthAccessToken`: OAuth tokens
- `oauthConsent`: OAuth consent records

## Usage Examples

### Backend Route Protection

```typescript
// Protect a route
.get("/protected", async ({ user }) => {
  return { message: `Hello, ${user.name}!` }
}, { auth: true })

// Access user ID in protected route
.post("/workflows", async ({ body, user }) => {
  const workflow = await db.insert(workflows).values({
    userId: user.id,  // Automatically from session
    name: body.name,
    // ...
  })
  return { success: true, workflow }
}, { auth: true })
```

### Frontend Authentication

#### Sign Up

```typescript
import { signUp } from "@/lib/auth-client"

const result = await signUp.email({
  name: "John Doe",
  email: "john@example.com",
  password: "SecurePass123",
})

if (result.error) {
  console.error(result.error.message)
} else {
  router.push("/verify-email")
}
```

#### Sign In

```typescript
import { signIn } from "@/lib/auth-client"

// Email/Password
const result = await signIn.email({
  email: "john@example.com",
  password: "SecurePass123",
})

// Google OAuth
await signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
})
```

#### Sign Out

```typescript
import { signOut } from "@/lib/auth-client"

await signOut()
router.push("/login")
```

#### Access User in Components

```typescript
import { useAuth } from "@/lib/auth-context"

function MyComponent() {
  const { user, isLoading } = useAuth()
  
  if (isLoading) return <div>Loading...</div>
  
  return <div>Welcome, {user?.name}!</div>
}
```

#### API Calls from Frontend

```typescript
// No need to pass userId in fetch calls
const response = await fetch("/api/workflows", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "My Workflow",
    // userId is extracted from session automatically
  }),
})
```

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files. Use `.env.example` as template.
2. **Secrets Rotation**: Rotate `BETTER_AUTH_SECRET` and `SECRETS_MASTER_KEY` periodically.
3. **HTTPS in Production**: Always use HTTPS in production. Update `BETTER_AUTH_URL` accordingly.
4. **CAPTCHA**: Enable Turnstile on production to prevent automated attacks.
5. **Rate Limiting**: Consider adding rate limiting to auth endpoints.
6. **Session Duration**: Configure appropriate session timeout in Better Auth config.
7. **2FA**: Encourage users to enable 2FA for sensitive operations.

## Troubleshooting

### "Unauthorized" errors
- Check if route has `{ auth: true }` option
- Verify session cookie is being sent with requests
- Ensure `BETTER_AUTH_URL` matches your app URL

### OAuth redirect issues
- Verify redirect URIs in provider console match your app
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Ensure `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set for frontend

### Session not persisting
- Check cookie settings in Better Auth config
- Verify `httpOnly` cookies are enabled
- Ensure same-site policy is appropriate for your setup

### Email verification not working
- Verify email service is configured (Resend)
- Check `RESEND_API_KEY` is set
- Confirm `MAIL_FROM` address is valid

## API Reference

### Backend Auth Endpoints

All endpoints are mounted at `/api/auth/*`:

- `POST /api/auth/sign-up/email` - Email/password registration
- `POST /api/auth/sign-in/email` - Email/password login
- `POST /api/auth/sign-out` - Sign out current session
- `GET /api/auth/get-session` - Get current session
- `POST /api/auth/forget-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/verify-email` - Verify email with OTP
- `POST /api/auth/send-verification-otp` - Send verification code
- `GET /api/auth/callback/google` - Google OAuth callback

See [Better Auth documentation](https://better-auth.com) for complete API reference.

## Further Reading

- [Better Auth Official Docs](https://better-auth.com)
- [Elysia Documentation](https://elysiajs.com)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [WebAuthn Guide](https://webauthn.guide/)
