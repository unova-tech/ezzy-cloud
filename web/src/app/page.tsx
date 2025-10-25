import { SiN8n } from "@icons-pack/react-simple-icons"
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Mail,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wrench,
  X
} from "lucide-react"
import * as motion from "motion/react-client"
import Image from "next/image"
import { lazy, Suspense } from "react"
import favicon from "@/app/favicon.ico"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../components/ui/card"
import { cn } from "../lib/utils"
import BentoGridItem from "./components/bento-grid-item"
import WaitListCount from "./components/waitlist-count"
import WaitListForm from "./components/waitlist-form"

const Demonstration = lazy(() => import("./components/demonstration"))

export default function LandingPage() {
  const prices = [
    {
      id: "n8n",
      name: "N8N Cloud",
      price: "R$4500",
      advantages: ["Sem servidor para administrar"],
      disadvantages: [
        "Preço sobe com cada automação extra",
        "Limites de uso restritivos",
        "Escalabilidade limitada"
      ]
    },
    {
      id: "vps",
      name: "VPS",
      price: "~R$1000",
      advantages: ["Controle total do ambiente"],
      disadvantages: [
        "Requer conhecimento técnico avançado",
        "Configuração e manutenção do servidor",
        "Escalabilidade limitada"
      ]
    },
    {
      id: "ezzy-cloud",
      name: "Ezzy Cloud",
      price: "Gratuito",
      advantages: [
        "Deploy com 1 clique e integrações prontas",
        "Zero gerenciamento",
        "Limites generosos",
        "Escalabilidade automática e ilimitada"
      ],
      disadvantages: [],
      best: true
    }
  ]

  const features = [
    {
      title: "Integrado com N8N",
      description:
        "Rode seus workflows N8N sem complicações, com deploy instantâneo e escalabilidade automática.",
      icon: <SiN8n className="size-6" />,
      size: "large" as const
    },
    {
      title: "Zero manutenção",
      description:
        "Esqueça SSH, Docker, atualizações e backups. Cuidamos de tudo para você.",
      icon: <Wrench className="size-6" />,
      size: "small" as const
    },
    {
      title: "Deploy instantâneo",
      description:
        "Do zero ao workflow rodando em menos de 5 minutos. Sem configurações complexas.",
      icon: <Rocket className="size-6" />,
      size: "medium" as const
    },
    {
      title: "Infraestrutura confiável",
      description:
        "Rode em infraestrutura serverless de nível empresarial com isolamento por workspace, backups automáticos e criptografia padrão mercado.",
      icon: <ShieldCheck className="size-6" />,
      size: "medium" as const
    },
    {
      title: "Otimização inteligente",
      description:
        "Nossa plataforma analisa seus workflows e otimiza performance automaticamente.",
      icon: <Sparkles className="size-6" />,
      size: "small" as const
    },
    {
      title: "Monitoramento em tempo real",
      description:
        "Dashboard em tempo real mostra execuções, erros e métricas detalhadas para você ficar tranquilo.",
      icon: <Activity className="size-6" />,
      size: "large" as const
    }
  ]

  const data = {
    services: {
      webdev: "/web-development",
      webdesign: "/web-design",
      marketing: "/marketing",
      googleads: "/google-ads"
    },
    help: {
      faqs: "/faqs",
      support: "/support",
      livechat: "/live-chat"
    },
    contact: {
      email: "ezzycloud@unova.tech",
      phone: "+91 8637373116",
      address: "Natal/RN, Brasil"
    },
    company: {
      name: "Ezzy Cloud",
      description:
        "A maneira mais fácil e barata de criar e  hospedar suas automações. Deploy com um clique, zero manutenção.",
      logo: favicon
    }
  }
  const aboutLinks = [
    { text: "Início", href: "#hero" },
    { text: "Preços", href: "#pricing" },
    { text: "Funcionalidades", href: "#features" },
    { text: "Inscreva-se", href: "#join" }
  ]
  const contactInfo = [
    { icon: Mail, text: data.contact.email, isAddress: false }
  ]

  return (
    <>
      <main>
        <section
          id="hero"
          className="bg-background relative w-full overflow-hidden"
        >
          <div className="absolute inset-0 z-0">
            <div className="from-primary/20 via-background to-background absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))]"></div>
            <div className="bg-primary/5 absolute top-0 left-1/2 -z-10 h-[1000px] w-[1000px] -translate-x-1/2 rounded-full blur-3xl"></div>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-size[16px_16px] opacity-15"></div>
          <div className="relative z-10 container mx-auto px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-5xl lg:max-w-6xl xl:max-w-7xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mx-auto mb-6 flex justify-center"
              >
                <div className="border-border bg-background/80 inline-flex items-center rounded-full border px-3 py-1 text-sm backdrop-blur-sm">
                  <span className="bg-primary mr-2 rounded-full px-2 py-0.5 text-xs font-semibold text-white">
                    Em breve
                  </span>
                  <span className="text-muted-foreground">
                    Lista de espera aberta
                  </span>
                  <ChevronRight className="text-muted-foreground ml-1 h-4 w-4" />
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="from-primary/10 via-foreground/85 to-foreground/50 bg-linear-to-tl bg-clip-text text-center text-4xl tracking-tighter text-balance text-transparent sm:text-5xl md:text-6xl lg:text-7xl"
              >
                Coloque seu negócio no ar em minutos
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-lg"
              >
                Esqueça insfrastrutura complexa, problemas de escala e custos
                inesperados. Foque no que realmente importa. Compátivel com N8N.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-10"
              >
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <WaitListForm />
                  <Button
                    variant="link"
                    className="text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <a href="#demonstration">
                      Saiba mais <ArrowRight className="ml-1 size-5" />
                    </a>
                  </Button>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-10 flex items-center justify-center gap-1"
              >
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1 }}
                  className="text-muted-foreground ml-2"
                >
                  <span className="text-primary font-semibold">
                    <Suspense fallback="10+">
                      <WaitListCount />
                    </Suspense>
                  </span>{" "}
                  já se inscreveram ✨
                </motion.span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.8,
                  delay: 0.5,
                  type: "spring",
                  stiffness: 50
                }}
                className="relative mx-auto mt-16 max-w-4xl"
                id="demonstration"
                style={{ scrollMarginTop: "10vh" }}
              >
                <div className="border-border/40 bg-background/50 rounded-xl border shadow-xl backdrop-blur-sm">
                  <div className="border-border/40 bg-muted/50 flex h-10 items-center border-b px-4">
                    <div className="flex space-x-2">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="bg-background/50 text-muted-foreground mx-auto flex items-center rounded-md px-3 py-1 text-xs">
                      http://localhost:5678
                    </div>
                  </div>
                  <div className="aspect-video relative overflow-hidden">
                    <Suspense>
                      <Demonstration />
                    </Suspense>
                  </div>
                  <div className="from-background absolute inset-0 bg-linear-to-t to-transparent opacity-0 pointer-events-none"></div>
                </div>
                <div className="border-border/40 bg-background/80 absolute -top-6 -right-6 h-12 w-12 rounded-lg border p-3 shadow-lg backdrop-blur-md">
                  <div className="bg-primary/20 h-full w-full rounded-md"></div>
                </div>
                <div className="border-border/40 bg-background/80 absolute -bottom-4 -left-4 h-8 w-8 rounded-full border shadow-lg backdrop-blur-md"></div>
                <div className="border-border/40 bg-background/80 absolute right-12 -bottom-6 h-10 w-10 rounded-lg border p-2 shadow-lg backdrop-blur-md">
                  <div className="h-full w-full rounded-md bg-green-500/20"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        <section
          id="pricing"
          className="flex w-full flex-col gap-16 overflow-hidden px-4 pb-24 pt-12 text-center sm:px-8"
        >
          <div className="flex flex-col items-center justify-center gap-8">
            <div className="relative flex flex-col items-center space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl"
              >
                Economize pelo menos R$ 4.500/ano
                <br />
                sem complexidade desnecessária
              </motion.h1>
            </div>
            <div className="absolute inset-0 mx-auto h-44 max-w-xs blur-[118px] bg-linear-to-b from-primary/20 to-transparent"></div>
            <div className="mt-8 grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
              {prices.map((price, index) => (
                <motion.div
                  key={price.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="flex"
                >
                  <Card
                    className={cn(
                      "bg-secondary/20 relative h-full w-full text-left transition-all duration-300 hover:shadow-lg",
                      price.best
                        ? "ring-primary/50 dark:shadow-primary/10 shadow-md ring-2"
                        : "hover:border-primary/30",
                      price.best &&
                        "from-primary/3 bg-linear-to-b to-transparent"
                    )}
                  >
                    {price.best && (
                      <div className="absolute -top-3 right-0 left-0 mx-auto w-fit">
                        <Badge className="bg-primary text-primary-foreground rounded-full px-4 py-1 shadow-sm">
                          <Sparkles className="mr-1 h-3.5 w-3.5" />
                          Melhor opção
                        </Badge>
                      </div>
                    )}
                    <CardHeader className={cn("pb-4")}>
                      <CardTitle
                        className={cn(
                          "text-xl font-bold",
                          price.best && "text-primary"
                        )}
                      >
                        {price.name}
                      </CardTitle>
                      <CardDescription className="mt-1 space-y-2">
                        <div className="flex items-baseline">
                          <span
                            className={cn(
                              "text-4xl font-bold",
                              price.best ? "text-primary" : "text-foreground"
                            )}
                          >
                            {price.price}
                          </span>
                          {!price.best && (
                            <span className="text-muted-foreground ml-1 text-sm">
                              /ano
                            </span>
                          )}
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 pb-6">
                      {[
                        ...price.advantages.map((advantage) => ({
                          type: "advantage",
                          content: advantage
                        })),
                        ...price.disadvantages.map((disadvantage) => ({
                          type: "disadvantage",
                          content: disadvantage
                        }))
                      ].map((item, index) => (
                        <motion.div
                          // biome-ignore lint/suspicious/noArrayIndexKey: Static list
                          key={index}
                          initial={{ opacity: 0, x: -5 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: 0.3 + index * 0.05
                          }}
                          viewport={{ once: true }}
                          className="flex items-center gap-2 text-sm"
                        >
                          {item.type === "advantage" ? (
                            <div
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full",
                                price.best
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary text-secondary-foreground"
                              )}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full bg-red-500/10 text-red-500"
                              )}
                            >
                              <X className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <span
                            className={
                              price.best
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {item.content}
                          </span>
                        </motion.div>
                      ))}
                    </CardContent>
                    {price.best ? (
                      <>
                        <div className="from-primary/5 pointer-events-none absolute right-0 bottom-0 left-0 h-1/2 rounded-b-lg bg-linar-to-t to-transparent" />
                        <div className="border-primary/20 pointer-events-none absolute inset-0 rounded-lg border" />
                      </>
                    ) : (
                      <div className="hover:border-primary/10 pointer-events-none absolute inset-0 rounded-lg border border-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-muted-foreground max-w-md pt-2 text-lg"
            >
              Preços para 3 mil execuções por mês
            </motion.p>
          </div>
        </section>
        <section id="features" className="relative py-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="relative mx-auto max-w-2xl sm:text-center">
              <div className="relative z-10">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="font-geist mt-4 text-3xl font-normal tracking-tighter sm:text-4xl md:text-5xl"
                >
                  Tudo o que você precisa
                </motion.h1>
              </div>
              <div className="absolute inset-0 mx-auto h-44 max-w-xs blur-[118px] bg-linear-to-b from-primary/20 to-transparent"></div>
            </div>
            <motion.div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6 relative mt-12"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.12,
                    delayChildren: 0.1
                  }
                }
              }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {features.map((item, idx) => (
                <BentoGridItem
                  // biome-ignore lint/suspicious/noArrayIndexKey: Static list
                  key={idx}
                  index={idx}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  size={item.size}
                  className={cn(
                    "col-span-1",
                    item.size === "large"
                      ? "md:col-span-4"
                      : item.size === "medium"
                        ? "md:col-span-3"
                        : "md:col-span-2",
                    "h-full"
                  )}
                />
              ))}
            </motion.div>
          </div>
        </section>
        <section id="join" className="py-16 md:py-32">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center">
              <motion.h1
                className="text-balance text-4xl font-semibold lg:text-5xl"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Vamos construir algo incrível juntos
              </motion.h1>
              <motion.p
                className="mt-4"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Inscreva-se na nossa lista de espera e fique por dentro das
                novidades. Além disso, você ganhará US$30 em créditos.
              </motion.p>
              <motion.div
                className="mx-auto mt-10 lg:mt-12 max-w-lg"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <WaitListForm />
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-secondary dark:bg-secondary/20 mt-16 w-full place-self-end rounded-t-xl">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-6 sm:px-6 lg:px-8 lg:pt-24">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div>
              <div className="text-primary flex justify-center gap-2 sm:justify-start">
                <Image
                  src={data.company.logo || "/placeholder.svg"}
                  alt="logo"
                  className="h-8 w-8 rounded-full"
                  width={32}
                  height={32}
                />
                <span className="text-2xl font-semibold">
                  {data.company.name}
                </span>
              </div>
              <p className="text-foreground/50 mt-6 max-w-md text-center leading-relaxed sm:max-w-xs sm:text-left">
                {data.company.description}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:col-span-2">
              <div className="text-center sm:text-left">
                <p className="text-lg font-medium">Home</p>
                <ul className="mt-8 space-y-4 text-sm">
                  {aboutLinks.map(({ text, href }) => (
                    <li key={text}>
                      <a
                        className="text-secondary-foreground/70 transition"
                        href={href}
                      >
                        {text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg font-medium">Contato</p>
                <ul className="mt-8 space-y-4 text-sm">
                  {contactInfo.map(({ icon: Icon, text, isAddress }) => (
                    <li key={text}>
                      <a
                        className="flex items-center justify-center gap-1.5 sm:justify-start"
                        href={`mailto:${text}`}
                      >
                        <Icon className="text-primary size-5 shrink-0 shadow-sm" />
                        {isAddress ? (
                          <address className="text-secondary-foreground/70 -mt-0.5 flex-1 not-italic transition">
                            {text}
                          </address>
                        ) : (
                          <span className="text-secondary-foreground/70 flex-1 transition">
                            {text}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t pt-6">
            <div className="text-center sm:flex sm:justify-between sm:text-left">
              <p className="text-sm">
                <span className="block sm:inline">
                  Todos os direitos reservados
                </span>
              </p>
              <p className="text-secondary-foreground/70 mt-4 text-sm transition sm:order-first sm:mt-0">
                &copy; 2025 {data.company.name}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
