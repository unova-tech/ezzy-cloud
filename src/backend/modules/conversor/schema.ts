import { z } from "zod"

const baseStepSchema = z.object({
  name: z
    .string()
    .describe(
      "Nome único do step em camelCase (ex: 'fetchUser', 'processOrder')"
    ),
  type: z
    .string()
    .describe(
      "Tipo do step: 'step', 'if', 'switch', 'forEach', 'while', 'doWhile', 'parallel', 'waitForEvent'"
    )
})

/**
 * Configuração de tratamento de erros para steps.
 *
 * @property fallbackValue - Valor padrão retornado em caso de erro
 * @property continueOnError - Se true, workflow continua mesmo com erro (equivalente a continueOnFail do N8N)
 * @property errorSteps - Steps alternativos executados em caso de erro (fallback steps)
 *
 * @example
 * ```typescript
 * {
 *   continueOnError: true,
 *   fallbackValue: { status: "unavailable" }
 * }
 * ```
 *
 * @example Com fallback steps
 * ```typescript
 * {
 *   errorSteps: [
 *     { type: "step", name: "notifyAdmin", handler: "slack.message" },
 *     { type: "step", name: "useCache", handler: "cache.get" }
 *   ]
 * }
 * ```
 */
export type StepErrorHandler = {
  fallbackValue?: unknown | null
  continueOnError?: boolean | null
  errorSteps?: WorkflowStep[] | null
}

/**
 * Configuração de retry automático com backoff.
 *
 * @property attempts - Número de tentativas (1-10)
 * @property backoff.strategy - Estratégia de delay: "fixed" (constante) ou "exponential" (2x a cada tentativa)
 * @property backoff.delay - Delay inicial no formato "1s", "500ms"
 *
 * @example Fixed backoff (sempre 2s)
 * ```typescript
 * {
 *   attempts: 3,
 *   backoff: { strategy: "fixed", delay: "2s" }
 * }
 * // Tentativas em: 0s, 2s, 4s
 * ```
 *
 * @example Exponential backoff
 * ```typescript
 * {
 *   attempts: 5,
 *   backoff: { strategy: "exponential", delay: "1s" }
 * }
 * // Tentativas em: 0s, 1s, 2s, 4s, 8s
 * ```
 */
export type RetryConfig = {
  attempts: number
  backoff: {
    strategy: "fixed" | "exponential"
    delay: string
  }
}

/**
 * Step de um workflow - unidade básica de execução.
 *
 * Pode ser um dos seguintes tipos:
 * - **step**: Execução simples (HTTP, database, API call, etc)
 * - **if**: Execução condicional (if/else if/else)
 * - **switch**: Roteamento baseado em valor (múltiplos cases)
 * - **parallel**: Execução paralela de múltiplas branches
 * - **forEach**: Loop sobre array (for...of)
 * - **while**: Loop com condição verificada ANTES (pode não executar)
 * - **doWhile**: Loop com condição verificada DEPOIS (sempre executa 1x)
 * - **waitForEvent**: Pausa até evento externo (webhook, time)
 *
 * @example Simple step com input único
 * ```typescript
 * {
 *   type: "step",
 *   name: "fetchUser",
 *   handler: "http.get",
 *   input: "trigger.body.userId",
 *   timeout: "30s"
 * }
 * ```
 *
 * @example Step com múltiplos inputs (Merge node)
 * ```typescript
 * {
 *   type: "step",
 *   name: "mergeData",
 *   handler: "data.merge",
 *   input: {
 *     main: "steps.fetchUser.output",
 *     aux: "steps.fetchOrders.output"
 *   }
 * }
 * ```
 *
 * @example IF condicional
 * ```typescript
 * {
 *   type: "if",
 *   name: "checkActive",
 *   condition: "steps.fetchUser.output.status === 'active'",
 *   thenSteps: [{ type: "step", name: "sendWelcome", handler: "email.send" }],
 *   elseSteps: [{ type: "step", name: "logInactive", handler: "logging.warn" }]
 * }
 * ```
 *
 * @example forEach loop
 * ```typescript
 * {
 *   type: "forEach",
 *   name: "processOrders",
 *   items: "steps.getOrders.output.items",
 *   itemVar: "order",
 *   indexVar: "i",
 *   steps: [
 *     { type: "step", name: "processOrder", handler: "orders.process", input: "vars.order" }
 *   ]
 * }
 * ```
 */
export type WorkflowStep =
  | (z.infer<typeof baseStepSchema> & {
      type: "step"
      handler: string
      input?: string | string[] | Record<string, string> | null // Path(s) para dados de input
      output?: string | null // Path para salvar output (default: steps.{name}.output)
      timeout?: string | null
      onError?: StepErrorHandler | null
      retry?: RetryConfig | null
      params?: Record<string, unknown> | null // Parâmetros específicos do handler (ex: http.request -> { method: "GET" })
    })
  | (z.infer<typeof baseStepSchema> & {
      type: "if"
      condition: string // Expressão JavaScript: "steps.fetchUser.output.status === 'active'"
      thenSteps: WorkflowStep[]
      elseIfSteps?: { [key: string]: WorkflowStep[] } | null
      elseSteps?: WorkflowStep[] | null
    })
  | (z.infer<typeof baseStepSchema> & {
      type: "switch"
      value: string // Path para valor: "steps.fetchUser.output.status"
      cases: { [key: string]: WorkflowStep[] }
      defaultCase?: WorkflowStep[] | null
    })
  | (z.infer<typeof baseStepSchema> & {
      type: "parallel"
      branches: WorkflowStep[][]
    })
  | (z.infer<typeof baseStepSchema> & {
      type: "forEach"
      items: string // Path para array: "steps.fetchOrders.output.items"
      itemVar: string // Nome da variável: "item" -> disponível como vars.item
      indexVar?: string | null // Nome da variável de índice (opcional)
      steps: WorkflowStep[]
    })
  | (z.infer<typeof baseStepSchema> & {
      type: "while"
      condition: string // Expressão JavaScript
      steps: WorkflowStep[]
    })
  | (z.infer<typeof baseStepSchema> & {
      type: "doWhile"
      condition: string // Expressão JavaScript
      steps: WorkflowStep[]
    })
  | (z.infer<typeof baseStepSchema> & {
      type: "waitForEvent"
      event: {
        type: "webhook" | "time"
        config: Record<string, unknown>
      }
      timeout?: number | null
      timeoutSteps?: WorkflowStep[] | null
    })

const stepSchema: z.ZodType<WorkflowStep> = z.lazy(() =>
  z.discriminatedUnion("type", [
    baseStepSchema.extend({
      type: z.literal("step"),
      handler: z
        .string()
        .describe(
          "Handler do step no formato 'namespace.operation' (ex: 'http.request', 'database.query', 'email.send')"
        ),
      input: z
        .union([
          z.string(),
          z.array(z.string()),
          z.record(z.string(), z.string())
        ])
        .optional()
        .nullable()
        .describe(
          "Path(s) para dados de input. Pode ser: string única ('trigger.body'), array de paths (['steps.a.output', 'steps.b.output']) ou objeto mapeando inputs nomeados ({'main': 'steps.a.output', 'aux': 'steps.b.output'})"
        ),
      output: z
        .string()
        .optional()
        .nullable()
        .describe(
          "Path para salvar output. Default: 'steps.{name}.output'. Exemplo: 'userData'"
        ),
      timeout: z
        .string()
        .optional()
        .nullable()
        .describe("Timeout no formato '30s', '5m', '1h'"),
      onError: z
        .object({
          fallbackValue: z
            .union([
              z.string(),
              z.number(),
              z.boolean(),
              z.null(),
              z.array(z.unknown()),
              z.record(z.string(), z.unknown())
            ])
            .optional()
            .nullable()
            .describe("Valor de fallback em caso de erro"),
          continueOnError: z
            .boolean()
            .optional()
            .nullable()
            .describe(
              "Se true, continua execução mesmo em caso de erro (equivalente a continueOnFail do N8N)"
            ),
          errorSteps: z
            .array(z.lazy(() => stepSchema))
            .optional()
            .nullable()
            .describe("Steps a executar em caso de erro (fallback steps)")
        })
        .optional()
        .nullable()
        .describe("Configuração de tratamento de erros"),
      retry: z
        .object({
          attempts: z
            .number()
            .min(1)
            .max(10)
            .describe("Número de tentativas (1-10)"),
          backoff: z.object({
            strategy: z
              .enum(["fixed", "exponential"])
              .describe(
                "Estratégia de backoff: 'fixed' (delay constante) ou 'exponential' (2x a cada tentativa)"
              ),
            delay: z
              .string()
              .describe(
                "Delay inicial no formato '1s', '500ms'. Para exponential: 1s, 2s, 4s, 8s..."
              )
          })
        })
        .optional()
        .nullable()
        .describe("Configuração de retry automático"),
      params: z
        .record(z.string(), z.unknown())
        .optional()
        .nullable()
        .describe(
          "Parâmetros específicos do handler. Ex: para 'http.request', defina { method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' }"
        )
    }),
    baseStepSchema.extend({
      type: z.literal("if"),
      condition: z
        .string()
        .describe(
          "Expressão JavaScript que retorna boolean. Exemplos: 'steps.fetchUser.output.status === \"active\"', 'steps.check.output.age > 18 && steps.check.output.verified === true'"
        ),
      thenSteps: z
        .array(z.lazy(() => stepSchema))
        .describe("Steps a executar se a condição for verdadeira"),
      elseIfSteps: z
        .record(z.string(), z.array(z.lazy(() => stepSchema)))
        .optional()
        .nullable()
        .describe(
          "ElseIf conditions (chave: condição, valor: steps). Avaliados em ordem se 'condition' for falsa"
        ),
      elseSteps: z
        .array(z.lazy(() => stepSchema))
        .optional()
        .nullable()
        .describe("Steps a executar se todas as condições forem falsas")
    }),
    baseStepSchema.extend({
      type: z.literal("switch"),
      value: z
        .string()
        .describe(
          "Path para o valor a ser comparado. Exemplo: 'steps.fetchUser.output.status', 'trigger.body.eventType'"
        ),
      cases: z
        .record(z.string(), z.array(z.lazy(() => stepSchema)))
        .describe(
          "Mapeamento de valores para steps. Chaves são strings (mesmo para números). Exemplo: {'active': [...], 'pending': [...]}"
        ),
      defaultCase: z
        .array(z.lazy(() => stepSchema))
        .optional()
        .nullable()
        .describe("Steps a executar se nenhum case corresponder ao valor")
    }),
    baseStepSchema.extend({
      type: z.literal("parallel"),
      branches: z
        .array(z.array(z.lazy(() => stepSchema)))
        .describe(
          "Array de branches (cada branch é um array de steps). Todas as branches executam simultaneamente"
        )
    }),
    baseStepSchema.extend({
      type: z.literal("forEach"),
      items: z
        .string()
        .describe(
          "Path para o array a iterar. Exemplo: 'steps.fetchOrders.output.items', 'trigger.body.users'"
        ),
      itemVar: z
        .string()
        .describe(
          "Nome da variável que representa cada item. Disponível como 'vars.{itemVar}' dentro dos steps. Exemplo: 'user', 'order'"
        ),
      indexVar: z
        .string()
        .optional()
        .nullable()
        .describe(
          "Nome da variável para o índice (0, 1, 2...). Disponível como 'vars.{indexVar}'. Exemplo: 'i', 'idx'"
        ),
      steps: z
        .array(z.lazy(() => stepSchema))
        .describe("Steps a executar para cada item do array")
    }),
    baseStepSchema.extend({
      type: z.literal("while"),
      condition: z
        .string()
        .describe(
          "Expressão JavaScript avaliada ANTES de cada iteração. Loop continua enquanto true. Exemplo: 'steps.checkStatus.output.status !== \"completed\"'"
        ),
      steps: z
        .array(z.lazy(() => stepSchema))
        .describe("Steps a executar em cada iteração")
    }),
    baseStepSchema.extend({
      type: z.literal("doWhile"),
      condition: z
        .string()
        .describe(
          "Expressão JavaScript avaliada DEPOIS de cada iteração. Garante pelo menos 1 execução. Loop continua enquanto true"
        ),
      steps: z
        .array(z.lazy(() => stepSchema))
        .describe(
          "Steps a executar em cada iteração (sempre executa pelo menos uma vez)"
        )
    }),
    baseStepSchema.extend({
      type: z.literal("waitForEvent"),
      event: z
        .object({
          type: z
            .enum(["webhook", "time"])
            .describe(
              "Tipo de evento a aguardar: 'webhook' (HTTP callback), 'time' (aguardar duração)"
            ),
          config: z
            .record(z.string(), z.unknown())
            .describe(
              "Configuração específica do tipo. Webhook: {path, method}, Time: {duration}"
            )
        })
        .describe("Configuração do evento a aguardar"),
      timeout: z
        .number()
        .optional()
        .nullable()
        .describe(
          "Timeout em segundos. Se atingido, executa timeoutSteps ou falha"
        ),
      timeoutSteps: z
        .array(z.lazy(() => stepSchema))
        .optional()
        .nullable()
        .describe("Steps a executar se o timeout for atingido")
    })
  ])
)

const baseTriggerSchema = z.object({
  type: z.string().describe("Tipo do trigger: 'http', 'schedule', 'event'")
})

const webhookTriggerSchema = baseTriggerSchema.extend({
  type: z.literal("http"),
  method: z
    .enum(["GET", "POST", "PUT", "DELETE", "PATCH"])
    .describe(
      "Método HTTP do webhook. Usado para receber requisições HTTP que iniciam o workflow"
    )
})

const scheduleTriggerSchema = baseTriggerSchema.extend({
  type: z.literal("schedule"),
  cron: z
    .string()
    .describe(
      "Expressão cron para agendamento. Formato: 'min hora dia mês dia-semana'. Exemplo: '0 2 * * *' (todo dia às 2h)"
    )
})

const eventTriggerSchema = baseTriggerSchema.extend({
  type: z.literal("event"),
  eventName: z
    .string()
    .describe(
      "Nome do evento customizado que dispara o workflow. Exemplo: 'user.created', 'order.updated'"
    )
})

const triggerSchema = z.discriminatedUnion("type", [
  webhookTriggerSchema,
  scheduleTriggerSchema,
  eventTriggerSchema
])

/**
 * Trigger que inicia um workflow.
 *
 * Tipos disponíveis:
 * - **http**: Webhook HTTP (GET, POST, PUT, DELETE, PATCH)
 * - **schedule**: Agendamento cron (execução periódica)
 * - **event**: Evento customizado da aplicação
 *
 * Um workflow pode ter múltiplos triggers.
 *
 * @example Webhook trigger
 * ```typescript
 * {
 *   type: "http",
 *   method: "POST"
 * }
 * // Recebe POST requests e inicia workflow
 * ```
 *
 * @example Schedule trigger
 * ```typescript
 * {
 *   type: "schedule",
 *   cron: "0 2 * * *"
 * }
 * // Executa todo dia às 2h da manhã
 * ```
 *
 * @example Event trigger
 * ```typescript
 * {
 *   type: "event",
 *   eventName: "user.created"
 * }
 * // Executa quando evento "user.created" é disparado
 * ```
 */
export type WorkflowTrigger = z.infer<typeof triggerSchema>

export const workflowSchema = z.object({
  name: z
    .string()
    .describe(
      "Nome do workflow em camelCase. Exemplo: 'orderProcessing', 'userEnrichment'"
    ),
  triggers: z
    .array(triggerSchema)
    .describe(
      "Array de triggers que iniciam o workflow. Pode ter múltiplos triggers (webhook + schedule, por exemplo)"
    ),
  steps: z
    .array(stepSchema)
    .describe(
      "Array sequencial de steps a executar. Define a lógica principal do workflow"
    ),
  timeout: z
    .string()
    .optional()
    .nullable()
    .describe(
      "Timeout global do workflow no formato '30m', '1h'. Se atingido, workflow falha"
    ),
  hooks: z
    .object({
      onFailure: z
        .array(stepSchema)
        .optional()
        .nullable()
        .describe(
          "Steps a executar quando o workflow falhar. Útil para notificações e cleanup. Acesso a 'steps.$failed' para dados do erro"
        ),
      onSuccess: z
        .array(stepSchema)
        .optional()
        .nullable()
        .describe(
          "Steps a executar quando o workflow completar com sucesso. Útil para métricas e notificações"
        ),
      onComplete: z
        .array(stepSchema)
        .optional()
        .nullable()
        .describe(
          "Steps a executar sempre ao final do workflow (sucesso ou falha). Útil para cleanup de recursos"
        )
    })
    .optional()
    .nullable()
    .describe("Hooks para eventos do ciclo de vida do workflow")
})

/**
 * Workflow completo no formato IR (Intermediate Representation).
 *
 * Um workflow representa uma automação completa com:
 * - **Triggers**: Como o workflow é iniciado
 * - **Steps**: Lógica de execução (sequencial, condicional, loops, parallel)
 * - **Hooks**: Tratamento de eventos (onFailure, onSuccess, onComplete)
 *
 * @example Workflow simples
 * ```typescript
 * {
 *   name: "orderNotification",
 *   triggers: [
 *     { type: "http", method: "POST" }
 *   ],
 *   steps: [
 *     {
 *       type: "step",
 *       name: "fetchOrder",
 *       handler: "database.query",
 *       input: "trigger.body.orderId"
 *     },
 *     {
 *       type: "step",
 *       name: "sendEmail",
 *       handler: "email.send",
 *       input: {
 *         to: "steps.fetchOrder.output.customerEmail",
 *         template: "order-confirmation"
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * @example Workflow com hooks
 * ```typescript
 * {
 *   name: "criticalProcess",
 *   triggers: [{ type: "schedule", cron: "0 * * * *" }],
 *   steps: [...],
 *   hooks: {
 *     onFailure: [
 *       { type: "step", name: "notifyAdmin", handler: "pagerduty.alert" }
 *     ],
 *     onComplete: [
 *       { type: "step", name: "cleanup", handler: "temp.cleanup" }
 *     ]
 *   }
 * }
 * ```
 */
export type Workflow = z.infer<typeof workflowSchema>

export const conversionResultSchema = z.object({
  workflows: z
    .array(workflowSchema)
    .describe(
      "Array de workflows convertidos. Um workflow N8N pode gerar múltiplos workflows IR se houver sub-workflows"
    ),
  envs: z
    .array(z.string())
    .describe("Array de variáveis de ambiente necessárias para os workflows")
})

/**
 * Resultado da conversão de N8N para IR.
 *
 * Contém um array de workflows convertidos.
 * Normalmente 1 workflow N8N → 1 workflow IR,
 * mas pode gerar múltiplos workflows se houver sub-workflows (Execute Workflow nodes).
 *
 * @example Resultado de conversão
 * ```typescript
 * {
 *   workflows: [
 *     {
 *       name: "mainWorkflow",
 *       triggers: [...],
 *       steps: [...]
 *     },
 *     {
 *       name: "subWorkflow",
 *       triggers: [],
 *       steps: [...]
 *     }
 *   ],
 *   envs: ["API_KEY", "DB_PASSWORD"]
 * }
 * ```
 */
export type ConversionResult = z.infer<typeof conversionResultSchema>
