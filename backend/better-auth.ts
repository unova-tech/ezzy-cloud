import Elysia from "elysia"
import { auth } from "./lib/auth"

/**
 * Better Auth Plugin for Elysia - Root level with handler mounting
 *
 * This plugin mounts the Better Auth handler and provides an 'auth' macro
 * for protecting routes. Use this ONLY at the app root level.
 *
 * Example:
 * ```ts
 * new Elysia()
 *   .use(betterAuthPlugin)
 * ```
 */
export const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({
          headers
        })
        if (!session) return status(401)
        return {
          user: session.user,
          session: session.session
        }
      }
    }
  })

/**
 * Auth Macro Plugin - Lightweight plugin for modules
 *
 * This plugin provides only the auth macro without mounting the handler.
 * Use this in modules that need authentication but shouldn't re-mount the auth handler.
 *
 * Example:
 * ```ts
 * new Elysia()
 *   .use(authMacroPlugin)
 *   .get('/protected', ({ user }) => user, { auth: true })
 * ```
 */
export const authMacroPlugin = new Elysia({ name: "auth-macro" }).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const session = await auth.api.getSession({
        headers
      })
      if (!session) return status(401)
      return {
        user: session.user,
        session: session.session
      }
    }
  }
})

// Export auth instance for use in other modules
export { auth }
