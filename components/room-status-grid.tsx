"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Loader2, Users, Clock } from "lucide-react"
import Link from "next/link"

type Room = {
  id: string
  name: string
  capacity: number
  hourly_rate: number
  description: string
  image_url?: string
  status: "available" | "in-use" | "booked"
  current_booking?: {
    id: string
    name: string
    start_time: string
    end_time: string
  }
  next_booking?: {
    id: string
    name: string
    start_time: string
  }
}

export function RoomStatusGrid() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRooms() {
      try {
        setIsLoading(true)
        setError(null)

        // Get all rooms
        const { data: roomsData, error: roomsError } = await supabase.from("rooms").select("*").order("name")

        if (roomsError) throw roomsError

        if (!roomsData || roomsData.length === 0) {
          setRooms([])
          return
        }

        // Get today's date in YYYY-MM-DD format
        const today = format(new Date(), "yyyy-MM-dd")
        const currentTime = format(new Date(), "HH:mm")

        // Get all bookings for today
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("room_bookings")
          .select("id, name, room_id, start_time, end_time")
          .eq("date", today)
          .eq("status", "confirmed")
          .order("start_time")

        if (bookingsError) throw bookingsError

        // Process rooms with booking status
        const processedRooms = roomsData.map((room) => {
          // Find bookings for this room
          const roomBookings = bookingsData?.filter((booking) => booking.room_id === room.id) || []

          // Find current booking (if any)
          const currentBooking = roomBookings.find(
            (booking) => booking.start_time <= currentTime && booking.end_time > currentTime,
          )

          // Find next booking (if any)
          const nextBooking = roomBookings.find((booking) => booking.start_time > currentTime)

          // Determine room status
          let status: "available" | "in-use" | "booked" = "available"
          if (currentBooking) {
            status = "in-use"
          } else if (nextBooking) {
            status = "booked"
          }

          return {
            ...room,
            status,
            current_booking: currentBooking
              ? {
                  id: currentBooking.id,
                  name: currentBooking.name,
                  start_time: currentBooking.start_time,
                  end_time: currentBooking.end_time,
                }
              : undefined,
            next_booking: nextBooking
              ? {
                  id: nextBooking.id,
                  name: nextBooking.name,
                  start_time: nextBooking.start_time,
                }
              : undefined,
          }
        })

        setRooms(processedRooms)
      } catch (err) {
        console.error("Error fetching rooms:", err)
        setError("Failed to load room status")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRooms()

    // Set up interval to refresh data every minute
    const intervalId = setInterval(fetchRooms, 60000)

    return () => clearInterval(intervalId)
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (rooms.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground mb-4">No meeting rooms found</p>
          <Link href="/admin/rooms">
            <Button>Add Meeting Rooms</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Current Room Status</h2>
        <p className="text-sm text-muted-foreground">Last updated: {format(new Date(), "h:mm a")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle>{room.name}</CardTitle>
                <Badge
                  variant={
                    room.status === "available" ? "outline" : room.status === "in-use" ? "destructive" : "default"
                  }
                >
                  {room.status === "available" ? "Available" : room.status === "in-use" ? "In Use" : "Booked Soon"}
                </Badge>
              </div>
              <CardDescription className="flex items-center mt-1">
                <Users className="h-3.5 w-3.5 mr-1" />
                Capacity: {room.capacity} people
              </CardDescription>
            </CardHeader>
            <CardContent>
              {room.status === "in-use" && room.current_booking && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">Current Session:</p>
                  <p>{room.current_booking.name}</p>
                  <p className="flex items-center text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Until {room.current_booking.end_time}
                  </p>
                </div>
              )}
              {room.status === "booked" && room.next_booking && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">Next Session:</p>
                  <p>{room.next_booking.name}</p>
                  <p className="flex items-center text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Starts at {room.next_booking.start_time}
                  </p>
                </div>
              )}
              {room.status === "available" && (
                <p className="text-sm text-muted-foreground">Room is available for booking</p>
              )}
            </CardContent>
            <CardFooter className="pt-1">
              <Link href={`/admin/rooms/${room.id}`} className="w-full">
                <Button variant="outline" size="sm" className="w-full">
                  View Details
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
