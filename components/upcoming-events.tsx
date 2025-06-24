"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { format, parseISO } from "date-fns"
import { Loader2 } from "lucide-react"

type Event = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  room_name: string
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      try {
        setIsLoading(true)
        setError(null)

        // Get today's date in YYYY-MM-DD format
        const today = format(new Date(), "yyyy-MM-dd")

        // Get upcoming bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("room_bookings")
          .select(`
            id,
            name,
            date,
            start_time,
            end_time,
            purpose,
            room_id
          `)
          .eq("type", "event")
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(5)

        if (bookingsError) throw bookingsError

        if (!bookingsData || bookingsData.length === 0) {
          setEvents([])
          return
        }

        // Get room details
        const roomIds = [...new Set(bookingsData.map((booking) => booking.room_id))]
        const { data: roomsData, error: roomsError } = await supabase.from("rooms").select("id, name").in("id", roomIds)

        if (roomsError) throw roomsError

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

        setEvents(processedBookings)
      } catch (err) {
        console.error("Error fetching upcoming events:", err)
        setError("Failed to load upcoming events")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
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

  if (events.length === 0) {
    return <p className="text-muted-foreground">No upcoming events</p>
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="border rounded-md p-3">
          <p className="font-medium">{event.purpose}</p>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(event.date), "MMM d, yyyy")} - {event.start_time} in {event.room_name}
          </p>
        </div>
      ))}
    </div>
  )
}
