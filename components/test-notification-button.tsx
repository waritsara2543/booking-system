"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export function TestNotificationButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleTestNotification = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/test-notification")
      const data = await response.json()

      console.log("Test notification response:", data)

      if (data.testNotification?.success) {
        toast({
          title: "Test notification sent",
          description: "The test notification was created successfully.",
          variant: "default",
        })
      } else {
        toast({
          title: "Test notification failed",
          description: data.testNotification?.error?.message || "Failed to create test notification",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error testing notification:", error)
      toast({
        title: "Error",
        description: "An error occurred while testing the notification.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleTestNotification} disabled={isLoading}>
      {isLoading ? "Testing..." : "Test Notification"}
    </Button>
  )
}
