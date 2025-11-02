# WinterJS Compatibility

## Visão Geral

**WinterJS** é um runtime JavaScript baseado em Rust (SpiderMonkey) que implementa os padrões WinterCG (Web-interoperable Runtimes Community Group) e é **explicitamente compatível com a API do Cloudflare Workers** desde a versão 1.0.

### Objetivo

Permitir o deploy de workflows em **Kubernetes + Knative** usando WinterJS ao invés de Cloudflare Workers for Platforms, mantendo total compatibilidade com o código gerado.

### Status Atual

✅ **O código gerado é totalmente compatível** com WinterJS. O código gerado não possui nenhuma dependência Cloudflare-específica.

## Matriz de Compatibilidade

### APIs WinterCG-Compatible (✅ Funcionam em ambos)

Todas as APIs Web padrão usadas no código são compatíveis com Cloudflare Workers e WinterJS:

- **fetch()** - usado em `nodes/http-request/runtime.ts` linha 27
  - API Web padrão para requisições HTTP
  - Suportado nativamente por ambos os runtimes

- **crypto.randomUUID()** - usado em `code-generator.ts` linhas 82-83
  - API Web Crypto para geração de UUIDs
  - Suportado nativamente por ambos os runtimes

- **crypto.subtle** - usado para HMAC signature verification em `code-generator.ts` linhas 260-274
  - API Web Crypto para operações criptográficas
  - Usado para verificação de assinaturas HMAC-SHA256
  - Suportado nativamente por ambos os runtimes

- **Request/Response** - APIs Web padrão usadas em todo o código
  - Classes padrão para representar requisições e respostas HTTP
  - Suportado nativamente por ambos os runtimes

- **URL/URLSearchParams** - usado para parsing de URLs e query params
  - APIs Web padrão para manipulação de URLs
  - Suportado nativamente por ambos os runtimes

- **TextEncoder** - usado para encoding em operações crypto
  - API Web padrão para conversão de strings para bytes
  - Suportado nativamente por ambos os runtimes

- **AbortController** - usado em `http-request/runtime.ts` linha 12 para timeouts
  - API Web padrão para cancelamento de requisições
  - Suportado nativamente por ambos os runtimes

- **setTimeout/clearTimeout** - usado em `http-request/runtime.ts` linhas 13-14, 34
  - APIs de timer padrão JavaScript
  - Suportado nativamente por ambos os runtimes

- **console.*** - usado em `runtime/logger.ts` e `nodes/code/runtime.ts`
  - API de logging padrão JavaScript
  - Suportado nativamente por ambos os runtimes

- **Map** - usado em `runtime/index.ts` para Context
  - Estrutura de dados padrão JavaScript
  - Suportado nativamente por ambos os runtimes

- **JSON.stringify/parse** - usado em todo o código
  - APIs padrão JavaScript para serialização JSON
  - Suportado nativamente por ambos os runtimes

- **Date.now()** - usado para timestamps
  - API padrão JavaScript para datas
  - Suportado nativamente por ambos os runtimes

- **new Function()** - usado em `runtime/index.ts` linha 63 para evaluateExpression
  - Construtor de função dinâmica padrão JavaScript
  - Suportado nativamente por ambos os runtimes

- **Object.getPrototypeOf()** - usado em `nodes/code/runtime.ts` linha 74 para AsyncFunction
  - API padrão JavaScript para manipulação de protótipos
  - Usado para criar AsyncFunction constructor
  - Suportado nativamente por ambos os runtimes

### Cloudflare-Specific Bindings (❌ Não disponíveis em WinterJS)

Bindings específicos do Cloudflare que não estão disponíveis em WinterJS:

- **env.EXECUTIONS_QUEUE** - Queue binding usado em `code-generator.ts` linhas 98-105, 119-128, 142-151
  - **Status**: ✅ Removido
  - **Uso anterior**: Publicação de eventos de execução (started/completed/failed)
  - **Implementação atual**: Eventos de execução são registrados via `logger.info()` e `logger.error()`
  - **Alternativa para WinterJS**: Logging via console ou HTTP POST para serviço externo de monitoramento

- **env.ASSETS** - Não usado no código atual
  - Binding para servir assets estáticos
  - Não necessário para execução de workflows

- **env.KV** - Não usado no código atual
  - Key-Value storage do Cloudflare
  - Não necessário para execução de workflows

- **env.R2** - Não usado no código atual
  - Object storage compatível com S3
  - Não necessário para execução de workflows

- **env.D1** - Não usado no código atual
  - Database SQL do Cloudflare
  - Não necessário para execução de workflows

### Environment Variables & Secrets (✅ Compatível com adaptação)

Padrão de acesso a variáveis de ambiente e secrets:

- **env.WORKFLOW_ID** - usado em `code-generator.ts` linha 82
  - **Cloudflare**: Injetado via binding no momento do dispatch
  - **WinterJS/Kubernetes**: Injetar via ConfigMap como variável de ambiente do container
  - **Adaptação necessária**: Criar shim para carregar de `process.env.WORKFLOW_ID`

- **env.SECRET_*** - padrão documentado em `code-generator.ts` linhas 90-93
  - **Cloudflare**: Injetado via Secret bindings (ex: `env.SECRET_RESEND_API_KEY`)
  - **WinterJS/Kubernetes**: Injetar via Kubernetes Secrets como variáveis de ambiente
  - **Adaptação necessária**: Criar shim para carregar secrets com prefixo `SECRET_` de variáveis de ambiente

- **secrets object** - passado para node runtimes (ex: `nodes/resend/send-email/runtime.ts` linha 6)
  - **Implementação**: Carregar de variáveis de ambiente no início do worker
  - **Exemplo**:
    ```typescript
    const secrets = {
      RESEND_API_KEY: env.SECRET_RESEND_API_KEY || process.env.SECRET_RESEND_API_KEY
    }
    ```

### Node.js-Specific APIs (✅ Nenhuma encontrada)

Confirmação de que não há dependências Node.js no código gerado:

- ✅ Nenhum `require()` ou `import` de módulos Node.js (fs, path, http, etc.)
- ✅ Nenhum uso direto de `process.env`
- ✅ Nenhum uso de `Buffer`
- ✅ Código usa apenas APIs Web padrão e JavaScript padrão

Isso garante portabilidade total entre runtimes JavaScript modernos.

## Formato do Worker

### Cloudflare Workers Format (✅ Suportado por WinterJS)

Formato atual gerado pelo `code-generator.ts`:

```typescript
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // código do workflow
  }
}
```

**Compatibilidade**:
- ✅ Este formato é suportado nativamente por WinterJS desde v1.0
- ✅ Também suporta Service Worker format: `addEventListener('fetch', ...)`
- **Recomendação**: Manter formato atual (Cloudflare-compatible)

**Nota sobre ExecutionContext**:
- `ctx.waitUntil()` não é usado no código gerado atual
- Se for usado no futuro, WinterJS pode não implementar este método
- Alternativa: usar promises normais ou top-level await

## Runtime Packages

### workflow-runtime (✅ Compatível)

Análise de `runtime/index.ts`:

- **Dependências**: Usa apenas APIs padrão: Map, Function, Date, JSON
- **Funções principais**:
  - `createContext()` - cria objeto com Maps para variáveis e dados
  - `evaluateExpression()` - usa `new Function()` (disponível em WinterJS)
  - `handleError()` - manipulação de objetos Error
  - `createJsonResponse()` - usa `new Response()` (API Web padrão)

**Compatibilidade**: ✅ 100% compatível, não requer modificações

### workflow-runtime/logger (✅ Compatível)

Análise de `runtime/logger.ts`:

- **Dependências**: Usa apenas `console.*` (disponível em WinterJS)
- **Implementação**: Armazena logs em array in-memory
- **Método `flush()`**: É placeholder (não faz I/O), apenas retorna logs

**Compatibilidade**: ✅ 100% compatível, não requer modificações

### Node Runtimes (✅ Compatíveis)

Análise de cada node runtime:

#### http-request (`nodes/http-request/runtime.ts`)
- **APIs usadas**: fetch, AbortController, setTimeout, clearTimeout, Headers
- **Todas são Web APIs padrão**
- **Compatibilidade**: ✅ 100% compatível

#### code (`nodes/code/runtime.ts`)
- **APIs usadas**: AsyncFunction constructor via `Object.getPrototypeOf()`, console, JSON
- **Técnica**: Cria AsyncFunction dinamicamente para executar código do usuário
- **Compatibilidade**: ✅ 100% compatível (AsyncFunction disponível em WinterJS)

#### resend/send-email (`nodes/resend/send-email/runtime.ts`)
- **APIs usadas**: Apenas console.log para logging
- **Nota**: Implementação atual é placeholder, não faz chamada real à API Resend
- **Compatibilidade**: ✅ 100% compatível

## Bundling para WinterJS

### WorkflowBundler

O sistema de bundling empacota workflows compilados em um único arquivo JavaScript compatível com WinterJS.

**Localização**: `backend/lib/workflow-bundler.ts`

**Funcionalidade**:
- Usa **esbuild** para bundlar código TypeScript gerado + dependências
- Resolve workspace dependencies automaticamente (`workflow-runtime`, `nodes-*/runtime`)
- Gera bundle ES module com formato Cloudflare Workers preservado
- Minifica código por padrão (configurável)
- Adiciona comentário documentando variáveis de ambiente necessárias

**Uso**:
```typescript
import { WorkflowBundler } from './workflow-bundler'

const bundler = new WorkflowBundler()
const result = await bundler.bundle({
  workflowId: 'my-workflow',
  generatedCode: '...', // Código do CodeGenerator
  usedNodes: ['http-request', 'code'],
  minify: true
})

if (result.success) {
  console.log('Bundle size:', result.bundleSize)
  // result.bundleCode contém JavaScript pronto para deploy
}
```

**Integração com WorkflowCompiler**:
```typescript
import { WorkflowCompiler } from './workflow-compiler'

const compiler = new WorkflowCompiler()
const result = await compiler.compileAndBundle(nodes, edges)

if (result.success) {
  console.log('TypeScript:', result.code)      // Código gerado
  console.log('Bundle:', result.bundle)        // Bundle para WinterJS
  console.log('Bundle size:', result.bundleSize)
}
```

### Workspace Dependencies Resolution

O bundler resolve automaticamente imports de workspace:

| Import | Path Resolvido |
|--------|----------------|
| `workflow-runtime` | `/runtime/index.ts` |
| `workflow-runtime/logger` | `/runtime/logger.ts` |
| `nodes-http-request/runtime` | `/nodes/http-request/runtime.ts` |
| `nodes-resend-send-email/runtime` | `/nodes/resend/send-email/runtime.ts` |
| `node-base` | `/nodes/__base__/index.ts` |

**Implementação**: Plugin esbuild customizado que intercepta `onResolve` e mapeia imports para paths absolutos.

### Bundle Output

O bundle gerado:
- **Formato**: ES module (`export default { async fetch() }`)
- **Target**: ES2022 (JavaScript moderno)
- **Tamanho típico**: 50-200KB (minified)
- **Compatibilidade**: Cloudflare Workers + WinterJS

**Estrutura do bundle**:
```javascript
/**
 * Workflow Bundle for WinterJS
 * Environment variables expected:
 * - WORKFLOW_ID: Unique workflow identifier
 * - SECRET_resend_api_key: Resend API key
 */

// ... código bundled ...

export default {
  async fetch(request, env, ctx) {
    // ... workflow logic ...
  }
}
```

### Environment Variables

O bundler analisa código gerado e documenta variáveis necessárias:

**Detecção automática**:
- `env.WORKFLOW_ID` → Adiciona ao comentário do bundle
- `env.SECRET_*` → Extrai lista de secrets usados

**Resultado**:
```typescript
result.environmentVariables = {
  workflowId: true,
  secrets: ['resend_api_key', 'stripe_key']
}
```

**Nota sobre process.env**:
O bundler usa `platform: 'browser'` no esbuild para evitar polyfills Node.js. Isso é correto porque o código gerado usa o padrão Cloudflare Workers (`env` parameter) e não `process.env`. Tanto Cloudflare Workers quanto WinterJS injetam variáveis via objeto `env` passado para a função `fetch()`. Não é necessário shim de `process.env`.

**Deploy em Kubernetes**:
Usar ConfigMaps e Secrets para injetar variáveis:
```yaml
env:
  - name: WORKFLOW_ID
    valueFrom:
      configMapKeyRef:
        name: workflow-config
        key: WORKFLOW_ID
  - name: SECRET_resend_api_key
    valueFrom:
      secretKeyRef:
        name: workflow-secrets
        key: resend_api_key
```

## Dockerfile para WinterJS

### Template Dockerfile

O projeto inclui Dockerfile template otimizado para deploy de workflows no WinterJS runtime.

**Localização**: `backend/templates/Dockerfile.winterjs`

**Características:**
- **Base image**: Debian Bookworm Slim (~160-220MB total)
- **Runtime**: WinterJS via Wasmer CLI (versão pinada: 4.2.5)
- **Entry point**: `_worker.js` (bundle gerado pelo WorkflowBundler)
- **Port**: 8080 (padrão WinterJS)
- **Environment variables**: Injetadas via `--forward-host-env`
- **Segurança**: Executa como usuário non-root
- **Cache pré-aquecido**: WinterJS package cached no build (~10-20MB)
- **Reproduzível**: Versão pinada do Wasmer CLI garante builds consistentes

**Estrutura:**
```dockerfile
# Versão pinada do Wasmer CLI
ARG WASMER_VERSION=4.2.5

FROM debian:bookworm-slim

# Instalar bash, curl e ca-certificates
RUN apt-get update && apt-get install -y bash curl ca-certificates

# Instalar Wasmer CLI com versão específica
RUN curl https://get.wasmer.io -sSfL | sh -s ${WASMER_VERSION}
ENV PATH="/root/.wasmer/bin:${PATH}"

# Pré-aquecer cache do WinterJS (elimina latência na primeira execução)
RUN wasmer run wasmer/winterjs --help || true

# Copiar bundle
WORKDIR /app
COPY _worker.js /app/_worker.js

# Configurar runtime e usuário non-root
ENV PORT=8080
EXPOSE 8080
RUN useradd -m -u 1000 winterjs
RUN cp -r /root/.wasmer /home/winterjs/.wasmer
RUN chown -R winterjs:winterjs /home/winterjs/.wasmer /app
USER winterjs
ENV PATH="/home/winterjs/.wasmer/bin:${PATH}"

# Executar WinterJS (bash está disponível)
CMD ["bash", "-lc", "wasmer run wasmer/winterjs --net --forward-host-env --mapdir=/app:/app /app/_worker.js"]
```

### Build e Deploy

**Build da imagem:**
```bash
# Gerar bundle primeiro
const result = await bundler.bundle({ workflowId, generatedCode, usedNodes })
fs.writeFileSync('_worker.js', result.bundleCode)

# Build Docker image do diretório raiz do repositório
# O .dockerignore está no root e garante que apenas _worker.js é copiado
docker build -f backend/templates/Dockerfile.winterjs -t my-workflow:latest .

# Build com versão específica do Wasmer
docker build \
  --build-arg WASMER_VERSION=4.2.5 \
  -f backend/templates/Dockerfile.winterjs \
  -t my-workflow:latest \
  .
```

**Executar localmente:**
```bash
docker run -p 8080:8080 \
  -e WORKFLOW_ID=test-workflow \
  -e SECRET_resend_api_key=re_xxx \
  my-workflow:latest
```

**Deploy no Kubernetes:**
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-workflow
spec:
  template:
    spec:
      containers:
      - image: registry.example.com/my-workflow:latest
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: workflow-config
        - secretRef:
            name: workflow-secrets
```

### Environment Variables

O Dockerfile usa `--forward-host-env` para repassar variáveis do container para WinterJS:

**Como funciona:**
1. Kubernetes injeta variáveis via ConfigMap/Secrets no container
2. Wasmer CLI repassa variáveis para WASM guest via `--forward-host-env`
3. WinterJS disponibiliza variáveis no objeto `env` do worker
4. Código do workflow acessa via `env.WORKFLOW_ID`, `env.SECRET_*`

**Exemplo de ConfigMap:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-config
data:
  WORKFLOW_ID: "my-workflow-123"
```

**Exemplo de Secret:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: workflow-secrets
type: Opaque
stringData:
  SECRET_resend_api_key: "re_xxxxxxxxxxxxx"
```

### Otimizações

**Tamanho da imagem:**
- Base image: ~150-200MB (Debian + Wasmer + bash)
- Wasmer cache (WinterJS pre-cached): ~10-20MB
- Bundle workflow: ~50-200KB
- **Total**: ~160-220MB

**Startup time:**
- Cold start: ~2-5 segundos (com cache pré-aquecido)
- Warm start: ~100-500ms
- Primeira execução rápida (WinterJS já cached no build)

**Reproduzibilidade:**
- Versão pinada do Wasmer CLI (padrão: 4.2.5)
- Builds consistentes ao longo do tempo
- Facilita testes e rollback

**Melhorias futuras:**
- Multi-stage build para reduzir tamanho (~20-30MB)
- Cache compartilhado de Wasmer CLI entre builds
- Considerar Alpine Linux (se compatível, ~50MB menor)

### Documentação Completa

Para instruções detalhadas de build, deploy e troubleshooting, consulte:
- `backend/templates/README.md` - Guia completo do Dockerfile
- `backend/templates/Dockerfile.winterjs` - Template com comentários inline

## API Endpoint para Build

O sistema fornece um endpoint REST para gerar todos os artifacts de deployment de um workflow.

### POST /api/workflows/:id/build-winterjs

**Autenticação:** Requerida (Bearer token)

**Parâmetros:**
- `id` (path) - ID do workflow a ser buildado

**Response:**
- Content-Type: `application/gzip`
- Content-Disposition: `attachment; filename="{workflow-name}-{timestamp}.tar.gz"`
- Format: tar.gz archive only (zip format not supported)
- Headers customizados:
  - `X-Workflow-Id` - ID do workflow
  - `X-Workflow-Name` - Nome do workflow
  - `X-Bundle-Size` - Tamanho do bundle JavaScript em bytes
  - `X-Archive-Size` - Tamanho total do tar.gz em bytes
  - `X-Build-Timestamp` - ISO 8601 timestamp do build
  - `X-Environment-Variables` - JSON com lista de env vars requeridas

**Conteúdo do tar.gz:**
1. `_worker.js` - Bundle JavaScript compilado e otimizado
2. `Dockerfile` - Template WinterJS configurado
3. `.dockerignore` - Regras de exclusão para Docker build
4. `README.md` - Quick start guide específico do workflow
5. `example.env` - Template de variáveis de ambiente com secrets detectados
6. `DEPLOYMENT.md` - Guia completo de deployment

**Exemplo de uso:**
```bash
# Download do pacote de deployment
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/workflows/abc123/build-winterjs \
  -o workflow-deployment.tar.gz

# Extrair e fazer build
tar -xzf workflow-deployment.tar.gz
cd workflow-deployment/
cp example.env .env
# Editar .env com secrets reais
docker build -t my-workflow .
docker run --env-file .env -p 8080:8080 my-workflow

# Ou deploy no Kubernetes
kubectl apply -f README.md  # contém YAML inline
```

**Processo interno:**
1. Valida autenticação e ownership do workflow
2. Compila workflow via `WorkflowCompiler.compileAndBundle()`
3. Cria diretório temporário único
4. Gera todos os artifacts (bundle, README, env, etc.)
5. Cria tar.gz com flag portable
6. Retorna buffer com metadata nos headers
7. Cleanup automático do diretório temporário

**Tratamento de erros:**
- `404` - Workflow não encontrado ou usuário sem permissão
- `400` - Falha na compilação/bundling do workflow
- `500` - Erro interno durante geração dos artifacts

**Performance:**
- Tempo típico: 2-5 segundos (inclui compilação + bundling)
- Tamanho do tar.gz: 100-300 KB (dependendo do workflow)
- Usa diretório temporário (limpo automaticamente)

**Segurança:**
- Requer autenticação via Bearer token
- Valida ownership do workflow (usuário só pode buildar próprios workflows)
- Secrets nunca incluídos no pacote (apenas placeholders em example.env)
- Cleanup garantido via finally block
- Filename sanitizado para prevenir path traversal

**Integração com frontend:**
```typescript
// Exemplo de chamada do frontend
const response = await fetch(`/api/workflows/${workflowId}/build-winterjs`, {
  headers: { 'Authorization': `Bearer ${token}` }
})

if (response.ok) {
  // Extrair metadata dos headers
  const metadata = {
    workflowId: response.headers.get('X-Workflow-Id'),
    bundleSize: response.headers.get('X-Bundle-Size'),
    archiveSize: response.headers.get('X-Archive-Size'),
    timestamp: response.headers.get('X-Build-Timestamp'),
    envVars: JSON.parse(response.headers.get('X-Environment-Variables') || '{}')
  }
  
  // Download do arquivo
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${metadata.workflowId}-${Date.now()}.tar.gz`
  a.click()
  URL.revokeObjectURL(url)
}
```

## Diferenças e Limitações

### WinterJS vs Cloudflare Workers

Diferenças importantes a considerar:

1. **Cache API**
   - WinterJS tem `caches.default` mas é memory-backed
   - **Não persiste entre restarts do container**
   - Cloudflare Workers tem cache distribuído globalmente
   - **Impacto**: Se usar cache no futuro, comportamento será diferente

2. **Bindings**
   - WinterJS não tem bindings Cloudflare (Queues, KV, R2, D1, etc.)
   - **Impacto**: Usar alternativas baseadas em HTTP (ex: Redis via HTTP, S3 via HTTP)

3. **ExecutionContext**
   - WinterJS pode não implementar `ctx.waitUntil()`
   - **Impacto atual**: Nenhum (não usado no código)
   - **Impacto futuro**: Usar promises normais ou top-level await

4. **Compatibility flags**
   - Cloudflare tem flags de compatibilidade (`nodejs_compat`, etc.)
   - WinterJS não tem sistema de flags
   - **Impacto**: Garantir uso apenas de APIs padrão

5. **Performance**
   - WinterJS roda em container (Knative) com cold start
   - Cloudflare Workers roda em edge network global sem cold start
   - **Impacto**: Latência pode ser maior em WinterJS, especialmente em cold starts

6. **Isolamento**
   - Cloudflare Workers: isolamento via V8 isolates (extremamente leve)
   - WinterJS/Knative: isolamento via containers (mais pesado)
   - **Impacto**: Menor densidade de execuções simultâneas em WinterJS

### Adaptações Necessárias

Mudanças mínimas necessárias para deploy em WinterJS:

1. **Remover env.EXECUTIONS_QUEUE**
   - **Status**: ✅ Concluído
   - **Implementação**: Eventos de execução agora são registrados via logger (logger.info/logger.error)

2. **Injeção de variáveis de ambiente**
   - **Necessidade**: Criar shim para carregar `env` object de variáveis de ambiente do container
   - **Implementação sugerida**:
     ```typescript
     const env = {
       WORKFLOW_ID: process.env.WORKFLOW_ID,
       ...Object.fromEntries(
         Object.entries(process.env)
           .filter(([key]) => key.startsWith('SECRET_'))
       )
     }
     ```

3. **Secrets loading**
   - **Necessidade**: Carregar secrets de variáveis de ambiente no início do worker
   - **Implementação**: Mapear `env.SECRET_*` para `process.env.SECRET_*`

## Recomendações

### Para Manter Compatibilidade Dual (Cloudflare + WinterJS)

1. **Manter formato `export default { async fetch() }`**
   - ✅ Suportado por ambos os runtimes
   - ✅ Formato atual já usa este padrão

2. **Usar apenas APIs Web padrão**
   - ✅ Já implementado
   - ✅ Nenhuma API Node.js ou Cloudflare-específica

3. **Evitar bindings Cloudflare-específicos**
   - ✅ Implementado - nenhum binding Cloudflare-específico
   - ⚠️ Futuros recursos devem usar APIs HTTP ao invés de bindings

4. **Documentar diferenças de comportamento**
   - ✅ Este documento cobre as diferenças principais
   - 📝 Atualizar conforme novos recursos são adicionados

5. **Testar em ambos os runtimes**
   - ⏳ Configurar CI/CD para testar código gerado em WinterJS
   - ⏳ Validar comportamento idêntico em casos de uso comuns

### Para Deploy em WinterJS/Knative

1. **Criar shim para carregar `env` object**
   - Mapear variáveis de ambiente do container para object `env`
   - Suportar prefixo `SECRET_` para secrets

2. **Bundlar código + runtime + node runtimes**
   - Usar bundler (esbuild, rollup) para criar arquivo único
   - Incluir todos os runtimes de nodes usados no workflow
   - Gerar arquivo otimizado para WinterJS

3. **Criar Dockerfile baseado em imagem WinterJS**
   - Usar imagem oficial WinterJS
   - Copiar bundle gerado
   - Configurar entrypoint

4. **Configurar Knative Service**
   - Definir ConfigMaps para variáveis de ambiente
   - Definir Secrets para credenciais
   - Configurar autoscaling (min/max replicas)
   - Configurar resource limits

## Próximos Passos

Referência para as fases seguintes do projeto:

- **WINTER-2**: ✅ Concluído: Dependência removida
  - Eventos de execução agora usam logger.info() e logger.error()
  - Código gerado não tem nenhuma dependência Cloudflare-específica

- **WINTER-3**: ✅ Concluído: Bundler implementado
  - Sistema de bundling implementado com esbuild
  - Suporta workspace dependencies e gera bundles compatíveis com WinterJS
  - Integrado ao WorkflowCompiler via método compileAndBundle()

- **WINTER-4**: ✅ Concluído: Dockerfile template criado
  - Template parametrizável em `backend/templates/Dockerfile.winterjs`
  - Baseado em Debian Bookworm Slim + Wasmer CLI
  - Suporta injeção de variáveis via `--forward-host-env`
  - Documentação completa em `backend/templates/README.md`
  - Otimizado para tamanho (~150-200MB) e startup time

- **WINTER-5**: ✅ Concluído: Endpoint API para gerar artifacts de deploy
  - Endpoint `POST /api/workflows/:id/build-winterjs` implementado
  - Integra WorkflowCompiler.compileAndBundle() para gerar bundle
  - Lê templates do diretório `backend/templates/`
  - Gera README.md dinâmico com instruções específicas do workflow
  - Gera example.env com secrets detectados automaticamente
  - Cria arquivo tar.gz com todos os artifacts:
    - _worker.js (bundle JavaScript)
    - Dockerfile (template WinterJS)
    - .dockerignore (gerado dinamicamente)
    - README.md (instruções quick start)
    - example.env (template de variáveis)
    - DEPLOYMENT.md (guia completo)
  - Retorna arquivo downloadável com headers de metadata
  - Tratamento de erros robusto e logging detalhado
  - Autenticação e validação de ownership do workflow

## Referências

- [WinterJS GitHub](https://github.com/wasmerio/winterjs)
- [WinterCG Specification](https://wintercg.org/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Knative Documentation](https://knative.dev/)