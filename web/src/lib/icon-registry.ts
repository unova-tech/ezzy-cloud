import type { LucideIcon } from "lucide-react"
import * as LucideIcons from "lucide-react"
import * as SimpleIcons from "@icons-pack/react-simple-icons"

/**
 * Icon definition that can be serialized
 */
export type IconDefinition = {
  library: "lucide" | "simple-icons"
  name: string
}

/**
 * Get icon component from icon definition
 */
export function getIconComponent(icon: IconDefinition | string): React.ComponentType<{ className?: string }> | null {
  // Handle old format (direct component) - return null to trigger fallback
  if (typeof icon === "function") {
    return null
  }

  // Handle string format (legacy)
  if (typeof icon === "string") {
    return null
  }

  // Handle icon definition
  if (!icon || typeof icon !== "object" || !("library" in icon) || !("name" in icon)) {
    return null
  }

  try {
    if (icon.library === "lucide") {
      // Lucide icons: ArrowRightLeft, Play, etc.
      const IconComponent = (LucideIcons as Record<string, LucideIcon>)[icon.name]
      return IconComponent || null
    }

    if (icon.library === "simple-icons") {
      // Simple Icons: SiJavascript, SiResend, etc.
      const IconComponent = (SimpleIcons as Record<string, React.ComponentType>)[icon.name]
      return IconComponent || null
    }
  } catch (error) {
    console.error(`Failed to load icon ${icon.name} from ${icon.library}:`, error)
  }

  return null
}

/**
 * Helper to create lucide icon definition
 */
export function lucideIcon(name: string): IconDefinition {
  return { library: "lucide", name }
}

/**
 * Helper to create simple-icons icon definition
 */
export function simpleIcon(name: string): IconDefinition {
  return { library: "simple-icons", name }
}
