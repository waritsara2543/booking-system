import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { NotificationProvider } from "@/contexts/notification-context"
import { UserNotificationContextProvider } from "@/contexts/user-notification-context"
import { Footer } from "@/components/footer"
import { StorageBucketInitializer } from "@/components/storage-bucket-initializer"
import { NotificationPopup } from "@/components/notification-popup"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Room Booking System",
  description: "A modern room booking system for your organization",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-tech-dashboard-orange-blue flex flex-col min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NotificationProvider>
            <UserNotificationContextProvider>
              <div className="flex flex-col min-h-screen">
                {/* Client component to initialize storage buckets */}
                <StorageBucketInitializer />
                {/* Notification popup for users */}
                <NotificationPopup />
                <main className="flex-1">{children}</main>
                <Footer />
                <Toaster position="top-right" />
              </div>
            </UserNotificationContextProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
