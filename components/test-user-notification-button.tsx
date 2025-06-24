"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface TestUserNotificationButtonProps {
  userId: string
}

export function TestUserNotificationButton({ userId }: TestUserNotificationButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (!userId) {
      toast.error("No user ID provided")
      return
    }

    setIsLoading(true)
    try {
      // ตรวจสอบว่า userId มีอยู่ในตาราง members หรือไม่
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("member_id")
        .eq("member_id", userId)
        .maybeSingle()

      if (memberError) {
        console.error("Error checking member existence:", memberError)
        toast.error("Error checking member existence")
        return
      }

      if (!memberData) {
        console.error("Member not found:", userId)
        toast.error(`Member not found: ${userId}`)
        return
      }

      // เพิ่มการแจ้งเตือนโดยตรง
      const notificationData = {
        user_id: userId,
        title: "Test Notification",
        message: "This is a test notification from the profile page.",
        type: "info",
        is_read: false,
      }

      console.log("Inserting notification directly:", notificationData)

      const { data: notifData, error: notifError } = await supabase
        .from("user_notifications")
        .insert([notificationData])
        .select()

      if (notifError) {
        console.error("Error inserting notification directly:", notifError)
        toast.error(`Error creating notification: ${notifError.message}`)
        return
      }

      console.log("Notification inserted successfully:", notifData)
      toast.success("Test notification sent successfully!")
    } catch (error) {
      console.error("Error sending test notification:", error)
      toast.error("Error sending test notification")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={isLoading || !userId}>
      {isLoading ? "Sending..." : "Send Test Notification"}
    </Button>
  )
}
