import { describe, test, expect } from 'bun:test'
import { DeploymentReadmeGenerator, type ReadmeOptions } from './deployment-readme-generator'

function createTestOptions(overrides?: Partial<ReadmeOptions>): ReadmeOptions {
  return {
    workflowName: 'Test Workflow',
    workflowId: 'test-123',
    buildTimestamp: '2024-01-15T10:30:00.000Z',
    bundleSize: 156000,
    environmentVariables: {
      workflowId: true,
      secrets: ['resend_api_key']
    },
    metadata: {
      nodeCount: 5,
      edgeCount: 4,
      hasLoops: false,
      maxDepth: 3
    },
    ...overrides
  }
}

describe('DeploymentReadmeGenerator - Basic Generation', () => {
  const generator = new DeploymentReadmeGenerator()

  test('should generate README with workflow info', () => {
    const options = createTestOptions()
    const readme = generator.generate(options)

    expect(readme).toContain('Test Workflow')
    expect(readme).toContain('test-123')
    expect(readme).toContain('2024-01-15T10:30:00.000Z')
    expect(readme).toContain('152.3 KB')
  })

  test('should format bundle size correctly - bytes', () => {
    const options = createTestOptions({ bundleSize: 500 })
    const readme = generator.generate(options)

    expect(readme).toContain('< 1 KB')
  })

  test('should format bundle size correctly - kilobytes', () => {
    const options = createTestOptions({ bundleSize: 1536 })
    const readme = generator.generate(options)

    expect(readme).toContain('1.5 KB')
  })

  test('should format bundle size correctly - megabytes', () => {
    const options = createTestOptions({ bundleSize: 1572864 })
    const readme = generator.generate(options)

    expect(readme).toContain('1.5 MB')
  })

  test('should include metadata stats', () => {
    const options = createTestOptions({
      metadata: {
        nodeCount: 10,
        edgeCount: 15,
        hasLoops: true,
        maxDepth: 7
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('Nodes**: 10')
    expect(readme).toContain('Edges**: 15')
    expect(readme).toContain('Max Depth**: 7')
  })
})

describe('DeploymentReadmeGenerator - Environment Variables', () => {
  const generator = new DeploymentReadmeGenerator()

  test('should list WORKFLOW_ID when used', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: true,
        secrets: []
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('WORKFLOW_ID')
    expect(readme).toContain('Unique workflow identifier')
  })

  test('should list all secrets', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets: ['resend_api_key', 'stripe_key']
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('SECRET_resend_api_key')
    expect(readme).toContain('SECRET_stripe_key')
  })

  test('should handle workflow with no env vars', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets: []
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('does not require any environment variables')
    expect(readme).not.toContain('WORKFLOW_ID')
    expect(readme).not.toContain('SECRET_')
  })

  test('should generate descriptive secret descriptions', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets: ['resend_api_key', 'github_token', 'database_password']
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('Resend Api Key')
    expect(readme).toContain('Github Token')
    expect(readme).toContain('Database Password')
  })
})

describe('DeploymentReadmeGenerator - Docker Commands', () => {
  const generator = new DeploymentReadmeGenerator()

  test('should generate docker build command', () => {
    const options = createTestOptions()
    const readme = generator.generate(options)

    expect(readme).toContain('docker build')
    expect(readme).toContain('test-workflow:latest')
  })

  test('should generate docker run command with env vars', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: true,
        secrets: ['resend_api_key', 'stripe_key']
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('docker run -p 8080:8080')
    expect(readme).toContain('-e WORKFLOW_ID=')
    expect(readme).toContain('-e SECRET_resend_api_key=')
    expect(readme).toContain('-e SECRET_stripe_key=')
  })

  test('should sanitize workflow name for docker tag', () => {
    const testCases = [
      { input: 'My Workflow', expected: 'my-workflow' },
      { input: 'Test_Workflow-123', expected: 'test-workflow-123' },
      { input: 'Special@#$%Characters!', expected: 'special-characters' },
      { input: '---Multiple---Hyphens---', expected: 'multiple-hyphens' }
    ]

    for (const { input, expected } of testCases) {
      const options = createTestOptions({ workflowName: input })
      const readme = generator.generate(options)

      expect(readme).toContain(`${expected}:latest`)
    }
  })

  test('should include curl test command', () => {
    const options = createTestOptions()
    const readme = generator.generate(options)

    expect(readme).toContain('curl -X POST http://localhost:8080')
    expect(readme).toContain('"trigger": "manual"')
  })
})

describe('DeploymentReadmeGenerator - Kubernetes YAML', () => {
  const generator = new DeploymentReadmeGenerator()

  test('should generate ConfigMap YAML when WORKFLOW_ID is used', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: true,
        secrets: []
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('kind: ConfigMap')
    expect(readme).toContain('name: test-workflow-config')
    expect(readme).toContain('WORKFLOW_ID:')
  })

  test('should not generate ConfigMap when WORKFLOW_ID is not used', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets: ['resend_api_key']
      }
    })
    const readme = generator.generate(options)

    expect(readme).not.toContain('kind: ConfigMap')
  })

  test('should generate Secret YAML with all secrets', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets: ['resend_api_key', 'stripe_key', 'openai_api_key']
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('kind: Secret')
    expect(readme).toContain('name: test-workflow-secrets')
    expect(readme).toContain('stringData:')
    expect(readme).toContain('SECRET_resend_api_key:')
    expect(readme).toContain('SECRET_stripe_key:')
    expect(readme).toContain('SECRET_openai_api_key:')
  })

  test('should generate Knative Service YAML', () => {
    const options = createTestOptions()
    const readme = generator.generate(options)

    expect(readme).toContain('apiVersion: serving.knative.dev/v1')
    expect(readme).toContain('kind: Service')
    expect(readme).toContain('name: test-workflow')
    expect(readme).toContain('image: registry.example.com/test-workflow:latest')
    expect(readme).toContain('containerPort: 8080')
  })

  test('should include envFrom with configMapRef when WORKFLOW_ID is used', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: true,
        secrets: []
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('envFrom:')
    expect(readme).toContain('configMapRef:')
    expect(readme).toContain('name: test-workflow-config')
  })

  test('should include envFrom with secretRef when secrets are used', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets: ['resend_api_key']
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('envFrom:')
    expect(readme).toContain('secretRef:')
    expect(readme).toContain('name: test-workflow-secrets')
  })

  test('should not include envFrom when no env vars are used', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets: []
      }
    })
    const readme = generator.generate(options)

    expect(readme).not.toContain('envFrom:')
  })

  test('should generate kubectl apply commands', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: true,
        secrets: ['resend_api_key']
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('kubectl apply -f configmap.yaml')
    expect(readme).toContain('kubectl apply -f secret.yaml')
    expect(readme).toContain('kubectl apply -f knative-service.yaml')
  })
})

describe('DeploymentReadmeGenerator - Edge Cases', () => {
  const generator = new DeploymentReadmeGenerator()

  test('should handle very long workflow names', () => {
    const longName = 'A'.repeat(100)
    const options = createTestOptions({ workflowName: longName })
    const readme = generator.generate(options)

    // Should be truncated to 63 characters (Kubernetes limit)
    const sanitizedName = 'a'.repeat(63)
    expect(readme).toContain(`${sanitizedName}:latest`)
  })

  test('should handle many secrets', () => {
    const secrets = Array.from({ length: 25 }, (_, i) => `secret_${i}`)
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets
      }
    })
    const readme = generator.generate(options)

    // Verify all secrets are listed
    for (const secret of secrets) {
      expect(readme).toContain(`SECRET_${secret}`)
    }
  })

  test('should handle special characters in workflow name', () => {
    const options = createTestOptions({
      workflowName: 'Test 🚀 Workflow! (Version 2.0)'
    })
    const readme = generator.generate(options)

    // Should be sanitized
    expect(readme).toContain('test-workflow-version-2-0:latest')
  })

  test('should generate descriptive placeholders for common services', () => {
    const options = createTestOptions({
      environmentVariables: {
        workflowId: false,
        secrets: ['resend_api_key', 'stripe_key', 'openai_api_key', 'github_token']
      }
    })
    const readme = generator.generate(options)

    expect(readme).toContain('re_xxxxxxxxxxxxx')
    expect(readme).toContain('sk_test_xxxxxxxxxxxxx')
    expect(readme).toContain('sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
    expect(readme).toContain('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
  })

  test('should include all expected sections', () => {
    const options = createTestOptions()
    const readme = generator.generate(options)

    expect(readme).toContain('# Deployment Package:')
    expect(readme).toContain('## Environment Variables Required')
    expect(readme).toContain('## Quick Start')
    expect(readme).toContain('### 1. Build Docker Image')
    expect(readme).toContain('### 2. Run Locally')
    expect(readme).toContain('### 3. Test the Workflow')
    expect(readme).toContain('## Kubernetes Deployment')
    expect(readme).toContain('## Files Included')
    expect(readme).toContain('## Next Steps')
  })
})
