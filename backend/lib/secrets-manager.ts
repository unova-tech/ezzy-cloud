import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

export class SecretsManager {
  private masterKey: Buffer

  constructor(masterKeyHex: string) {
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      throw new Error("Master key must be a 64-character hex string (32 bytes)")
    }
    this.masterKey = Buffer.from(masterKeyHex, "hex")
  }

  /**
   * Encrypt a secret value
   * Returns base64-encoded encrypted data with format: salt:iv:authTag:encryptedData
   */
  encrypt(plaintext: string): string {
    const salt = randomBytes(SALT_LENGTH)
    const iv = randomBytes(IV_LENGTH)

    // Derive key using simple concatenation (in production, use PBKDF2 or similar)
    const key = Buffer.concat([this.masterKey, salt]).subarray(0, 32)

    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ])

    const authTag = cipher.getAuthTag()

    // Combine salt, iv, authTag, and encrypted data
    const combined = Buffer.concat([salt, iv, authTag, encrypted])
    return combined.toString("base64")
  }

  /**
   * Decrypt a secret value
   * Expects base64-encoded encrypted data with format: salt:iv:authTag:encryptedData
   */
  decrypt(encryptedData: string): string {
    const combined = Buffer.from(encryptedData, "base64")

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    )
    const encrypted = combined.subarray(
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    )

    // Derive key
    const key = Buffer.concat([this.masterKey, salt]).subarray(0, 32)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])

    return decrypted.toString("utf8")
  }

  /**
   * Encrypt a secrets object
   * Returns a map of key -> encrypted value
   */
  encryptSecrets(secrets: Record<string, string>): Record<string, string> {
    const encrypted: Record<string, string> = {}
    for (const [key, value] of Object.entries(secrets)) {
      encrypted[key] = this.encrypt(value)
    }
    return encrypted
  }

  /**
   * Decrypt a secrets object
   * Returns a map of key -> decrypted value
   */
  decryptSecrets(
    encryptedSecrets: Record<string, string>
  ): Record<string, string> {
    const decrypted: Record<string, string> = {}
    for (const [key, value] of Object.entries(encryptedSecrets)) {
      try {
        decrypted[key] = this.decrypt(value)
      } catch (error) {
        throw new Error(`Failed to decrypt secret "${key}": ${error}`)
      }
    }
    return decrypted
  }

  /**
   * Generate a new random master key
   */
  static generateMasterKey(): string {
    return randomBytes(32).toString("hex")
  }
}
