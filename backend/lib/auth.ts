// import { autumn } from "autumn-js/better-auth"
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
import { Resend } from "resend"
import config from "../../web/src/lib/config"
import publicConfig from "../../web/src/lib/public-config"
import db from "../database"

const resend = new Resend(process.env.RESEND_API_KEY)

export const auth = betterAuth({
  baseURL: publicConfig.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg"
  }),
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, type, otp }) => {
        console.log(`Sending OTP ${otp} to user ${email} for ${type}`)

        try {
          await resend.emails.send({
            from: process.env.MAIL_FROM || "Ezzy Cloud <noreply@ezzycloud.com>",
            to: email,
            subject:
              type === "sign-in"
                ? "Sign in to Ezzy Cloud"
                : "Verify your email",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Your verification code</h2>
                <p>Use the following code to ${type === "sign-in" ? "sign in" : "verify your email"}:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                  ${otp}
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, you can safely ignore this email.</p>
              </div>
            `
          })

          console.log(`OTP email sent successfully to ${email}`)
        } catch (error) {
          console.error("Failed to send OTP email:", error)
          throw new Error("Failed to send verification email")
        }
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
    /*
    autumn({
      secretKey: config.AUTUMN_SECRET_KEY
    }),
    */
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
