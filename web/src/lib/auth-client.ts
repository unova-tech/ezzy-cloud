import {
  adminClient,
  apiKeyClient,
  emailOTPClient,
  lastLoginMethodClient,
  oneTapClient,
  organizationClient,
  passkeyClient,
  phoneNumberClient,
  twoFactorClient
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import publicConfig from "./public-config"

const plugins = [
  emailOTPClient(),
  adminClient(),
  organizationClient(),
  apiKeyClient(),
  twoFactorClient(),
  phoneNumberClient(),
  passkeyClient(),
  lastLoginMethodClient()
]

// Only add oneTapClient if Google Client ID is configured
if (publicConfig.GOOGLE_CLIENT_ID) {
  plugins.push(
    oneTapClient({
      clientId: publicConfig.GOOGLE_CLIENT_ID,
      autoSelect: false,
      cancelOnTapOutside: true,
      context: "signin",
      promptOptions: {
        baseDelay: 1000,
        maxAttempts: 5
      }
    })
  )
}

export const authClient = createAuthClient({
  baseURL: publicConfig.BETTER_AUTH_URL,
  plugins
})

export const { signIn, signUp, signOut, useSession } = authClient
