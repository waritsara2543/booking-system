"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { checkAuthStatus } from "@/lib/auth-utils"
import type { UserNotification } from "@/types/notification"

interface UserNotificationContextType {
  notifications: UserNotification[]
  unreadCount: number
  loading: boolean
  userId: string | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  dismissNotification: (id: string) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const UserNotificationContext = createContext<UserNotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  userId: null,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  dismissNotification: async () => {},
  refreshNotifications: async () => {},
})

export function UserNotificationContextProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  // Debug logs
  console.log("UserNotificationContext - userId:", userId)
  console.log("UserNotificationContext - notifications count:", notifications.length)
  console.log("UserNotificationContext - unreadCount:", unreadCount)

  const fetchNotifications = async (id: string) => {
    console.log("UserNotificationContext - fetchNotifications called with id:", id)
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(50)

      console.log("UserNotificationContext - Supabase query result:", { data: data?.length, error })

      if (error) {
        console.error("Error fetching notifications:", error)
        return
      }

      if (data) {
        console.log("UserNotificationContext - Setting notifications:", data.length)
        setNotifications(data as UserNotification[])
        const unread = data.filter((notification) => !notification.is_read).length
        setUnreadCount(unread)
      }
    } catch (error) {
      console.error("Error in fetchNotifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setIsMounted(true)
    const { memberId: id } = checkAuthStatus()
    console.log("UserNotificationContext - checkAuthStatus result:", { memberId: id })
    setUserId(id)

    if (id) {
      console.log("UserNotificationContext - Fetching notifications for:", id)
      fetchNotifications(id)

      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel(`user_notifications_${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${id}`,
          },
          (payload) => {
            console.log("Real-time: New notification received:", payload)
            // Add the new notification to the list immediately
            const newNotification = payload.new as UserNotification
            setNotifications((prev) => [newNotification, ...prev])
            if (!newNotification.is_read) {
              setUnreadCount((prev) => prev + 1)
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_notifications",
            filter: `user_id=eq.${id}`,
          },
          (payload) => {
            console.log("Real-time: Notification updated:", payload)
            const updatedNotification = payload.new as UserNotification
            setNotifications((prev) =>
              prev.map((notification) =>
                notification.id === updatedNotification.id ? updatedNotification : notification,
              ),
            )
            // Recalculate unread count
            fetchNotifications(id)
          },
        )
        .subscribe((status) => {
          console.log("Real-time subscription status:", status)
        })

      // Listen for broadcast events
      const broadcastChannel = supabase
        .channel("user_notifications_broadcast")
        .on("broadcast", { event: "new_user_notification" }, (payload) => {
          console.log("Broadcast received:", payload)

          // Check if this notification is for the current user
          if (payload.payload && payload.payload.userId === id) {
            console.log("Broadcast is for current user, updating notifications")
            fetchNotifications(id)
          }
        })
        .subscribe((status) => {
          console.log("Broadcast subscription status:", status)
        })

      // Poll for new notifications every 10 seconds as a fallback
      const pollInterval = setInterval(() => {
        console.log("Polling for new notifications...")
        fetchNotifications(id)
      }, 10000)

      return () => {
        console.log("Cleaning up real-time subscription and polling")
        supabase.removeChannel(channel)
        supabase.removeChannel(broadcastChannel)
        clearInterval(pollInterval)
      }
    }
  }, [supabase])

  const markAsRead = async (id: string) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId)

      if (error) {
        console.error("Error marking notification as read:", error)
        return
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error in markAsRead:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!userId) return

    try {
      const { error } = await supabase.from("user_notifications").update({ is_read: true }).eq("user_id", userId)

      if (error) {
        console.error("Error marking all notifications as read:", error)
        return
      }

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error in markAllAsRead:", error)
    }
  }

  const dismissNotification = async (id: string) => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId)

      if (error) {
        console.error("Error dismissing notification:", error)
        return
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error in dismissNotification:", error)
    }
  }

  const refreshNotifications = async () => {
    if (userId) {
      await fetchNotifications(userId)
    }
  }

  // Don't provide context during SSR
  if (!isMounted) {
    return <>{children}</>
  }

  return (
    <UserNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        userId,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        refreshNotifications,
      }}
    >
      {children}
    </UserNotificationContext.Provider>
  )
}

export function useUserNotifications() {
  return useContext(UserNotificationContext)
}
