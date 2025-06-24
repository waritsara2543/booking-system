"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import Cookies from "js-cookie"

export default function AdminCalendarPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/login")
      return
    }

    // Redirect to the calendar page
    router.push("/calendar")
  }, [router])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 py-8">
        <AdminSidebar />
        <main className="flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </main>
      </div>
    </div>
  )
}
