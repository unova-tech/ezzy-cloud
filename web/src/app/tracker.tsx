"use client"

import FingerprintJS from "@fingerprintjs/fingerprintjs"
import { useEffect } from "react"

const Tracker: React.FC = () => {
  useEffect(() => {
    ;(async () => {
      const fp = await FingerprintJS.load()
      const result = await fp.get()
      window.umami?.identify(result.visitorId, {
        confidence: result.confidence.score,
        anonymus: true
      })
      localStorage.setItem("visitorId", result.visitorId)
    })()
  }, [])

  // biome-ignore lint/complexity/noUselessFragments: Need only for make a component
  return <></>
}

export default Tracker
