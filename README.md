# Ezzy Cloud

> Visual workflow automation platform that compiles to executable Cloudflare Workers

Ezzy Cloud is a modern workflow automation platform that lets you build complex integrations and automations through a visual interface. Create workflows by connecting nodes, then compile them to optimized JavaScript code deployable as Cloudflare Workers.

## ✨ Features

### Authentication & Security
- **Multiple Auth Methods**: Email/password, Google OAuth, passwordless (Email OTP, passkeys)
- **Two-Factor Authentication**: TOTP-based 2FA for enhanced security
- **Organization Management**: Multi-tenant support with role-based access
- **API Keys**: Generate keys for programmatic access
- **Session Management**: Secure httpOnly cookie-based sessions
- **CAPTCHA Protection**: Cloudflare Turnstile integration
- **Secrets Encryption**: AES-256-GCM encrypted secret storage

### Visual Workflow Editor
- **Drag-and-Drop Interface**: Intuitive ReactFlow-based canvas
- **Real-Time Validation**: Instant feedback on node configuration
- **Smart Connections**: Type-safe node connections with visual handles
- **Node Palette**: Organized library of core and integration nodes

### Three-Tier Node System

#### Core Nodes (Structural)
Control flow and workflow logic:
- **If**: Conditional branching
- **Switch**: Multi-way branching
- **For**: Iteration and loops
- **Merge**: Combine multiple branches
- **Trigger**: Workflow entry points

#### Default Library (Built-in Actions)
Pre-built integrations:
- **HTTP Request**: Make API calls
- **Code**: Execute custom JavaScript
- More coming soon...

#### External Library (Community)
Extensible plugin system for community integrations

### Workflow Compilation
- **Visual to Code**: Compile visual workflows to optimized JavaScript
- **Static Analysis**: Detect cycles, validate structure, calculate complexity
- **Code Generation**: Generate production-ready Cloudflare Worker code
- **Error Detection**: Comprehensive validation with helpful warnings

## Runtime Compatibility

O código gerado pela plataforma é compatível com múltiplos runtimes JavaScript:

- ✅ **Cloudflare Workers** - Runtime original, totalmente suportado
- ✅ **WinterJS** - Runtime compatível para deploy em Kubernetes/Knative
- ✅ **Deno** - Compatível (com adaptações mínimas)
- ⚠️ **Node.js 18+** - Compatível (requer polyfills para algumas Web APIs)

### Por que é compatível?

Todo o código gerado usa **apenas APIs Web padrão** (WinterCG):
- fetch(), crypto, Response, Request, URL
- Nenhuma API Node.js-específica
- Nenhum binding Cloudflare-específico

Para detalhes completos, veja [docs/winterjs-compatibility.md](docs/winterjs-compatibility.md).

### Bundling para Deploy

O projeto inclui sistema de bundling automático para gerar artifacts de deploy:

**WorkflowBundler** (`backend/lib/workflow-bundler.ts`):
- Empacota workflow compilado + runtime + node runtimes em arquivo único
- Usa esbuild para bundling rápido e eficiente
- Resolve workspace dependencies automaticamente
- Gera bundle JavaScript compatível com WinterJS e Cloudflare Workers
- Documenta variáveis de ambiente necessárias

**Uso via WorkflowCompiler**:
```typescript
const compiler = new WorkflowCompiler()
const result = await compiler.compileAndBundle(nodes, edges)

// result.code: TypeScript gerado
// result.bundle: JavaScript bundle para deploy
// result.bundleSize: Tamanho do bundle
```

Para detalhes completos sobre bundling e compatibilidade, veja [docs/winterjs-compatibility.md](docs/winterjs-compatibility.md).

### Containerização com Docker

O projeto inclui Dockerfile template para criar imagens Docker com WinterJS runtime:

**Template**: `backend/templates/Dockerfile.winterjs`
- Base image: Debian Bookworm Slim + Wasmer CLI
- Runtime: WinterJS (Cloudflare Workers-compatible)
- Tamanho: ~150-200MB (base + bundle)
- Suporta injeção de variáveis via Kubernetes ConfigMap/Secrets

**Build e deploy:**
```bash
# 1. Gerar bundle
const result = await compiler.compileAndBundle(nodes, edges)
fs.writeFileSync('_worker.js', result.bundle)

# 2. Build imagem Docker
docker build -f backend/templates/Dockerfile.winterjs -t my-workflow:latest .

# 3. Deploy no Kubernetes/Knative
kubectl apply -f knative-service.yaml
```

Para instruções completas, consulte `backend/templates/README.md`.

## API de Build e Deploy

O sistema fornece um endpoint REST para gerar automaticamente todos os artifacts necessários para deploy:

### POST /api/workflows/:id/build-winterjs

Gera um pacote tar.gz com todos os arquivos necessários para deploy do workflow em Docker/Kubernetes.

**Autenticação**: Requerida (Bearer token)

**Retorna**:
- Arquivo tar.gz contendo (formato zip não suportado):
  - `_worker.js` - Bundle JavaScript compilado
  - `Dockerfile` - Template WinterJS configurado
  - `.dockerignore` - Regras de exclusão
  - `README.md` - Quick start guide do workflow
  - `example.env` - Template de variáveis de ambiente
  - `DEPLOYMENT.md` - Guia completo de deployment

**Uso**:
```bash
# Download do pacote
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/workflows/abc123/build-winterjs \
  -o workflow.tar.gz

# Extrair e fazer deploy
tar -xzf workflow.tar.gz
cd workflow/
cp example.env .env  # Editar com secrets reais
docker build -t my-workflow .
docker run --env-file .env -p 8080:8080 my-workflow
```

**Recursos**:
- ✅ Auto-detecção de secrets necessários
- ✅ Geração de README específico do workflow
- ✅ Instruções Docker e Kubernetes incluídas
- ✅ Templates de ConfigMap/Secret prontos
- ✅ Metadata nos response headers (tamanhos, timestamp, env vars)

Para detalhes completos da API, consulte [docs/winterjs-compatibility.md](docs/winterjs-compatibility.md#api-endpoint-para-build).

### Deploy Options

1. **Cloudflare Workers for Platforms**: Deploy código TypeScript diretamente (Wrangler compila)
2. **Kubernetes + Knative + WinterJS**: Deploy bundle JavaScript em container

### Security & Secrets
- **AES-256-GCM Encryption**: Secure secret storage
- **Per-Workflow Secrets**: Isolated secret management
- **Environment Variables**: Safe deployment with Cloudflare Workers

### Developer Experience
- **TypeScript First**: Full type safety across the stack
- **Zod Schemas**: Runtime validation with static types
- **Hot Reload**: Fast development cycle
- **Comprehensive APIs**: RESTful backend with Elysia

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- PostgreSQL database
- Cloudflare Workers account (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ezzy-cloud.git
cd ezzy-cloud

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
# Required: DATABASE_URL, BETTER_AUTH_SECRET, SECRETS_MASTER_KEY
# Optional: GOOGLE_CLIENT_ID, TURNSTILE_SECRET_KEY, etc.

# Run database migrations
cd backend
bun drizzle-kit migrate

# Start development server
cd ..
bun run dev
```

The application will be available at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000/api

### Authentication Setup

Ezzy Cloud uses [Better Auth](https://better-auth.com) for comprehensive authentication. See the [Authentication Documentation](docs/authentication.md) for complete setup instructions.

**Quick Setup:**

1. **Generate Secrets:**
   ```bash
   # Generate Better Auth secret
   openssl rand -base64 32

   # Generate secrets master key
   openssl rand -hex 32
   ```

2. **Configure `.env`:**
   ```bash
   BETTER_AUTH_SECRET="<generated-secret>"
   BETTER_AUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
   SECRETS_MASTER_KEY="<generated-hex-key>"
   ```

3. **Optional - Google OAuth:**
   - Create project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add to `.env`:
     ```bash
     GOOGLE_CLIENT_ID="your-client-id"
     GOOGLE_CLIENT_SECRET="your-client-secret"
     NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-client-id"
     ```

4. **Optional - Turnstile CAPTCHA:**
   - Create site in [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Add to `.env`:
     ```bash
     TURNSTILE_SECRET_KEY="your-secret"
     NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-site-key"
     ```

For detailed authentication documentation, see [docs/authentication.md](docs/authentication.md).

## 📖 Documentation

- **[Architecture Overview](docs/architecture.md)** - System design and components
- **[Authentication](docs/authentication.md)** - Authentication setup and usage
- **[Node Development Guide](docs/node-development.md)** - Create custom nodes
- **API Reference** - Coming soon
- **Deployment Guide** - Coming soon

## 🏗️ Project Structure

```
ezzy-cloud/
├── web/                    # Next.js frontend
│   ├── src/
│   │   ├── app/(app)/create/  # Workflow editor
│   │   ├── lib/core-nodes/    # Core structural nodes
│   │   └── components/        # Shared UI components
├── backend/                # Elysia backend
│   ├── lib/                # Core libraries
│   │   ├── graph-analyzer.ts
│   │   ├── code-generator.ts
│   │   ├── workflow-compiler.ts
│   │   └── secrets-manager.ts
│   ├── modules/workflows/  # Workflow API routes
│   └── database/           # Drizzle ORM schemas
├── runtime/                # Workflow runtime utilities
│   ├── index.ts           # Context management
│   └── logger.ts          # Execution logging
├── nodes/                  # Default library nodes
│   ├── __base__/          # Node interface
│   ├── __core_nodes__/    # Node aggregator
│   ├── http-request/      # HTTP request node
│   └── code/              # Code execution node
└── docs/                   # Documentation
```

## 🎯 Key Concepts

### Workflow Lifecycle

1. **Design**: Create visual workflow in the editor
2. **Configure**: Set node properties and connections
3. **Validate**: Real-time validation and error detection
4. **Save**: Store workflow definition in database
5. **Compile**: Generate optimized JavaScript code
6. **Deploy**: Push to Cloudflare Workers
7. **Execute**: Run on edge with automatic scaling

### Node Types

**Structural Nodes** define control flow:
- No runtime execution code
- Create branching and loops
- Define workflow structure

**Action Nodes** perform operations:
- Execute actual work (API calls, data processing)
- Return typed results
- Can access secrets

### Compilation Pipeline

```
Visual Workflow → Graph Analysis → Code Generation → Cloudflare Worker
     (JSON)           (AST)           (JavaScript)      (Deployed)
```

## 🔧 Development

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test backend/lib/graph-analyzer.test.ts

# Watch mode
bun test --watch
```

### Building for Production

```bash
# Build all packages
bun run build

# Build specific package
cd web && bun run build
```

### Database Migrations

```bash
cd backend

# Generate migration
bun drizzle-kit generate

# Apply migration
bun drizzle-kit migrate

# Open Drizzle Studio
bun drizzle-kit studio
```

## 🎨 Creating Custom Nodes

See the [Node Development Guide](docs/node-development.md) for detailed instructions.

Quick example:

```typescript
// nodes/my-node/definition.ts
import { z } from "zod"
import { SiMyService } from "@icons-pack/react-simple-icons"

export const MyNode: INode = {
  name: "my-node",
  title: "My Custom Node",
  description: "Does something amazing",
  icon: SiMyService,
  nodeType: "action",
  category: "default-lib",
  properties: z.object({
    apiKey: z.string(),
    endpoint: z.string().url()
  }),
  result: z.object({
    success: z.boolean(),
    data: z.any()
  })
}

// nodes/my-node/runtime.ts
export default async function execute(props, secrets) {
  const response = await fetch(props.endpoint, {
    headers: { Authorization: `Bearer ${props.apiKey}` }
  })
  return { success: true, data: await response.json() }
}
```

## 🔐 Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ezzycloud

# Authentication (required)
BETTER_AUTH_SECRET=<base64-secret>  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Secrets encryption (required - generate with: openssl rand -hex 32)
SECRETS_MASTER_KEY=<64-character-hex-string>

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Turnstile CAPTCHA (optional)
TURNSTILE_SECRET_KEY=your-turnstile-secret
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key

# Application
NODE_ENV=development

# Email Service (optional - for email verification)
RESEND_API_KEY=re_...
MAIL_FROM="Ezzy Cloud <ezzycloud@email.com>"

# Other integrations (optional)
FORMBRICKS_API_KEY=...
AI_GATEWAY_API_KEY=...
```

See [docs/authentication.md](docs/authentication.md) for detailed authentication setup.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines (coming soon).

### Areas We Need Help
- [ ] Additional node integrations (Slack, Stripe, etc.)
- [ ] Test coverage improvements
- [ ] Documentation and tutorials
- [ ] UI/UX enhancements
- [ ] Performance optimizations

## 📝 API Reference

### Workflow Endpoints

```
GET    /api/workflows              List workflows
POST   /api/workflows              Create workflow
GET    /api/workflows/:id          Get workflow
PUT    /api/workflows/:id          Update workflow
DELETE /api/workflows/:id          Delete workflow
POST   /api/workflows/:id/compile  Compile workflow
POST   /api/workflows/:id/validate Validate workflow
POST   /api/workflows/:id/publish  Publish workflow
```

### Secrets Endpoints

```
GET    /api/workflows/:id/secrets           List secrets
POST   /api/workflows/:id/secrets           Create secret
DELETE /api/workflows/:id/secrets/:secretId Delete secret
```

## 🛣️ Roadmap

### v1.0 (Current)
- [x] Visual workflow editor
- [x] Core structural nodes
- [x] Default library nodes (HTTP, Code)
- [x] Workflow compilation
- [x] Secret management
- [x] Database persistence

### v1.1 (Next)
- [ ] Workflow templates
- [ ] Real-time collaboration
- [ ] Version control
- [ ] Webhook triggers
- [ ] Scheduled executions

### v2.0 (Future)
- [ ] Visual debugging
- [ ] A/B testing
- [ ] Analytics dashboard
- [ ] Marketplace
- [ ] Self-hosted option

## 📦 Technology Stack

- **Frontend**: Next.js 15, React 19, ReactFlow, TailwindCSS, shadcn/ui
- **Backend**: Elysia, Drizzle ORM, PostgreSQL
- **Runtime**: Cloudflare Workers
- **Validation**: Zod v4
- **Monorepo**: Turborepo
- **Package Manager**: Bun
- **Language**: TypeScript

## 📄 License

[MIT License](LICENSE)

## 🙏 Acknowledgments

- Built with [ReactFlow](https://reactflow.dev/)
- Icons from [Simple Icons](https://simpleicons.org/) and [Lucide](https://lucide.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Inspired by n8n, Zapier, and Make

## 🆘 Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/yourusername/ezzy-cloud/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/ezzy-cloud/discussions)

---

Made with ❤️ by the Ezzy Cloud team