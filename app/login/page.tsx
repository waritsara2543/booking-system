"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, Info, ShieldCheck, User } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { setAuthData, setAdminData } from "@/lib/auth-utils"

const memberFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  memberId: z.string().length(7, {
    message: "Member ID must be exactly 7 characters",
  }),
})

const adminFormSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
})

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("member")

  // ตั้งค่า tab จาก URL parameter
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "admin") {
      setActiveTab("admin")
    }
  }, [searchParams])

  // Member login form
  const memberForm = useForm<z.infer<typeof memberFormSchema>>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      email: "",
      memberId: "",
    },
  })

  // Admin login form
  const adminForm = useForm<z.infer<typeof adminFormSchema>>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const {
    register: registerMember,
    handleSubmit: handleMemberSubmit,
    formState: { errors: memberErrors },
  } = memberForm

  const {
    register: registerAdmin,
    handleSubmit: handleAdminSubmit,
    formState: { errors: adminErrors },
  } = adminForm

  async function onMemberSubmit(values: z.infer<typeof memberFormSchema>) {
    setIsSubmitting(true)
    setError(null)

    try {
      // Check if member exists and is verified
      const { data: member, error } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", values.memberId)
        .eq("email", values.email)
        .maybeSingle()

      if (error) {
        console.error("Login query error:", error)
        throw new Error(`Login failed: ${error.message}`)
      }

      if (!member) {
        setError("Invalid Member ID or email. Please try again.")
        return
      }

      if (!member.verified) {
        setError("Your account is not verified. Please check your email for verification instructions.")
        return
      }

      // ใช้ฟังก์ชันใหม่เพื่อตั้งค่าข้อมูลการล็อกอิน
      const authResult = setAuthData(member.member_id, member.name, member.email, member.phone || "")

      if (!authResult.success) {
        throw new Error("Failed to set authentication data")
      }

      // แจ้งเตือนว่าล็อกอินสำเร็จ
      toast.success("Login successful!")

      // ตรวจสอบ URL callback ถ้ามี
      const callbackUrl = searchParams.get("callbackUrl")

      // หน่วงเวลาเล็กน้อยเพื่อให้ cookie ถูกตั้งค่าก่อนนำทาง
      setTimeout(() => {
        if (callbackUrl) {
          window.location.href = callbackUrl // ใช้ window.location.href แทน router.push
        } else {
          window.location.href = "/" // ใช้ window.location.href แทน router.push
        }
      }, 100)
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during login. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onAdminSubmit(values: z.infer<typeof adminFormSchema>) {
    setIsSubmitting(true)
    setError(null)

    try {
      // Check if admin exists
      const { data: admin, error } = await supabase
        .from("admins")
        .select("*")
        .eq("username", values.username)
        .maybeSingle()

      if (error) {
        console.error("Admin login query error:", error)
        throw new Error(`Login failed: ${error.message}`)
      }

      if (!admin) {
        setError("Invalid username or password. Please try again.")
        return
      }

      // ใช้ฟังก์ชันใหม่เพื่อตั้งค่าข้อมูลแอดมิน
      const authResult = setAdminData(admin.username)

      if (!authResult.success) {
        throw new Error("Failed to set admin authentication data")
      }

      toast.success("Admin login successful!")

      // หน่วงเวลาเล็กน้อยเพื่อให้ cookie ถูกตั้งค่าก่อนนำทาง
      setTimeout(() => {
        window.location.href = "/admin" // ใช้ window.location.href แทน router.push
      }, 100)
    } catch (err) {
      console.error("Admin login error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during login. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Login</h1>
        </div>

        <Card className="max-w-md mx-auto w-full">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Sign in to your account</CardTitle>
            <CardDescription>Choose your login type below</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="member" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Member</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="member">
                <Alert variant="default" className="bg-blue-50 border-blue-200 mb-4">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Member ID Required</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    You need your 7-character Member ID to log in. This was provided during registration and sent to
                    your email.
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleMemberSubmit(onMemberSubmit)} className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="memberId" className="text-sm font-medium">
                      Member ID
                    </label>
                    <Input
                      id="memberId"
                      placeholder="Enter your 7-character Member ID"
                      maxLength={7}
                      {...registerMember("memberId")}
                    />
                    {memberErrors.memberId && <p className="text-sm text-red-500">{memberErrors.memberId.message}</p>}
                    <p className="text-sm text-muted-foreground">The 7-character ID you received when registering</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </label>
                    <Input id="email" placeholder="john@example.com" type="email" {...registerMember("email")} />
                    {memberErrors.email && <p className="text-sm text-red-500">{memberErrors.email.message}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in..." : "Sign In as Member"}
                  </Button>

                  <p className="text-sm text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-primary hover:underline">
                      Register
                    </Link>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <Alert variant="default" className="bg-amber-50 border-amber-200 mb-4">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Admin Access</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    This login is for administrators only. Please enter your admin credentials to access the dashboard.
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleAdminSubmit(onAdminSubmit)} className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">
                      Username
                    </label>
                    <Input id="username" placeholder="Enter your admin username" {...registerAdmin("username")} />
                    {adminErrors.username && <p className="text-sm text-red-500">{adminErrors.username.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="password"
                      placeholder="Enter your password"
                      type="password"
                      {...registerAdmin("password")}
                    />
                    {adminErrors.password && <p className="text-sm text-red-500">{adminErrors.password.message}</p>}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in..." : "Sign In as Admin"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4 sm:pt-6">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Booking System. All rights reserved.
            </p>
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
