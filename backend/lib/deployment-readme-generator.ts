/**
 * Deployment README Generator
 * 
 * Generates workflow-specific deployment instructions for WinterJS/Kubernetes deployments.
 * Creates README.md with Docker commands, Kubernetes manifests, and environment variable documentation.
 */

export interface ReadmeOptions {
  workflowName: string
  workflowId: string
  buildTimestamp: string
  bundleSize: number
  environmentVariables: {
    workflowId: boolean
    secrets: string[]
  }
  metadata: {
    nodeCount: number
    edgeCount: number
    hasLoops: boolean
    maxDepth: number
  }
}

export class DeploymentReadmeGenerator {
  /**
   * Generate workflow-specific deployment README
   */
  generate(options: ReadmeOptions): string {
    const {
      workflowName,
      workflowId,
      buildTimestamp,
      bundleSize,
      environmentVariables,
      metadata
    } = options

    const sanitizedName = this.sanitizeWorkflowName(workflowName)
    const formattedSize = this.formatBundleSize(bundleSize)
    const hasEnvVars = environmentVariables.workflowId || environmentVariables.secrets.length > 0

    return `# Deployment Package: ${workflowName}

**Workflow ID**: ${workflowId}
**Generated**: ${buildTimestamp}
**Bundle Size**: ${formattedSize}
**Nodes**: ${metadata.nodeCount} | **Edges**: ${metadata.edgeCount} | **Max Depth**: ${metadata.maxDepth}

${hasEnvVars ? this.generateEnvironmentVariablesSection(environmentVariables) : this.generateNoEnvVarsSection()}

## Quick Start

### 1. Build Docker Image

\`\`\`bash
docker build -t ${sanitizedName}:latest .
\`\`\`

### 2. Run Locally

\`\`\`bash
docker run -p 8080:8080 \\
${this.generateDockerRunEnvVars(environmentVariables)}  ${sanitizedName}:latest
\`\`\`

### 3. Test the Workflow

\`\`\`bash
curl -X POST http://localhost:8080 \\
  -H "Content-Type: application/json" \\
  -d '{"trigger": "manual", "data": {"test": true}}'
\`\`\`

## Kubernetes Deployment

${this.generateKubernetesSection(sanitizedName, environmentVariables)}

## Files Included

- \`_worker.js\` - Workflow bundle (JavaScript)
- \`Dockerfile\` - Docker image definition
- \`.dockerignore\` - Docker build context filter
- \`README.md\` - This file (quick start guide)
- \`example.env\` - Environment variables template
- \`DEPLOYMENT.md\` - Comprehensive deployment guide

## Next Steps

1. Review \`DEPLOYMENT.md\` for detailed instructions
2. Customize \`example.env\` with your actual values
3. Build and test locally before deploying to Kubernetes
4. Set up monitoring and logging for production

For troubleshooting and advanced configuration, see \`DEPLOYMENT.md\`.
`
  }

  private generateEnvironmentVariablesSection(envVars: ReadmeOptions['environmentVariables']): string {
    const vars: string[] = []

    if (envVars.workflowId) {
      vars.push('- `WORKFLOW_ID` - Unique workflow identifier (optional, auto-generated if not set)')
    }

    for (const secret of envVars.secrets) {
      vars.push(`- \`SECRET_${secret}\` - ${this.formatSecretDescription(secret)}`)
    }

    return `## Environment Variables Required

This workflow requires the following environment variables:

${vars.join('\n')}
`
  }

  private generateNoEnvVarsSection(): string {
    return `## Environment Variables

This workflow does not require any environment variables.
`
  }

  private generateDockerRunEnvVars(envVars: ReadmeOptions['environmentVariables']): string {
    const envLines: string[] = []

    if (envVars.workflowId) {
      envLines.push('-e WORKFLOW_ID=my-workflow-123 \\')
    }

    for (const secret of envVars.secrets) {
      envLines.push(`  -e SECRET_${secret}=${this.generatePlaceholder(secret)} \\`)
    }

    return envLines.length > 0 ? envLines.join('\n') : ''
  }

  private generateKubernetesSection(
    sanitizedName: string,
    envVars: ReadmeOptions['environmentVariables']
  ): string {
    const hasConfigMap = envVars.workflowId
    const hasSecrets = envVars.secrets.length > 0

    let section = ''

    // ConfigMap
    if (hasConfigMap) {
      section += `### ConfigMap

\`\`\`yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${sanitizedName}-config
data:
  WORKFLOW_ID: "${sanitizedName}-123"
  NODE_ENV: "production"
\`\`\`

`
    }

    // Secret
    if (hasSecrets) {
      section += `### Secret

\`\`\`yaml
apiVersion: v1
kind: Secret
metadata:
  name: ${sanitizedName}-secrets
type: Opaque
stringData:
${envVars.secrets.map(secret => `  SECRET_${secret}: "${this.generatePlaceholder(secret)}"`).join('\n')}
\`\`\`

`
    }

    // Knative Service
    section += `### Knative Service

\`\`\`yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${sanitizedName}
spec:
  template:
    spec:
      containers:
      - image: registry.example.com/${sanitizedName}:latest
        ports:
        - containerPort: 8080
${this.generateEnvFromSection(hasConfigMap, hasSecrets, sanitizedName)}
\`\`\`

### Deploy

\`\`\`bash
${hasConfigMap ? 'kubectl apply -f configmap.yaml\n' : ''}${hasSecrets ? 'kubectl apply -f secret.yaml\n' : ''}kubectl apply -f knative-service.yaml
\`\`\`
`

    return section
  }

  private generateEnvFromSection(
    hasConfigMap: boolean,
    hasSecrets: boolean,
    sanitizedName: string
  ): string {
    if (!hasConfigMap && !hasSecrets) {
      return ''
    }

    const lines: string[] = ['        envFrom:']

    if (hasConfigMap) {
      lines.push('        - configMapRef:')
      lines.push(`            name: ${sanitizedName}-config`)
    }

    if (hasSecrets) {
      lines.push('        - secretRef:')
      lines.push(`            name: ${sanitizedName}-secrets`)
    }

    return lines.join('\n')
  }

  private sanitizeWorkflowName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 63) // Kubernetes name limit
  }

  private formatBundleSize(bytes: number): string {
    if (bytes < 1024) {
      return '< 1 KB'
    }
    
    const kb = bytes / 1024
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`
    }
    
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  private formatSecretDescription(secretName: string): string {
    // Convert snake_case or kebab-case to Title Case
    const words = secretName.replace(/_/g, ' ').replace(/-/g, ' ').split(' ')
    const titleCase = words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    // Common secret patterns
    if (secretName.includes('api') && secretName.includes('key')) {
      return `${titleCase} for API authentication`
    }
    if (secretName.includes('token')) {
      return `${titleCase} for authentication`
    }
    if (secretName.includes('password') || secretName.includes('pass')) {
      return `${titleCase} for authentication`
    }
    
    return titleCase
  }

  private generatePlaceholder(secretName: string): string {
    // Generate descriptive placeholders
    if (secretName.includes('resend')) {
      return 're_xxxxxxxxxxxxx'
    }
    if (secretName.includes('stripe')) {
      return 'sk_test_xxxxxxxxxxxxx'
    }
    if (secretName.includes('openai')) {
      return 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
    if (secretName.includes('github')) {
      return 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
    
    return 'your_value_here'
  }
}
