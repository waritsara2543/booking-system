"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Calendar, Clock, DoorOpen } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { format, parseISO, isPast, isFuture } from "date-fns"

type Booking = {
  id: string
  name: string
  email: string
  date: string
  start_time: string
  end_time: string
  purpose: string
  status: "pending" | "confirmed" | "cancelled"
  room_id: string
  room_name?: string
}

export default function MyBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [memberEmail, setMemberEmail] = useState<string | null>(null)
  const [memberName, setMemberName] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is logged in
    try {
      const email = localStorage.getItem("memberEmail")
      const name = localStorage.getItem("memberName")

      if (!email) {
        router.push("/login")
        return
      }

      setMemberEmail(email)
      setMemberName(name)
      fetchBookings(email)
    } catch (error) {
      console.error("Error accessing localStorage:", error)
      router.push("/login")
    }
  }, [router])

  async function fetchBookings(email: string) {
    try {
      setIsLoading(true)
      setError(null)

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("room_bookings")
        .select(`
          id,
          name,
          email,
          date,
          start_time,
          end_time,
          purpose,
          status,
          room_id
        `)
        .eq("email", email)
        .order("date", { ascending: false })

      if (bookingsError) {
        console.error("Supabase bookings query error:", bookingsError)
        throw new Error(`Failed to load bookings: ${bookingsError.message}`)
      }

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([])
        setIsLoading(false)
        return
      }

      // Get all room IDs from the bookings
      const roomIds = [...new Set(bookingsData.map((booking) => booking.room_id))]

      // Fetch room details separately
      const { data: roomsData, error: roomsError } = await supabase.from("rooms").select("id, name").in("id", roomIds)

      if (roomsError) {
        console.error("Supabase rooms query error:", roomsError)
        throw new Error(`Failed to load room details: ${roomsError.message}`)
      }

      // Create a map of room IDs to room names
      const roomMap = new Map()
      if (roomsData) {
        roomsData.forEach((room) => {
          roomMap.set(room.id, room.name)
        })
      }

      // Combine the data
      const processedBookings = bookingsData.map((booking) => ({
        ...booking,
        room_name: roomMap.get(booking.room_id) || "Unknown Room",
      }))

      setBookings(processedBookings)
    } catch (err) {
      console.error("Error fetching bookings:", err)
      setError(err instanceof Error ? err.message : "Failed to load bookings. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Filter bookings by past and upcoming
  const pastBookings = bookings.filter((booking) => isPast(parseISO(booking.date)))
  const upcomingBookings = bookings.filter(
    (booking) => isFuture(parseISO(booking.date)) || booking.date === format(new Date(), "yyyy-MM-dd"),
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground">
              {memberName ? `Welcome, ${memberName}` : "View your booking history"}
            </p>
          </div>
          <Link href="/new">
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Bookings</TabsTrigger>
            <TabsTrigger value="past">Past Bookings</TabsTrigger>
            <TabsTrigger value="all">All Bookings</TabsTrigger>
          </TabsList>

          {/* Upcoming Bookings Tab */}
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings</CardTitle>
                <CardDescription>Your scheduled future appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button variant="outline" onClick={() => memberEmail && fetchBookings(memberEmail)}>
                      Try Again
                    </Button>
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You don't have any upcoming bookings</p>
                    <div className="mt-4">
                      <Link href="/new">
                        <Button>Create a Booking</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <BookingsTable bookings={upcomingBookings} />
                )}
              </CardContent>
              <CardFooter hideNote={false}>{/* เนื้อหาอื่นๆ ถ้ามี */}</CardFooter>
            </Card>
          </TabsContent>

          {/* Past Bookings Tab */}
          <TabsContent value="past">
            <Card>
              <CardHeader>
                <CardTitle>Past Bookings</CardTitle>
                <CardDescription>Your previous appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button variant="outline" onClick={() => memberEmail && fetchBookings(memberEmail)}>
                      Try Again
                    </Button>
                  </div>
                ) : pastBookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You don't have any past bookings</p>
                  </div>
                ) : (
                  <BookingsTable bookings={pastBookings} />
                )}
              </CardContent>
              <CardFooter hideNote={false}>{/* เนื้อหาอื่นๆ ถ้ามี */}</CardFooter>
            </Card>
          </TabsContent>

          {/* All Bookings Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Your complete booking history</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-destructive mb-4">{error}</p>
                    <Button variant="outline" onClick={() => memberEmail && fetchBookings(memberEmail)}>
                      Try Again
                    </Button>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You don't have any bookings</p>
                    <div className="mt-4">
                      <Link href="/new">
                        <Button>Create a Booking</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <BookingsTable bookings={bookings} />
                )}
              </CardContent>
              <CardFooter hideNote={false}>{/* เนื้อหาอื่นๆ ถ้ามี */}</CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function BookingsTable({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <DoorOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                    {booking.room_name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    {format(parseISO(booking.date), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    {booking.start_time} - {booking.end_time}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{booking.purpose}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      booking.status === "confirmed"
                        ? "default"
                        : booking.status === "pending"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {/* เปลี่ยนลิงก์จาก /bookings/[id] เป็น /my-bookings/[id] */}
                  <Link href={`/my-bookings/${booking.id}`}>
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
