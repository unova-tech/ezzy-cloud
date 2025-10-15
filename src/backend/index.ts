import { logger } from "@bogeychan/elysia-logger"
import { serverTiming } from "@elysiajs/server-timing"
import { count, eq, sql } from "drizzle-orm"
import Elysia, { t } from "elysia"
import Mailchecker from "mailchecker"
import { customAlphabet } from "nanoid"
import { Resend } from "resend"
import { v7 as uuidv7 } from "uuid"
import WelcomeEmail from "@/emails/welcome"
import { defaultLanguage, type SupportedLanguages } from "@/i18n/languages"
import config from "@/lib/config"
import db, { users } from "./database"

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  12
)

const resend = new Resend(config.RESEND_API_KEY)

const MAX_USERS_PER_IP = 2

const waitlistCount = db
  .select({ count: count(users.id) })
  .from(users)
  .$withCache()
  .prepare("waitlistCount")

const usersExist = db
  .select({ exists: sql<number>`1` })
  .from(users)
  .where(eq(users.email, sql.placeholder("email")))
  .limit(1)
  .$withCache()
  .prepare("usersExist")

const checkIpUsage = db
  .select({ count: count(users.id) })
  .from(users)
  .where(eq(users.ipAddress, sql.placeholder("ip")))
  .limit(MAX_USERS_PER_IP)
  .$withCache()
  .prepare("checkIpUsage")

const app = new Elysia({ prefix: "/api" })
  .use(logger())
  .use(serverTiming())
  .derive(({ request, headers, server, cookie: { language } }) => ({
    ip:
      server?.requestIP?.(request) ??
      headers?.["x-forwarded-for"]?.trim() ??
      (config.NODE_ENV === "development" ? "127.0.0.1" : null),
    language:
      (language.value as SupportedLanguages | undefined) ?? defaultLanguage
  }))
  .get("/waitlist", async () => {
    const [{ count }] = await waitlistCount.execute()
    return { success: true, data: { count } }
  })
  .post(
    "/waitlist",
    async ({ body, ip, language }) => {
      const email = body.email.trim().toLowerCase()
      const referredByCode = body.referralCode?.trim()

      if (!Mailchecker.isValid(email)) {
        return { success: false, message: "Invalid email address" }
      }

      if (!ip) {
        return { success: false, message: "Unable to determine IP address" }
      }

      const userExists = await usersExist.execute({ email })

      if (userExists.length && userExists[0].exists) {
        return { success: true, message: "Email already registered" }
      }

      const [{ count: ipUsage = 0 } = { count: 0 }] =
        await checkIpUsage.execute({ ip })

      let referredBy: string | null = null

      if (referredByCode) {
        const [referrer] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.referralCode, referredByCode))
          .limit(1)

        if (referrer && Number(ipUsage) < MAX_USERS_PER_IP) {
          referredBy = referredByCode
        }
      }

      const referralCode = nanoid(12)

      const [createContactResult] = await Promise.allSettled([
        fetch("https://app.formbricks.com/api/v2/management/contacts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.FORMBRICKS_API_KEY
          },
          body: JSON.stringify({
            environmentId: "cmgmibobx1cyjad01zg07dlx1",
            attributes: { email }
          })
        }).then((res) => res.json() as Promise<{ data?: { id?: string } }>),
        db.insert(users).values({
          id: uuidv7(),
          email,
          referralCode,
          referredBy: referredBy ?? null,
          ipAddress: ip,
          language
        }),
        resend.contacts.create({
          email,
          unsubscribed: false,
          audienceId: "a3c32118-ed0b-4274-a424-31267026fd9b"
        })
      ])

      if (
        createContactResult.status === "rejected" ||
        !createContactResult.value?.data?.id
      ) {
        throw new Error("Contact ID is undefined")
      }

      const { data: surveyData } = await fetch(
        `https://app.formbricks.com/api/v2/management/surveys/cmgmijldy1gwzad01gcf8ys9g/contact-links/contacts/${createContactResult.value.data.id}/`,
        {
          headers: {
            "x-api-key": config.FORMBRICKS_API_KEY
          }
        }
      ).then((res) => res.json() as Promise<{ data?: { surveyUrl?: string } }>)

      if (!surveyData?.surveyUrl) {
        throw new Error("Personalized survey link is undefined")
      }

      await resend.emails.send({
        from: `Ezzy Cloud <${config.MAIL_FROM}>`,
        subject: "Bem-vindo à Ezzy Cloud!",
        to: email,
        react: await WelcomeEmail({
          formLink: surveyData.surveyUrl,
          referralCode,
          locale: language
        })
      })

      return {
        success: true
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        referralCode: t.Optional(t.String())
      })
    }
  )

export type App = typeof app

export default app
