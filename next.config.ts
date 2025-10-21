import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  experimental: {
    reactCompiler: true
  },
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
}

const withNextIntl = createNextIntlPlugin()
export default withSentryConfig(withNextIntl(nextConfig), {
  org: "unova-nn",
  project: "ezzy-cloud",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true
})
