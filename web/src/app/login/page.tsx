"use client"

import { valibotResolver } from "@hookform/resolvers/valibot"
import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons"
import {
  DEFAULT_SCRIPT_ID,
  SCRIPT_URL,
  Turnstile
} from "@marsidev/react-turnstile"
import {
  Cloud,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Palette,
  ShieldCheck,
  Users
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import Script from "next/script"
import { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import * as v from "valibot"
import { authClient } from "../../lib/auth-client"
import publicConfig from "../../lib/public-config"

const loginSchema = v.object({
  email: v.pipe(v.string(), v.minLength(1)),
  password: v.pipe(v.string(), v.minLength(1)),
})

type LoginFormData = v.InferInput<typeof loginSchema>

export default function SignInPage() {
  const searchParams = useSearchParams()
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: valibotResolver(loginSchema),
    mode: "onBlur"
  })

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string>("")
  const turnstileTokenRef = useRef<string>("")

  const onSubmit = handleSubmit(
    async ({ email, password }) => {
      const token = turnstileTokenRef.current
      console.log("Form submitted", { email, hasTurnstile: !!token, token: token.substring(0, 20) + "..." })
      
      if (!token) {
        setError("Please complete the CAPTCHA verification")
        return
      }
      
      setError(null)
      setIsLoading(true)
      try {
        const redirectTo = searchParams.get("redirect_to") || "/dashboard"
        
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: redirectTo,
          fetchOptions: {
            headers: {
              "x-captcha-response": token
            }
          }
        })

        console.log("Sign in result:", result)

        if (result.error) {
          setError(result.error.message || "Failed to sign in")
        }
        // Better Auth handles the redirect automatically via callbackURL
      } catch (err) {
        console.error("Sign in error:", err)
        setError("An unexpected error occurred")
      } finally {
        setIsLoading(false)
      }
    }
  )

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard"
      })
    } catch (err) {
      setError("Failed to sign in with Google")
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      <Script
        id={DEFAULT_SCRIPT_ID}
        src={SCRIPT_URL}
        strategy="beforeInteractive"
      />
      <style jsx>{`
        .login-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          position: relative;
          overflow: hidden;
        }
        .login-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          transition: left 0.5s;
        }
        .login-btn:hover::before {
          left: 100%;
        }
      `}</style>
      <div className="z-10 w-full max-w-6xl">
        <div className="bg-secondary/50 overflow-hidden rounded-[40px] shadow-2xl">
          <div className="grid min-h-[700px] lg:grid-cols-2">
            {/* Left Side */}
            <div className="brand-side relative m-4 rounded-3xl bg-[url('https://cdn.midjourney.com/299f94f9-ecb9-4b26-bead-010b8d8b01d9/0_0.webp?w=800&q=80')] bg-cover p-12 text-white">
              <div>
                <div className="mb-12 text-lg font-semibold uppercase">
                  PixelForge Studio
                </div>
                <h1 className="mb-4 text-6xl font-medium">
                  Create, Design, and Innovate
                </h1>
                <p className="mb-12 text-xl opacity-80">
                  Join thousands of creators who trust PixelForge Studio to
                  bring their vision to life
                </p>

                <div className="space-y-6">
                  {[
                    {
                      icon: <Palette size={16} />,
                      title: "Advanced Design Tools",
                      desc: "Professional-grade tools for every project"
                    },
                    {
                      icon: <Users size={16} />,
                      title: "Team Collaboration",
                      desc: "Work together seamlessly in real-time"
                    },
                    {
                      icon: <Cloud size={16} />,
                      title: "Cloud Storage",
                      desc: "Access your projects from anywhere"
                    },
                    {
                      icon: <ShieldCheck size={16} />,
                      title: "Enterprise Security",
                      desc: "Bank-level security for your data"
                    }
                  ].map(({ icon, title, desc }, i) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: Static list
                      key={i}
                      className="feature-item animate-fadeInUp flex items-center"
                      style={{ animationDelay: `${0.2 * (i + 1)}s` }}
                    >
                      <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm">
                        {icon}
                      </div>
                      <div>
                        <div className="font-semibold">{title}</div>
                        <div className="text-sm opacity-70">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex flex-col justify-center p-12">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-light uppercase">
                    Welcome back
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Sign in to continue your creative journey
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium uppercase"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        {...register("email")}
                        required
                        className="border-border bg-input block w-full rounded-lg border py-3 pr-3 pl-10 text-sm"
                        placeholder="Enter your email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-medium uppercase"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        required
                        className="border-border bg-input block w-full rounded-lg border py-3 pr-12 pl-10 text-sm"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-muted-foreground flex items-center text-sm">
                      <input
                        type="checkbox"
                        className="border-border text-primary h-4 w-4 rounded"
                      />
                      <span className="ml-2">Remember me</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-primary hover:text-primary/80 text-sm"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="w-full flex items-center justify-center">
                    <Turnstile
                      injectScript={false}
                      siteKey={publicConfig.TURNSTILE_SITE_KEY}
                      onSuccess={(token) => {
                        console.log("Turnstile success, token:", token)
                        setTurnstileToken(token)
                        turnstileTokenRef.current = token
                      }}
                      onError={(error) => {
                        console.error("Turnstile error:", error)
                        setError("CAPTCHA verification failed. Please try again.")
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="login-btn relative flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium text-white transition-all duration-300"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="ml-2">Signing in...</span>
                      </>
                    ) : (
                      "Sign in to your account"
                    )}
                  </button>

                  <div className="relative text-center text-sm text-stone-500">
                    <div className="absolute inset-0 flex items-center">
                      <div className="border-border w-full border-t"></div>
                    </div>
                    <span className="relative px-2">Or continue with</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="border-border bg-secondary text-foreground hover:bg-secondary/80 flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm shadow-sm"
                    >
                      <SiGoogle className="h-5 w-5" />
                      <span className="ml-2">Google</span>
                    </button>
                    <button
                      type="button"
                      className="border-border bg-secondary text-foreground hover:bg-secondary/80 flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm shadow-sm"
                    >
                      <SiGithub className="h-5 w-5" />
                      <span className="ml-2">GitHub</span>
                    </button>
                  </div>
                </form>

                <div className="text-muted-foreground mt-8 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="text-primary hover:text-primary/80">
                    Sign up for free
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}