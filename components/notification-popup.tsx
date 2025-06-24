"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Bell, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useUserNotifications } from "@/contexts/user-notification-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NotificationPopup() {
  const { notifications, markAsRead, dismissNotification } = useUserNotifications()
  const [isMounted, setIsMounted] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [shownIds, setShownIds] = useState<string[]>([])
  const pathname = usePathname()

  const [unreadNotifications, setUnreadNotifications] = useState([])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // Clear dismissed IDs when pathname changes
    setDismissedIds([])
  }, [pathname])

  useEffect(() => {
    // Update unreadNotifications state
    const newUnreadNotifications = notifications
      .filter((notification) => !notification.is_read && !dismissedIds.includes(notification.id))
      .slice(0, 3)
    setUnreadNotifications(newUnreadNotifications)
  }, [notifications, dismissedIds])

  useEffect(() => {
    // Track which notifications have been shown to prevent re-animation
    const newIds = unreadNotifications.map((n) => n.id).filter((id) => !shownIds.includes(id))
    if (newIds.length > 0) {
      setShownIds((prev) => [...prev, ...newIds])
    }
  }, [unreadNotifications, shownIds])

  // Don't render during SSR
  if (!isMounted) {
    return null
  }

  // Debug log
  console.log("NotificationPopup - All notifications:", notifications)
  console.log("NotificationPopup - Unread notifications:", unreadNotifications)
  console.log("NotificationPopup - Dismissed IDs:", dismissedIds)

  if (unreadNotifications.length === 0) {
    return null
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      default:
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    }
  }

  const handleDismiss = (id: string) => {
    // Add to local dismissed list immediately for UI feedback
    setDismissedIds((prev) => [...prev, id])
    // Then update in the database
    dismissNotification(id)
  }

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {unreadNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={!shownIds.includes(notification.id) ? { opacity: 0, x: 50 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`rounded-lg shadow-lg border p-4 ${getBackgroundColor(notification.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">{getIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                  <div className="flex gap-2">
                    {notification.link && (
                      <Link href={notification.link}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs h-7 px-2"
                        >
                          View Details
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(notification.id)}
                      className="text-xs h-7 px-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
