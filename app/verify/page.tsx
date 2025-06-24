"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    async function verifyUser() {
      try {
        // Get the email from the URL
        const email = searchParams.get("email")

        if (!email) {
          setVerificationStatus("error")
          setErrorMessage("No email provided for verification")
          return
        }

        // Update the member's verified status
        const { error } = await supabase.from("members").update({ verified: true }).eq("email", email)

        if (error) {
          throw error
        }

        setVerificationStatus("success")
      } catch (err) {
        console.error("Verification error:", err)
        setVerificationStatus("error")
        setErrorMessage("Failed to verify your account. Please try again.")
      }
    }

    verifyUser()
  }, [searchParams])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Account Verification</CardTitle>
            <CardDescription>Verifying your membership account</CardDescription>
          </CardHeader>
          <CardContent>
            {verificationStatus === "loading" && (
              <div className="flex flex-col items-center py-6">
                <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
                <p>Verifying your account...</p>
              </div>
            )}

            {verificationStatus === "success" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Verification successful!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your account has been verified. You can now log in and book meeting rooms with your member benefits.
                </AlertDescription>
              </Alert>
            )}

            {verificationStatus === "error" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Verification failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            {verificationStatus !== "loading" && (
              <Link href="/login">
                <Button>{verificationStatus === "success" ? "Go to Login" : "Try Again"}</Button>
              </Link>
            )}
          </CardFooter>
        </Card>
      </main>
      <footer className="border-t py-6">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Booking System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
