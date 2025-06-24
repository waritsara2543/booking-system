"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import Cookies from "js-cookie"

type Notification = {
  id: string
  booking_id: string | null
  title: string
  message: string
  is_read: boolean
  created_at: string
  metadata?: string | null | Record<string, any>
}

type NotificationContextType = {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  refreshAdminStatus: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      console.log("NotificationContext: Starting to fetch notifications")
      setLoading(true)
      setError(null)

      // เพิ่ม metadata ในการ select
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("NotificationContext: Error fetching notifications:", error)
        throw error
      }

      console.log("NotificationContext: Notifications fetched successfully:", data?.length || 0, "notifications")

      // แปลง metadata จาก string เป็น object ถ้าเป็นไปได้
      const processedData =
        data?.map((notification) => {
          if (notification.metadata && typeof notification.metadata === "string") {
            try {
              return {
                ...notification,
                metadata: JSON.parse(notification.metadata),
              }
            } catch (e) {
              console.error("NotificationContext: Error parsing metadata:", e)
              return notification
            }
          }
          return notification
        }) || []

      setNotifications(processedData)
      setUnreadCount(processedData.filter((n) => !n.is_read).length || 0)
    } catch (err) {
      console.error("NotificationContext: Error in fetchNotifications:", err)
      setError("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    const isAdminValue = adminCookie === "true"
    setIsAdmin(isAdminValue)

    console.log("NotificationContext: Admin status check:", isAdminValue)

    if (isAdminValue && !hasInitialized) {
      console.log("NotificationContext: Admin detected, fetching notifications")
      fetchNotifications().then(() => {
        setHasInitialized(true)
      })
    } else {
      console.log("NotificationContext: Not an admin or already initialized, skipping notification fetch")
      setLoading(false)
    }
  }, [fetchNotifications, hasInitialized])

  // Set up real-time subscription for new notifications
  useEffect(() => {
    if (!isAdmin) {
      console.log("NotificationContext: Skipping real-time subscription setup (not admin)")
      return
    }

    console.log("NotificationContext: Setting up real-time subscription for admin_notifications")

    const subscription = supabase
      .channel("admin_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
        },
        (payload) => {
          console.log("NotificationContext: Real-time notification received:", payload)

          // แปลง metadata จาก string เป็น object ถ้าเป็นไปได้
          let newNotification = payload.new as Notification
          if (newNotification.metadata && typeof newNotification.metadata === "string") {
            try {
              newNotification = {
                ...newNotification,
                metadata: JSON.parse(newNotification.metadata as string),
              }
            } catch (e) {
              console.error("NotificationContext: Error parsing metadata in real-time notification:", e)
            }
          }

          // Add the new notification to the state
          setNotifications((prev) => {
            // Check if notification already exists to prevent duplicates
            const exists = prev.some((n) => n.id === newNotification.id)
            if (exists) return prev
            return [newNotification, ...prev]
          })
          setUnreadCount((prev) => prev + 1)
        },
      )
      .subscribe()

    // Add a broadcast channel listener for custom events
    const broadcastChannel = supabase
      .channel("admin_notifications_broadcast")
      .on("broadcast", { event: "new_notification" }, (payload) => {
        console.log("NotificationContext: Broadcast notification received:", payload)

        // แปลง metadata จาก string เป็น object ถ้าเป็นไปได้
        let newNotification = payload.payload as Notification
        if (newNotification.metadata && typeof newNotification.metadata === "string") {
          try {
            newNotification = {
              ...newNotification,
              metadata: JSON.parse(newNotification.metadata as string),
            }
          } catch (e) {
            console.error("NotificationContext: Error parsing metadata in broadcast notification:", e)
          }
        }

        // Handle the broadcast notification
        setNotifications((prev) => {
          // Check if notification already exists to prevent duplicates
          const exists = prev.some((n) => n.id === newNotification.id)
          if (exists) return prev
          return [newNotification, ...prev]
        })
        setUnreadCount((prev) => prev + 1)
      })
      .subscribe()

    console.log("NotificationContext: Subscription set up successfully")

    return () => {
      console.log("NotificationContext: Cleaning up subscription")
      supabase.removeChannel(subscription)
      supabase.removeChannel(broadcastChannel)
    }
  }, [isAdmin])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id)

      if (error) throw error

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, is_read: true } : notification)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)

      if (unreadIds.length === 0) return

      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).in("id", unreadIds)

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Error marking all notifications as read:", err)
    }
  }

  const refreshNotifications = async () => {
    return fetchNotifications()
  }

  // Add this function to check admin status and fetch notifications if needed
  const refreshAdminStatus = useCallback(() => {
    const adminCookie = Cookies.get("isAdmin")
    const isAdminUser = adminCookie === "true"
    console.log("NotificationContext: Manual admin status refresh:", isAdminUser)

    if (isAdminUser && !isAdmin) {
      setIsAdmin(true)
      fetchNotifications()
    } else if (!isAdminUser && isAdmin) {
      setIsAdmin(false)
      setNotifications([])
      setUnreadCount(0)
    }
  }, [isAdmin, fetchNotifications])

  // Update the return value to include the new function
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        refreshAdminStatus,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
