"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { checkPageAccess } from "@/lib/auth-utils"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (pathname) {
      const { hasAccess, redirectTo } = checkPageAccess(pathname)

      if (!hasAccess && redirectTo) {
        console.log(`AuthGuard: Unauthorized access to ${pathname} - redirecting to ${redirectTo}`)
        router.push(redirectTo)
      } else {
        setIsAuthorized(true)
      }

      setIsLoading(false)
    }
  }, [pathname, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <span className="ml-3">Checking authorization...</span>
      </div>
    )
  }

  return isAuthorized ? <>{children}</> : null
}
