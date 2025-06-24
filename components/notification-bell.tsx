"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/contexts/notification-context"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import Cookies from "js-cookie"
import { Loader2 } from "lucide-react"
import { useOnClickOutside } from "@/hooks/use-click-outside"
import { Portal } from "@/components/ui/portal"

export function NotificationBell() {
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshAdminStatus, refreshNotifications } =
    useNotifications()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useOnClickOutside(dropdownRef, (event) => {
    // Don't close if clicking on the button
    if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
      return
    }
    setIsOpen(false)
  })

  // Update the useEffect to call refreshAdminStatus when the component mounts
  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    const isAdminUser = adminCookie === "true"
    console.log("NotificationBell: Admin check:", isAdminUser, "Cookie value:", adminCookie)
    setIsAdmin(isAdminUser)

    // Only refresh notifications once on initial load
    if (isAdminUser && !hasInitialized) {
      setIsLoading(true)
      refreshAdminStatus()
      refreshNotifications()
        .then(() => {
          setHasInitialized(true)
          setIsLoading(false)
        })
        .catch((error) => {
          console.error("NotificationBell: Error refreshing notifications:", error)
          setIsLoading(false)
        })
    }
  }, [refreshAdminStatus, refreshNotifications, hasInitialized])

  // If not admin, don't render the bell
  if (!isAdmin) {
    console.log("NotificationBell: Not rendering bell (not admin)")
    return null
  }

  console.log("NotificationBell: Rendering with", notifications?.length || 0, "notifications,", unreadCount, "unread")

  const handleNotificationClick = (notification: any) => {
    const { id: notificationId, booking_id: bookingId, metadata, title } = notification

    console.log(
      "NotificationBell: Notification clicked:",
      notificationId,
      "Booking:",
      bookingId,
      "Metadata:",
      metadata,
      "Title:",
      title,
    )

    // Mark notification as read
    markAsRead(notificationId)

    try {
      // Check if it's a package notification by checking metadata or title
      let isPackage = false
      let packageId = null

      // Try to parse metadata if it exists
      if (metadata) {
        try {
          const metadataObj = typeof metadata === "string" ? JSON.parse(metadata) : metadata
          if (metadataObj.type === "package") {
            isPackage = true
            packageId = metadataObj.package_id
            console.log("NotificationBell: Package ID from metadata:", packageId)
          }
        } catch (e) {
          console.error("NotificationBell: Error parsing metadata:", e)
        }
      }

      // If no package ID from metadata, check title
      if (!packageId && title && (title.includes("Package") || title.includes("package"))) {
        isPackage = true
        console.log("NotificationBell: Package notification detected from title")
      }

      // If it's a package notification but no package ID from metadata, try to use booking_id
      if (isPackage && !packageId && bookingId) {
        packageId = bookingId
        console.log("NotificationBell: Using booking_id as package ID:", packageId)
      }

      // If it's a package notification with package ID, navigate to package page
      if (isPackage && packageId) {
        console.log("NotificationBell: Navigating to package page:", packageId)
        router.push(`/admin/members/packages/${packageId}`)
        setIsOpen(false)
        return
      }

      // If it's not a package notification or no package ID, check if it's a booking
      if (bookingId) {
        // Check if it's a booking notification (UUID format)
        if (bookingId.includes("-") || bookingId.length > 10) {
          console.log("NotificationBell: Navigating to booking page:", bookingId)
          router.push(`/bookings/${bookingId}`)
        } else {
          // If it's not a UUID but we have a booking_id, assume it's a package
          console.log("NotificationBell: Navigating to package page (from booking_id):", bookingId)
          router.push(`/admin/members/packages/${bookingId}`)
        }
      } else {
        console.log("NotificationBell: No booking ID or package ID, staying on current page")
      }
    } catch (error) {
      console.error("NotificationBell: Error handling notification click:", error)
    }

    setIsOpen(false)
  }

  const handleMarkAllRead = () => {
    console.log("NotificationBell: Marking all as read")
    markAllAsRead()
  }

  const handleRefresh = async () => {
    try {
      setIsLoading(true)
      console.log("NotificationBell: Refreshing notifications")
      await refreshNotifications()
      console.log("NotificationBell: Refresh complete")
    } catch (error) {
      console.error("NotificationBell: Error refreshing notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDropdown = () => {
    console.log("Bell clicked, toggling dropdown from", isOpen, "to", !isOpen)
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect())
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative hover:bg-primary/10 transition-colors cursor-pointer"
        onClick={toggleDropdown}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center translate-x-1/3 -translate-y-1/3">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </Button>

      {isOpen && buttonRect && (
        <Portal>
          <div
            ref={dropdownRef}
            className="fixed bg-background rounded-md shadow-lg border z-[99999]"
            style={{
              width: "320px",
              maxWidth: "calc(100vw - 32px)",
              top: `${buttonRect.bottom + window.scrollY + 8}px`,
              right: `${window.innerWidth - buttonRect.right - window.scrollX}px`,
            }}
          >
            <div className="flex items-center justify-between p-3 sm:p-4 border-b">
              <h4 className="font-medium text-sm sm:text-base">Notifications</h4>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                  )}
                </Button>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-8 text-xs sm:text-sm">
                    Mark all as read
                  </Button>
                )}
              </div>
            </div>
            <div className="max-h-[350px] sm:max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading notifications...</p>
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={`flex flex-col p-4 text-left hover:bg-muted/50 border-b transition-colors ${
                        !notification.is_read ? "bg-muted/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{notification.title}</span>
                        {!notification.is_read && <span className="h-2 w-2 rounded-full bg-blue-500"></span>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{notification.message}</p>
                      <span className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notification.created_at), "MMM d, h:mm a")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                  <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No notifications</p>
                  <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
