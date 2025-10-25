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

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    adminClient(),
    organizationClient(),
    apiKeyClient(),
    twoFactorClient(),
    phoneNumberClient(),
    passkeyClient(),
    lastLoginMethodClient(),
    oneTapClient({
      clientId: "YOUR_CLIENT_ID",
      autoSelect: false,
      cancelOnTapOutside: true,
      context: "signin",
      promptOptions: {
        baseDelay: 1000,
        maxAttempts: 5
      }
    })
  ]
})
