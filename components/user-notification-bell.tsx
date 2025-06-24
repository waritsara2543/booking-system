"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserNotifications } from "@/contexts/user-notification-context"
import { formatDistanceToNow } from "date-fns"
import { useOnClickOutside } from "@/hooks/use-click-outside"
import { useToast } from "@/hooks/use-toast"
import { Portal } from "@/components/ui/portal"

export function UserNotificationBell() {
  const { notifications, unreadCount, loading, userId, markAsRead, markAllAsRead, refreshNotifications } =
    useUserNotifications()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { toast } = useToast()

  // ปิด dropdown เมื่อคลิกนอกพื้นที่
  useOnClickOutside(dropdownRef, (event) => {
    // Don't close if clicking on the button
    if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
      return
    }
    setIsOpen(false)
  })

  // Listen for login events and refresh notifications
  useEffect(() => {
    const handleUserLogin = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail && customEvent.detail.memberId) {
        console.log("UserNotificationBell: Login event detected, refreshing notifications")
        setTimeout(() => {
          handleRefresh()
        }, 500) // Small delay to ensure context is updated
      }
    }

    window.addEventListener("userLoggedIn", handleUserLogin)

    return () => {
      window.removeEventListener("userLoggedIn", handleUserLogin)
    }
  }, [])

  // รีเฟรชข้อมูลการแจ้งเตือนเมื่อ component mount และมี userId
  useEffect(() => {
    if (userId) {
      console.log("UserNotificationBell: User ID set, refreshing notifications")
      handleRefresh()
    }
  }, [userId])

  // Auto-refresh notifications periodically when the component is mounted
  useEffect(() => {
    // Only set up auto-refresh if we have a userId
    if (!userId) return

    console.log("UserNotificationBell: Setting up auto-refresh interval")

    // Refresh every 30 seconds
    const intervalId = setInterval(() => {
      console.log("UserNotificationBell: Auto-refreshing notifications")
      refreshNotifications()
    }, 30000)

    return () => {
      console.log("UserNotificationBell: Clearing auto-refresh interval")
      clearInterval(intervalId)
    }
  }, [userId, refreshNotifications])

  // Debug notifications on mount and when they change
  useEffect(() => {
    console.log("Notifications state:", {
      count: notifications?.length || 0,
      unreadCount,
      loading,
      isOpen,
      userId,
    })
  }, [notifications, unreadCount, loading, isOpen, userId])

  // ฟังก์ชันสำหรับการคลิกที่การแจ้งเตือน
  const handleNotificationClick = (id: string) => {
    console.log("UserNotificationBell: Notification clicked:", id)
    markAsRead(id)
    setIsOpen(false)
  }

  // ฟังก์ชันสำหรับการรีเฟรชข้อมูลการแจ้งเตือน
  const handleRefresh = async () => {
    console.log("UserNotificationBell: Refreshing notifications")
    setIsRefreshing(true)
    await refreshNotifications()
    setIsRefreshing(false)
  }

  // ฟังก์ชันสำหรับการเปิด/ปิด dropdown
  const toggleDropdown = () => {
    console.log("UserNotificationBell: Button clicked, userId:", userId)

    if (!isOpen) {
      if (userId) {
        // รีเฟรชข้อมูลการแจ้งเตือนเมื่อเปิด dropdown
        handleRefresh()
      } else {
        console.log("UserNotificationBell: No userId available, cannot refresh notifications")
        // Show a toast message if userId is not available
        toast({
          title: "Not logged in",
          description: "Please log in to view notifications",
          variant: "destructive",
        })
      }
    }

    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Portal>
          <div
            ref={dropdownRef}
            className="fixed bg-background border rounded-md shadow-lg z-[9999]"
            style={{
              width: "320px",
              maxHeight: "400px",
              overflowY: "auto",
              top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 5 : 0,
              right: buttonRef.current
                ? window.innerWidth - (buttonRef.current.getBoundingClientRect().right + window.scrollX)
                : 0,
            }}
          >
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-medium">Notifications</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  className="h-8 w-8 p-0"
                >
                  {isRefreshing || loading ? (
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
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    Mark all as read
                  </Button>
                )}
              </div>
            </div>

            {loading || isRefreshing ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="py-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 ${
                      !notification.is_read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8">
                <BellOff className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
                  Refresh
                </Button>
              </div>
            )}
          </div>
        </Portal>
      )}
    </div>
  )
}
