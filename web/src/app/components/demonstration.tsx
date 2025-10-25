"use client"

import { Replayer } from "@rrweb/replay"
import type { eventWithTime } from "@rrweb/types"
import { useEffect, useRef, useState } from "react"
import events from "./events.json"
import "@rrweb/replay/dist/style.css"

const Demonstration: React.FC = () => {
  const playerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (playerRef.current && rootRef.current) {
      const player = new Replayer(events as eventWithTime[], {
        root: playerRef.current,
        UNSAFE_replayCanvas: true
      })

      const updateScale = () => {
        if (rootRef.current && playerRef.current) {
          const iframe = playerRef.current.querySelector("iframe")
          if (iframe) {
            const containerWidth = rootRef.current.offsetWidth
            const containerHeight = rootRef.current.offsetHeight
            const iframeWidth = iframe.offsetWidth || 1920
            const iframeHeight = iframe.offsetHeight || 1080

            const scaleX = containerWidth / iframeWidth
            const scaleY = containerHeight / iframeHeight
            const newScale = Math.min(scaleX, scaleY)

            setScale(newScale)
          }
        }
      }

      player.play()
      player.on("finish", () => {
        setTimeout(() => {
          player.play()
        }, 3000)
      })

      setTimeout(updateScale, 100)
      setTimeout(updateScale, 500)
      setTimeout(updateScale, 1000)

      const handleVisibilityChange = () => {
        if (document.hidden) {
          player.pause()
        } else {
          player.play()
        }
      }

      const handleResize = () => {
        updateScale()
      }

      document.addEventListener("visibilitychange", handleVisibilityChange)
      window.addEventListener("resize", handleResize)

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              player.play()
            } else {
              player.pause()
            }
          })
        },
        { threshold: 0.5 }
      )

      if (playerRef.current) {
        observer.observe(playerRef.current)
      }

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange)
        window.removeEventListener("resize", handleResize)
        observer.disconnect()
        player.pause()
      }
    }
  }, [])

  return (
    <div
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
      ref={rootRef}
    >
      <div
        ref={playerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          transition: "transform 0.3s ease"
        }}
      />
    </div>
  )
}

export default Demonstration
