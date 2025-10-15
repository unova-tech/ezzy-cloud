import { readFile } from "node:fs/promises"
import { Resend } from "resend"
import db from "@/backend/database"
import WelcomeEmail from "@/emails/welcome"
import config from "@/lib/config"

const resend = new Resend(config.RESEND_API_KEY)

const content = await readFile(
  "./personal-links-cmgmijldy1gwzad01gcf8ys9g-1760509071573.csv",
  "utf-8"
)
const lines = content.split("\n").slice(1)

const data = lines.map((line) => {
  const [_formid, _userid, _firstname, _lastname, email, personalLink] =
    line.split(",")
  return {
    email: email.replace(/"/g, ""),
    personalLink: personalLink.replace(/"/g, "")
  }
})

for (const { email, personalLink } of data) {
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email)
  })
  if (user) {
    await resend.emails.send({
      from: `Ezzy Cloud <${config.MAIL_FROM}>`,
      subject: "Bem-vindo à Ezzy Cloud!",
      to: email,
      react: await WelcomeEmail({
        formLink: personalLink,
        referralCode: user.referralCode,
        locale: "pt-br"
      })
    })
  }
}
