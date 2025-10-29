import { and, eq } from "drizzle-orm"
import { Elysia, t } from "elysia"
import { authMacroPlugin } from "../../better-auth"
import db from "../../database"
import { workflowSecrets, workflows } from "../../database/schema"
import { SecretsManager } from "../../lib/secrets-manager"

// Get master key from environment
const getMasterKey = (): string => {
  const masterKey = process.env.SECRETS_MASTER_KEY
  if (!masterKey) {
    throw new Error("SECRETS_MASTER_KEY environment variable is not set")
  }
  return masterKey
}

export const secretsModule = new Elysia()
  .use(authMacroPlugin)
  // List all secret keys (not values) for a workflow
  .get(
    "/workflows/:id/secrets",
    async ({ params, user }) => {
      const { id: workflowId } = params

      // Verify workflow ownership
      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const secrets = await db
        .select({
          id: workflowSecrets.id,
          key: workflowSecrets.key,
          createdAt: workflowSecrets.createdAt,
          updatedAt: workflowSecrets.updatedAt
        })
        .from(workflowSecrets)
        .where(eq(workflowSecrets.workflowId, workflowId))

      return {
        success: true,
        secrets
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )

  // Set a secret
  .post(
    "/workflows/:id/secrets",
    async ({ params, body, user }) => {
      const { id: workflowId } = params
      const { key, value } = body

      // Verify workflow ownership
      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      // Encrypt the secret
      const secretsManager = new SecretsManager(getMasterKey())
      const encryptedValue = secretsManager.encrypt(value)

      // Check if secret already exists
      const existing = await db
        .select()
        .from(workflowSecrets)
        .where(
          and(
            eq(workflowSecrets.workflowId, workflowId),
            eq(workflowSecrets.key, key)
          )
        )
        .limit(1)

      let result
      if (existing.length > 0) {
        // Update existing secret
        result = await db
          .update(workflowSecrets)
          .set({
            encryptedValue,
            updatedAt: new Date()
          })
          .where(eq(workflowSecrets.id, existing[0].id))
          .returning()
      } else {
        // Create new secret
        result = await db
          .insert(workflowSecrets)
          .values({
            workflowId,
            key,
            encryptedValue
          })
          .returning()
      }

      return {
        success: true,
        secret: {
          id: result[0].id,
          key: result[0].key,
          createdAt: result[0].createdAt,
          updatedAt: result[0].updatedAt
        }
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      body: t.Object({
        key: t.String(),
        value: t.String()
      }),
      auth: true
    }
  )

  // Delete a secret
  .delete(
    "/workflows/:id/secrets/:secretId",
    async ({ params, user }) => {
      const { id: workflowId, secretId } = params

      // Verify workflow ownership
      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const deleted = await db
        .delete(workflowSecrets)
        .where(
          and(
            eq(workflowSecrets.id, secretId),
            eq(workflowSecrets.workflowId, workflowId)
          )
        )
        .returning()

      if (deleted.length === 0) {
        return {
          success: false,
          error: "Secret not found"
        }
      }

      return {
        success: true,
        secret: {
          id: deleted[0].id,
          key: deleted[0].key
        }
      }
    },
    {
      params: t.Object({
        id: t.String(),
        secretId: t.String()
      }),
      auth: true
    }
  )

  // Get decrypted secrets (for internal use only, e.g., during execution)
  .get(
    "/workflows/:id/secrets/decrypted",
    async ({ params, user }) => {
      const { id: workflowId } = params

      // Verify workflow ownership
      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const secrets = await db
        .select()
        .from(workflowSecrets)
        .where(eq(workflowSecrets.workflowId, workflowId))

      // Decrypt all secrets
      const secretsManager = new SecretsManager(getMasterKey())
      const decrypted: Record<string, string> = {}

      for (const secret of secrets) {
        try {
          decrypted[secret.key] = secretsManager.decrypt(secret.encryptedValue)
        } catch (error) {
          console.error(`Failed to decrypt secret ${secret.key}:`, error)
        }
      }

      return {
        success: true,
        secrets: decrypted
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )