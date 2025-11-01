"use client"

import { Loader2, MailCheck } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/lib/auth-client"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")

  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)

  // Redirect if no email provided
  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <Alert variant="destructive">
            <AlertDescription>
              Email address is missing. Please register again.
            </AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/register")}>
            Back to Register
          </Button>
        </div>
      </div>
    )
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("Verifying email with:", { email, code })

      const result = await authClient.emailOtp.verifyEmail({
        email: email,
        otp: code
      })

      console.log("Verify result:", result)

      if (result.error) {
        setError(result.error.message || "Failed to verify email")
        setIsLoading(false)
        return
      }

      // Redirect to workflows on success
      router.push("/workflows")
    } catch (err) {
      console.error("Verification error:", err)
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError("Email address is missing")
      return
    }

    setIsResending(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email,
        type: "email-verification"
      })

      if (result.error) {
        setError(result.error.message || "Failed to resend code")
      } else {
        setSuccess("Verification code sent! Check your email.")
      }
    } catch (err) {
      console.error("Resend error:", err)
      setError("Failed to resend verification code")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Verify your email</h1>
          <p className="mt-2 text-muted-foreground">
            We sent a verification code to{" "}
            <span className="font-medium">{email}</span>
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <AlertDescription className="text-green-800 dark:text-green-200">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              disabled={isLoading}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !code}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
