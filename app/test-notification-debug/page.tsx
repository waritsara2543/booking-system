"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useUserNotifications } from "@/contexts/user-notification-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"

export default function TestNotificationDebugPage() {
  const [userId, setUserId] = useState("")
  const [title, setTitle] = useState("Test Notification")
  const [message, setMessage] = useState("This is a test notification message.")
  const [type, setType] = useState("info")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [allNotifications, setAllNotifications] = useState<any[]>([])
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = createClientComponentClient()
  const { refreshNotifications } = useUserNotifications()

  // Fetch all notifications and members on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all notifications
        const { data: notifications, error: notificationsError } = await supabase
          .from("user_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)

        if (notificationsError) throw notificationsError
        setAllNotifications(notifications || [])

        // Fetch all members
        const { data: members, error: membersError } = await supabase
          .from("members")
          .select("id, member_id, name, email")
          .order("name")
          .limit(100)

        if (membersError) throw membersError
        setAllMembers(members || [])
      } catch (err: any) {
        console.error("Error fetching data:", err)
        setError(err.message)
      }
    }

    fetchData()
  }, [supabase, refreshKey])

  const handleSendNotification = async () => {
    if (!userId) {
      setError("User ID is required")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/send-user-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title,
          message,
          type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send notification")
      }

      setResult(data)
      // Refresh the notifications list
      setRefreshKey((prev) => prev + 1)
      // Refresh the user's notifications in the context
      refreshNotifications()
    } catch (err: any) {
      console.error("Error sending notification:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDirectInsert = async () => {
    if (!userId) {
      setError("User ID is required")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Insert directly into the database
      const { data, error: insertError } = await supabase
        .from("user_notifications")
        .insert([
          {
            user_id: userId,
            title,
            message,
            type,
            is_read: false,
          },
        ])
        .select()

      if (insertError) throw insertError

      setResult({ success: true, notification: data?.[0] })
      // Refresh the notifications list
      setRefreshKey((prev) => prev + 1)
      // Refresh the user's notifications in the context
      refreshNotifications()
    } catch (err: any) {
      console.error("Error inserting notification:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from("user_notifications").delete().eq("id", id)

      if (error) throw error

      // Refresh the notifications list
      setRefreshKey((prev) => prev + 1)
      // Refresh the user's notifications in the context
      refreshNotifications()
    } catch (err: any) {
      console.error("Error deleting notification:", err)
      setError(err.message)
    }
  }

  const handleBroadcastTest = async () => {
    if (!userId) {
      setError("User ID is required")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Create a broadcast channel
      const broadcastChannel = supabase.channel("user_notifications_broadcast")

      // Subscribe to the channel
      await broadcastChannel.subscribe((status) => {
        console.log("Broadcast test subscription status:", status)
      })

      // Create a test notification
      const testNotification = {
        id: "test-" + Date.now(),
        user_id: userId,
        title: "Broadcast Test",
        message: "This is a test broadcast notification",
        type: "info",
        is_read: false,
        created_at: new Date().toISOString(),
      }

      // Send the broadcast
      broadcastChannel.send({
        type: "broadcast",
        event: "new_user_notification",
        payload: {
          userId,
          notification: testNotification,
        },
      })

      setResult({ success: true, message: "Broadcast sent successfully" })
    } catch (err: any) {
      console.error("Error sending broadcast:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Notification Debug Tool</h1>

      <Tabs defaultValue="send">
        <TabsList>
          <TabsTrigger value="send">Send Notification</TabsTrigger>
          <TabsTrigger value="list">All Notifications</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID (member_id)</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMembers.map((member) => (
                      <SelectItem key={member.member_id} value={member.member_id}>
                        {member.name} ({member.member_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSendNotification} disabled={loading}>
                  {loading ? "Sending..." : "Send via API"}
                </Button>
                <Button onClick={handleDirectInsert} disabled={loading} variant="outline">
                  {loading ? "Inserting..." : "Direct DB Insert"}
                </Button>
                <Button onClick={handleBroadcastTest} disabled={loading} variant="secondary">
                  {loading ? "Broadcasting..." : "Test Broadcast"}
                </Button>
              </div>

              {error && <div className="text-red-500 mt-2">{error}</div>}
              {result && (
                <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h3 className="font-semibold text-green-700">Success!</h3>
                  <pre className="text-xs mt-2 overflow-auto max-h-40">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Notifications ({allNotifications.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setRefreshKey((prev) => prev + 1)}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allNotifications.length === 0 ? (
                  <p className="text-gray-500">No notifications found</p>
                ) : (
                  allNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-md ${
                        notification.is_read ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex justify-between">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="text-red-500 h-6 px-2"
                        >
                          Delete
                        </Button>
                      </div>
                      <p className="text-sm mt-1">{notification.message}</p>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>User: {notification.user_id}</span>
                        <span>{format(new Date(notification.created_at), "MMM d, yyyy HH:mm:ss")}</span>
                      </div>
                      <div className="flex justify-between mt-1 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            notification.type === "info"
                              ? "bg-blue-100 text-blue-800"
                              : notification.type === "success"
                                ? "bg-green-100 text-green-800"
                                : notification.type === "warning"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                          }`}
                        >
                          {notification.type}
                        </span>
                        <span>{notification.is_read ? "Read" : "Unread"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Members ({allMembers.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setRefreshKey((prev) => prev + 1)}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allMembers.length === 0 ? (
                  <p className="text-gray-500">No members found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2 text-left">Name</th>
                          <th className="border p-2 text-left">Member ID</th>
                          <th className="border p-2 text-left">Email</th>
                          <th className="border p-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMembers.map((member) => (
                          <tr key={member.id} className="border-b">
                            <td className="border p-2">{member.name}</td>
                            <td className="border p-2">{member.member_id}</td>
                            <td className="border p-2">{member.email}</td>
                            <td className="border p-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setUserId(member.member_id)
                                  // Switch to send tab
                                  document.querySelector('[data-value="send"]')?.click()
                                }}
                              >
                                Select
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
