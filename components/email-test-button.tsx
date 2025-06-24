"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, Check, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function EmailTestButton() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null)
  const [configStatus, setConfigStatus] = useState<{ configured?: boolean; error?: string } | null>(null)

  // Test email function
  const sendTestEmail = async () => {
    if (!email) return
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message || "Test email sent successfully!" })
      } else {
        setResult({ success: false, message: data.error || "Failed to send test email." })
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || "An error occurred while sending the test email." })
    } finally {
      setLoading(false)
    }
  }

  // Check email configuration
  const checkEmailConfig = async () => {
    setConfigStatus(null)

    try {
      const response = await fetch("/api/email-config-check")
      const data = await response.json()

      setConfigStatus({
        configured: data.configured,
        error: data.error,
      })
    } catch (error: any) {
      setConfigStatus({
        configured: false,
        error: error.message || "An error occurred while checking email configuration.",
      })
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Email System Test</CardTitle>
        <CardDescription>Test your email notification system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium" htmlFor="test-email">
              Email Address
            </label>
            <Button variant="outline" size="sm" onClick={checkEmailConfig}>
              Check Config
            </Button>
          </div>
          <div className="flex space-x-2">
            <Input
              id="test-email"
              placeholder="Enter email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button onClick={sendTestEmail} disabled={loading || !email}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Test
            </Button>
          </div>
        </div>

        {configStatus && (
          <Alert variant={configStatus.configured ? "default" : "destructive"}>
            {configStatus.configured ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>
              {configStatus.configured ? "Email Configuration Valid" : "Email Configuration Invalid"}
            </AlertTitle>
            <AlertDescription>
              {configStatus.configured
                ? "Your email configuration is valid and ready to use."
                : `Error: ${configStatus.error || "Unknown error"}`}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Email Sent" : "Email Failed"}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Test email will be sent from {process.env.NEXT_PUBLIC_EMAIL_FROM || "your configured email account"}.
      </CardFooter>
    </Card>
  )
}
