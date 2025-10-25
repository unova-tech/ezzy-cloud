import { autumn } from "autumn-js/better-auth"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import {
  admin,
  apiKey,
  captcha,
  emailOTP,
  haveIBeenPwned,
  lastLoginMethod,
  mcp,
  oneTap,
  organization,
  phoneNumber,
  twoFactor
} from "better-auth/plugins"
import { passkey } from "better-auth/plugins/passkey"
import { emailHarmony, phoneHarmony } from "better-auth-harmony"
import { localization } from "better-auth-localization"
import config from "../../web/src/lib/config"
import publicConfig from "../../web/src/lib/public-config"
import db from "../database"

export const auth = betterAuth({
  baseURL: publicConfig.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg"
  }),
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, type, otp }) => {
        console.log(`Send OTP ${otp} to user ${email} for ${type}.`)
      },
      disableSignUp: true,
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true
    }),
    haveIBeenPwned(),
    lastLoginMethod(),
    admin(),
    organization(),
    apiKey(),
    phoneNumber(),
    twoFactor(),
    passkey(),
    oneTap(),
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: config.TURNSTILE_SECRET_KEY
    }),
    mcp({ loginPage: "/login" }),
    autumn({
      secretKey: config.AUTUMN_SECRET_KEY
    }),
    emailHarmony({ allowNormalizedSignin: true }),
    phoneHarmony(),
    localization({
      defaultLocale: "pt-BR",
      fallbackLocale: "default"
    })
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  socialProviders: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET
    }
  }
})
