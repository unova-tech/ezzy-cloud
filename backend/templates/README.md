# WinterJS Dockerfile Template

## Visão Geral

Este diretório contém templates para deploy de workflows no WinterJS runtime.

**Arquivo principal:**
- `Dockerfile.winterjs` - Template para criar imagem Docker com WinterJS runtime

## Pré-requisitos

**Antes de usar o Dockerfile:**

1. **Gerar bundle JavaScript:**
   - Usar `WorkflowBundler` para criar bundle do workflow
   - Bundle deve ser salvo como `_worker.js` no diretório raiz do repositório
   - Exemplo:
     ```typescript
     const bundler = new WorkflowBundler()
     const result = await bundler.bundle({
       workflowId: 'my-workflow',
       generatedCode: '...', // Código do CodeGenerator
       usedNodes: ['http-request', 'code'],
       minify: true
     })
     
     // Salvar bundle no diretório raiz do repositório
     fs.writeFileSync('_worker.js', result.bundleCode)
     ```

2. **Identificar variáveis de ambiente necessárias:**
   - Verificar `result.environmentVariables` do bundler
   - Listar secrets usados pelo workflow
   - Preparar ConfigMaps e Secrets do Kubernetes

## Build da Imagem

**IMPORTANTE**: O build deve ser executado do diretório raiz do repositório, pois o `.dockerignore` está localizado lá.

**Comando básico:**
```bash
# Execute do diretório raiz do repositório (onde está o .dockerignore)
docker build -f backend/templates/Dockerfile.winterjs -t my-workflow:latest .
```

**Com versão específica do Wasmer:**
```bash
docker build \
  -f backend/templates/Dockerfile.winterjs \
  --build-arg WASMER_VERSION=4.2.5 \
  -t my-workflow:latest \
  .
```

**Com build args customizados:**
```bash
docker build \
  -f backend/templates/Dockerfile.winterjs \
  -t my-workflow:v1.0.0 \
  --build-arg WASMER_VERSION=4.2.5 \
  --build-arg WORKFLOW_VERSION=v1.0.0 \
  .
```

**Multi-platform build (para Kubernetes):**
```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f backend/templates/Dockerfile.winterjs \
  --build-arg WASMER_VERSION=4.2.5 \
  -t registry.example.com/workflows/my-workflow:latest \
  --push \
  .
```

## Versionamento do Wasmer CLI

O Dockerfile usa uma versão pinada do Wasmer CLI para garantir builds reproduzíveis.

**Versão padrão**: 4.2.5

**Como atualizar a versão:**

1. Verificar versões disponíveis: https://github.com/wasmerio/wasmer/releases
2. Testar nova versão localmente:
   ```bash
   docker build \
     --build-arg WASMER_VERSION=4.3.0 \
     -f backend/templates/Dockerfile.winterjs \
     -t my-workflow:test \
     .
   ```
3. Se funcionar, atualizar o `ARG WASMER_VERSION=4.3.0` no Dockerfile

**Por que versionar?**
- Garantir builds reproduzíveis ao longo do tempo
- Evitar quebras por mudanças upstream no Wasmer CLI
- Facilitar testes e rollback de versões

## Executar Localmente

**Comando básico:**
```bash
docker run -p 8080:8080 my-workflow:latest
```

**Com variáveis de ambiente:**
```bash
docker run -p 8080:8080 \
  -e WORKFLOW_ID=test-workflow-123 \
  -e SECRET_resend_api_key=re_xxxxxxxxxxxxx \
  -e SECRET_stripe_key=sk_test_xxxxxxxxxxxxx \
  my-workflow:latest
```

**Com arquivo .env:**
```bash
docker run -p 8080:8080 --env-file workflow.env my-workflow:latest
```

**Testar o workflow:**
```bash
# Trigger manual (POST request)
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"trigger": "manual", "data": {"test": true}}'

# Webhook trigger
curl -X POST http://localhost:8080/webhook/my-workflow \
  -H "Content-Type: application/json" \
  -d '{"event": "user.created", "userId": "123"}'
```

## Deploy no Kubernetes/Knative

**1. Push da imagem para registry:**
```bash
# Tag para registry
docker tag my-workflow:latest registry.example.com/workflows/my-workflow:v1.0.0

# Push
docker push registry.example.com/workflows/my-workflow:v1.0.0
```

**2. Criar ConfigMap com variáveis:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-workflow-config
data:
  WORKFLOW_ID: "my-workflow-123"
  NODE_ENV: "production"
```

**3. Criar Secret com credenciais:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-workflow-secrets
type: Opaque
stringData:
  SECRET_resend_api_key: "re_xxxxxxxxxxxxx"
  SECRET_stripe_key: "sk_live_xxxxxxxxxxxxx"
```

**4. Criar Knative Service:**
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-workflow
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
      - image: registry.example.com/workflows/my-workflow:v1.0.0
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: my-workflow-config
        - secretRef:
            name: my-workflow-secrets
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
```

**5. Aplicar manifests:**
```bash
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f knative-service.yaml
```

**6. Obter URL do serviço:**
```bash
kubectl get ksvc my-workflow -o jsonpath='{.status.url}'
```

## Troubleshooting

**Problema: Container não inicia**

Verificar logs:
```bash
docker logs <container-id>
# ou no Kubernetes:
kubectl logs -l serving.knative.dev/service=my-workflow
```

Erros comuns:
- `_worker.js not found`: Bundle não foi copiado corretamente
- `wasmer: command not found`: PATH não configurado (usar `bash -lc`)
- `Permission denied`: Problema com usuário non-root (verificar ownership de `/app`)

**Problema: Worker não responde a requests**

Verificar se porta está exposta:
```bash
docker ps  # Verificar port mapping
curl http://localhost:8080  # Testar localmente
```

Verificar logs do WinterJS:
- Procurar por erros de runtime JavaScript
- Verificar se `export default { async fetch() }` está presente no bundle

**Problema: Variáveis de ambiente não funcionam**

Verificar se `--forward-host-env` está no comando:
```bash
docker exec <container-id> env  # Listar variáveis no container
```

Verificar se variáveis estão sendo injetadas:
- Kubernetes: `kubectl describe pod <pod-name>`
- Procurar seção `Environment` e `Mounts`

**Problema: Performance ruim / Cold starts lentos**

Otimizações:
- Reduzir tamanho do bundle (minify, tree-shaking)
- Configurar `minScale: 1` no Knative (manter 1 instância sempre ativa)
- Usar imagem Docker menor (considerar Alpine se funcionar)
- Pre-pull da imagem nos nodes do Kubernetes

**Problema: Primeira execução lenta após deploy**

A imagem já inclui cache pré-aquecido do WinterJS:
- O Dockerfile executa `wasmer run wasmer/winterjs --help` durante o build
- Isso baixa e cacheia o pacote WinterJS (~10-20MB)
- Primeira execução do container usa o cache e inicia rapidamente

Se ainda houver lentidão:
- Verificar se o cache foi copiado corretamente para `/home/winterjs/.wasmer`
- Verificar logs para downloads durante runtime (não deveria acontecer)

## Estrutura de Arquivos para Build

**Estrutura recomendada (build a partir do repositório raiz):**

```
ezzy-cloud/                    # Diretório raiz do repositório
├── _worker.js                 # Bundle gerado pelo WorkflowBundler (OBRIGATÓRIO)
├── .dockerignore              # Ignora arquivos exceto _worker.js
└── backend/
    └── templates/
        ├── Dockerfile.winterjs  # Template do Dockerfile
        ├── README.md            # Este arquivo
        └── example-workflow.env # Exemplo de variáveis
```

**Comando de build:**
```bash
# Do diretório raiz do repositório
docker build -f backend/templates/Dockerfile.winterjs -t my-workflow:latest .
```

**O .dockerignore garante que:**
- Apenas `_worker.js` é copiado para a imagem
- Arquivos grandes (node_modules, etc.) são ignorados
- Build é rápido e eficiente

**Nota:** O endpoint da fase WINTER-5 criará esta estrutura automaticamente.

## Tamanho da Imagem

**Tamanhos esperados:**
- Base image (Debian + Wasmer + bash): ~150-200MB
- Wasmer cache (WinterJS package): ~10-20MB
- Com bundle workflow: ~50-200KB (dependendo do workflow)
- **Total**: ~160-220MB

**O que aumenta o tamanho:**
- ✅ bash instalado (~5MB) - necessário para CMD funcionar
- ✅ Wasmer CLI binário (~20MB) - necessário para executar WinterJS
- ✅ WinterJS package cached (~10-20MB) - elimina latência na primeira execução
- ✅ ca-certificates (~1MB) - necessário para HTTPS

**Otimizações futuras:**
- Multi-stage build para reduzir tamanho (pode economizar ~20-30MB)
- Cache compartilhado de Wasmer CLI entre builds
- Considerar Alpine Linux (se compatível, pode economizar ~50MB)

## Segurança

**Boas práticas implementadas:**
- ✅ Usuário non-root (winterjs:winterjs)
- ✅ Minimal base image (Debian Slim)
- ✅ Secrets via Kubernetes Secrets (não hardcoded)
- ✅ Read-only filesystem para `/app` (pode ser configurado no Kubernetes)

**Recomendações adicionais:**
- Scan de vulnerabilidades: `docker scan my-workflow:latest`
- Usar registry privado para imagens
- Rotacionar secrets regularmente
- Configurar Network Policies no Kubernetes

## Referências

- [WinterJS Documentation](https://github.com/wasmerio/winterjs)
- [Wasmer CLI Documentation](https://docs.wasmer.io/runtime/cli)
- [Knative Serving Documentation](https://knative.dev/docs/serving/)
- [Compatibility Matrix](../../docs/winterjs-compatibility.md)

## Próximos Passos

- **WINTER-5**: Endpoint API para gerar bundle + Dockerfile automaticamente
- **Deploy automation**: CI/CD pipeline para build e deploy automático
- **Monitoring**: Integração com Prometheus/Grafana para métricas
- **Logging**: Agregação de logs com Loki ou ELK stack