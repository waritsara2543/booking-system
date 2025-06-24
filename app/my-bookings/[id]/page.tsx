"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Mail, User, Phone, Users, FileText, CreditCard, ArrowLeft, Loader2, Info, File } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Cookies from "js-cookie"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type BookingDetails = {
  id: string
  name: string
  email: string
  phone: string
  date: string
  start_time: string
  end_time: string
  purpose: string
  attendees: number
  notes?: string
  payment_method: string
  status: "pending" | "confirmed" | "cancelled"
  room_id: string
  room_name?: string
  room_capacity?: number
  room_hourly_rate?: number
  member_id?: string | null
  member_code?: string | null
}

export default function MemberBookingDetailsPage() {
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const routeParams = useParams()

  useEffect(() => {
    // Check if user is logged in
    try {
      const email = localStorage.getItem("memberEmail")
      const memberId = localStorage.getItem("memberId") || Cookies.get("memberId")

      if (!email && !memberId) {
        router.push("/login")
        return
      }

      setUserEmail(email)
      fetchBookingDetails(email, memberId)
    } catch (error) {
      console.error("Error accessing localStorage:", error)
      router.push("/login")
    }
  }, [routeParams.id, router])

  async function fetchBookingDetails(email: string | null, memberId: string | null) {
    try {
      setIsLoading(true)
      setError(null)

      // เพิ่ม debug info
      setDebugInfo(`Email: ${email}, MemberId: ${memberId}, BookingID: ${routeParams.id}`)

      // First, get the booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from("room_bookings")
        .select(`
          id,
          name,
          email,
          phone,
          date,
          start_time,
          end_time,
          purpose,
          attendees,
          notes,
          payment_method,
          status,
          room_id,
          member_id
        `)
        .eq("id", routeParams.id)
        .single()

      if (bookingError) {
        console.error("Supabase booking query error:", bookingError)
        throw new Error(`Failed to load booking details: ${bookingError.message}`)
      }

      if (!bookingData) {
        throw new Error("Booking not found")
      }

      // Check if user is authorized to view this booking
      // Members can only view their own bookings
      let authorized = false

      if (email && bookingData.email === email) {
        authorized = true
      }

      // ตรวจสอบจาก member_id
      if (!authorized && memberId && bookingData.member_id) {
        const { data: memberData } = await supabase
          .from("members")
          .select("member_id")
          .eq("id", bookingData.member_id)
          .single()

        if (memberData && memberData.member_id === memberId) {
          authorized = true
        }
      }

      // Update debug info
      setDebugInfo(
        (prev) => `${prev || ""}, Booking email: ${bookingData.email}, User email: ${email}, Authorized: ${authorized}`,
      )

      if (!authorized) {
        setError("You don't have permission to view this booking")
        setIsLoading(false)
        return
      }

      // Now get the room details
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("name, capacity, hourly_rate")
        .eq("id", bookingData.room_id)
        .single()

      if (roomError && roomError.code !== "PGRST116") {
        console.error("Supabase room query error:", roomError)
        throw new Error(`Failed to load room details: ${roomError.message}`)
      }

      // If there's a member_id, get the member_id (short code)
      let memberCode = null
      if (bookingData.member_id) {
        const { data: memberData, error: memberError } = await supabase
          .from("members")
          .select("member_id")
          .eq("id", bookingData.member_id)
          .single()

        if (!memberError && memberData) {
          memberCode = memberData.member_id
        }
      }

      // Combine the data
      const combinedData = {
        ...bookingData,
        room_name: roomData?.name || "Unknown Room",
        room_capacity: roomData?.capacity || 0,
        room_hourly_rate: roomData?.hourly_rate || 0,
        member_code: memberCode,
      }

      setBooking(combinedData)
    } catch (err) {
      console.error("Error fetching booking details:", err)
      setError(err instanceof Error ? err.message : "Failed to load booking details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Function to retry fetching
  const retryFetch = () => {
    const email = localStorage.getItem("memberEmail")
    const memberId = localStorage.getItem("memberId") || Cookies.get("memberId")
    fetchBookingDetails(email, memberId)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading booking details...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Error Loading Booking</h2>
            <p className="text-muted-foreground mb-6">{error || "Booking not found"}</p>

            {/* Debug information */}
            {debugInfo && (
              <Alert className="mb-6 max-w-xl mx-auto">
                <Info className="h-4 w-4" />
                <AlertTitle>Debug Information</AlertTitle>
                <AlertDescription className="text-xs text-left">
                  <pre className="whitespace-pre-wrap">{debugInfo}</pre>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4 justify-center">
              <Button onClick={retryFetch} disabled={isLoading}>
                Try Again
              </Button>
              <Link href="/my-bookings">
                <Button variant="outline">Back to My Bookings</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Booking Details</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Room: {booking.room_name}</CardTitle>
              </div>
              <Badge
                variant={
                  booking.status === "confirmed" ? "default" : booking.status === "pending" ? "outline" : "destructive"
                }
                className="ml-0 sm:ml-auto"
              >
                {booking.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <User className="mr-1 h-4 w-4" />
                  Customer
                </div>
                <div className="font-medium">{booking.name}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="mr-1 h-4 w-4" />
                  Email
                </div>
                <div className="font-medium">{booking.email}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="mr-1 h-4 w-4" />
                  Phone
                </div>
                <div className="font-medium">{booking.phone}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  Date
                </div>
                <div className="font-medium">{format(new Date(booking.date), "PPP")}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-4 w-4" />
                  Time
                </div>
                <div className="font-medium">
                  {booking.start_time} - {booking.end_time}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-1 h-4 w-4" />
                  Attendees
                </div>
                <div className="font-medium">{booking.attendees} people</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <File className="mr-1 h-4 w-4" />
                  Meeting Purpose
                </div>
                <div className="font-medium">{booking.purpose} </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <CreditCard className="mr-1 h-4 w-4" />
                  Payment Method
                </div>
                <div className="font-medium capitalize">{booking.payment_method.replace("_", " ")}</div>
              </div>
            </div>

            {booking.notes && (
              <div className="space-y-1">
                <div className="flex items-center text-sm font-medium">
                  <FileText className="mr-1 h-4 w-4" />
                  Notes
                </div>
                <div className="rounded-md bg-muted p-3 text-sm">{booking.notes}</div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-6">
            {/* Note message will appear here from the CardFooter component */}
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
