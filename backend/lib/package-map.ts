/**
 * Shared package mapping logic for node types to their filesystem paths.
 * Used by both CodeGenerator and WorkflowBundler to ensure consistent resolution.
 */

const PACKAGE_MAP: Record<string, string> = {
  "http-request": "http-request",
  code: "code",
  "send-email": "resend/send-email"
}

/**
 * Maps a node type to its package path in the nodes directory.
 * 
 * @param nodeType - The node type identifier (e.g., 'http-request', 'send-email')
 * @returns The relative path within the nodes directory (e.g., 'http-request', 'resend/send-email')
 * 
 * @example
 * getPackagePath('http-request') // returns 'http-request'
 * getPackagePath('send-email') // returns 'resend/send-email'
 * getPackagePath('custom-node') // returns 'custom-node'
 */
export function getPackagePath(nodeType: string): string {
  return PACKAGE_MAP[nodeType] || nodeType
}

/**
 * Gets the package name for import resolution in generated code.
 * Converts node types to their npm package-style names.
 * 
 * @param nodeName - The node name/type
 * @returns The package identifier for imports (e.g., 'nodes-http-request')
 */
export function getPackageName(nodeName: string): string {
  return PACKAGE_MAP[nodeName] || nodeName
}
