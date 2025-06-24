"use client"

import { useEffect } from "react"
import { ensureStorageBuckets } from "@/lib/supabase"

export function StorageBucketInitializer() {
  useEffect(() => {
    // Only run on the client side
    if (typeof window !== "undefined") {
      // Add a small delay to ensure environment variables are loaded
      const timer = setTimeout(() => {
        ensureStorageBuckets().catch((error) => {
          console.error("Failed to initialize storage buckets:", error)
        })
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [])

  // This component doesn't render anything visible
  return null
}
