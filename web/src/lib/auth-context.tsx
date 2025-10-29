"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSession, authClient } from "@/lib/auth-client"
import type { Session } from "better-auth/types"

interface AuthContextType {
  session: Session | null
  isLoading: boolean
  user: Session["user"] | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Provider component that wraps the app to provide authentication context.
 * Uses Better Auth's useSession hook to manage session state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login")
        }
      }
    })
  }

  const value: AuthContextType = {
    session: session ?? null,
    isLoading: isPending,
    user: session?.user ?? null,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access authentication context.
 * Must be used within an AuthProvider.
 * 
 * @returns Authentication state including session, user, loading state, and signOut function
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * ```tsx
 * const { user, isLoading, signOut } = useAuth()
 * 
 * if (isLoading) return <div>Loading...</div>
 * if (!user) return <div>Not authenticated</div>
 * 
 * return (
 *   <div>
 *     <p>Welcome, {user.name}!</p>
 *     <button onClick={signOut}>Logout</button>
 *   </div>
 * )
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}