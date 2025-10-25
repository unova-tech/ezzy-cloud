"use client"

import conffeti from "canvas-confetti"
import { Mail, SendHorizonal } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "../../components/ui/button"
import httpClient from "../../lib/localHttpClient"
import { cn } from "../../lib/utils"

const WaitListForm: React.FC = () => {
  const searchParams = useSearchParams()
  const referralCode = searchParams.get("ref") ?? undefined

  const {
    handleSubmit,
    register,
    formState: { isSubmitting, isDirty }
  } = useForm({
    defaultValues: { email: "" },
    mode: "onBlur"
  })

  const onSubmit = handleSubmit(async (data) => {
    await new Promise((resolve) => {
      toast.promise(
        httpClient.waitlist
          .post({
            email: data.email,
            referralCode
          })
          .then(({ data, error }) => {
            if (error) {
              throw new Error(data || "Ocorreu um erro. Tente novamente.")
            }

            return data
          })
          .then((data) => {
            conffeti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            })
            resolve(true)

            return data.message
          }),
        {
          loading: "Inscrevendo...",
          success: () =>
            "Inscrição realizada! Verifique seu email para mais informações.",
          error: (err) => err?.message || "Ocorreu um erro. Tente novamente."
        }
      )
    })
  })

  return (
    <form
      onSubmit={onSubmit}
      className="bg-background has-[input:focus]:ring-muted relative grid grid-cols-[1fr_auto] items-center rounded-[calc(var(--radius)+0.75rem)] border pr-3 shadow shadow-zinc-950/5 has-[input:focus]:ring-2"
    >
      <Mail className="text-caption pointer-events-none absolute inset-y-0 left-5 my-auto size-5" />

      <input
        placeholder="Seu melhor email"
        className="h-14 w-full bg-transparent pl-12 focus:outline-none"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        {...register("email")}
      />

      <div className="md:pr-1.5 lg:pr-0">
        <Button
          aria-label="submit"
          className={cn(
            "*:rounded-(--radius) cursor-pointer",
            isSubmitting && "cursor-progress",
            !isDirty && "cursor-not-allowed"
          )}
          type="submit"
          disabled={isSubmitting || !isDirty}
        >
          <span className="hidden md:block">Inscreva-se</span>
          <SendHorizonal
            className="relative mx-auto size-5 md:hidden"
            strokeWidth={2}
          />
        </Button>
      </div>
    </form>
  )
}

export default WaitListForm
