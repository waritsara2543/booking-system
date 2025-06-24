"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

export default function EmailTestPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">("idle")
  const [emailType, setEmailType] = useState("booking-confirmation")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [customSubject, setCustomSubject] = useState("")
  const [customBody, setCustomBody] = useState("")

  // แก้ไขฟังก์ชัน handleTestEmail เพื่อให้มีการจัดการข้อผิดพลาดที่ดีขึ้น
  const handleTestEmail = async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address")
      return
    }

    setIsLoading(true)
    setEmailStatus("idle")

    try {
      let endpoint = ""
      let payload = {}

      // สร้าง mock data สำหรับการทดสอบ
      const mockBooking = {
        id: "test-booking-123",
        room_name: "Conference Room A",
        date: new Date().toISOString(),
        start_time: "10:00",
        end_time: "12:00",
        purpose: "Team Meeting",
        attendees: 5,
        status: "confirmed",
      }

      const mockMember = {
        name: "John Doe",
        memberId: "MEM12345",
        email: recipientEmail,
      }

      const mockPackage = {
        name: "Premium Package",
        price: 1500,
        duration_days: 30,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }

      const mockWifiCredentials = {
        ssid: "Coworking_WiFi",
        password: "test1234",
        notes: "Available in all areas",
      }

      // เลือก endpoint และ payload ตามประเภทอีเมล
      switch (emailType) {
        case "booking-confirmation":
          endpoint = "/api/send-confirmation"
          payload = {
            to: recipientEmail,
            booking: mockBooking,
          }
          break
        case "booking-cancellation":
          endpoint = "/api/send-cancellation"
          payload = {
            to: recipientEmail,
            booking: mockBooking,
            reason: "Room maintenance scheduled",
          }
          break
        case "package-confirmation":
          endpoint = "/api/send-package-confirmation"
          payload = {
            to: recipientEmail,
            memberDetails: mockMember,
            packageDetails: mockPackage,
            wifiCredentials: mockWifiCredentials,
          }
          break
        case "package-expiring":
          endpoint = "/api/send-package-expiring"
          payload = {
            to: recipientEmail,
            member: mockMember,
            packageDetails: mockPackage,
            daysLeft: 3,
          }
          break
        case "package-expired":
          endpoint = "/api/send-package-expired"
          payload = {
            to: recipientEmail,
            member: mockMember,
            packageDetails: mockPackage,
          }
          break
        case "custom-email":
          endpoint = "/api/test-email"
          payload = {
            email: recipientEmail, // แก้ไขจาก to เป็น email เพื่อให้ตรงกับ API
            subject: customSubject || "Test Email",
            html: customBody || "<p>This is a test email from the booking system.</p>",
          }
          break
        default:
          toast.error("Invalid email type")
          setIsLoading(false)
          return
      }

      console.log(`Sending request to ${endpoint} with payload:`, payload)

      // ส่งคำขอไปยัง API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (data.success) {
        setEmailStatus("success")
        toast.success(data.mock ? "Email mocked successfully (preview environment)" : "Test email sent successfully")
      } else {
        setEmailStatus("error")
        toast.error(data.error || "Failed to send test email")
      }
    } catch (error) {
      console.error("Error sending test email:", error)
      setEmailStatus("error")
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckConfig = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/email-config-check")
      const data = await response.json()

      if (data.configured) {
        toast.success("Email configuration is valid")
      } else {
        toast.error(`Email configuration error: ${data.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error checking email config:", error)
      toast.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold">Email Testing</h1>
            <Button variant="outline" onClick={handleCheckConfig} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Check Email Config
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Test Email System</CardTitle>
              <CardDescription>
                Send test emails to verify that the email notification system is working correctly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="templates" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="templates">Email Templates</TabsTrigger>
                  <TabsTrigger value="custom">Custom Email</TabsTrigger>
                </TabsList>
                <TabsContent value="templates" className="space-y-4 pt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email-type">Email Type</Label>
                      <Select value={emailType} onValueChange={setEmailType}>
                        <SelectTrigger id="email-type">
                          <SelectValue placeholder="Select email type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="booking-confirmation">Booking Confirmation</SelectItem>
                          <SelectItem value="booking-cancellation">Booking Cancellation</SelectItem>
                          <SelectItem value="package-confirmation">Package Confirmation</SelectItem>
                          <SelectItem value="package-expiring">Package Expiring Soon</SelectItem>
                          <SelectItem value="package-expired">Package Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="recipient">Recipient Email</Label>
                      <Input
                        id="recipient"
                        type="email"
                        placeholder="Enter recipient email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="custom" className="space-y-4 pt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="custom-recipient">Recipient Email</Label>
                      <Input
                        id="custom-recipient"
                        type="email"
                        placeholder="Enter recipient email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="custom-subject">Subject</Label>
                      <Input
                        id="custom-subject"
                        placeholder="Enter email subject"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="custom-body">Email Body (HTML)</Label>
                      <Textarea
                        id="custom-body"
                        placeholder="Enter email body (HTML)"
                        value={customBody}
                        onChange={(e) => setCustomBody(e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center">
                {emailStatus === "success" && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    <span>Email sent successfully</span>
                  </div>
                )}
                {emailStatus === "error" && (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    <span>Failed to send email</span>
                  </div>
                )}
              </div>
              <Button onClick={handleTestEmail} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send Test Email
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Current email configuration and settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email Provider</Label>
                    <div className="p-2 border rounded-md bg-muted">Gmail SMTP</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Sender Email</Label>
                    <div className="p-2 border rounded-md bg-muted">
                      {process.env.NEXT_PUBLIC_EMAIL_FROM || process.env.EMAIL_USER || "Not configured"}
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-md bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                  <h3 className="font-medium mb-2">Important Notes</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Gmail has a sending limit of 500 emails per day.</li>
                    <li>Make sure "Less secure app access" is enabled or use App Password.</li>
                    <li>For production use, consider using a dedicated email service like SendGrid or Amazon SES.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
