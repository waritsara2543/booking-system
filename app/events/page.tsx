"use client"

import { CardFooter } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Eye } from "lucide-react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { createClient } from "@/lib/supabase"
import { motion } from "framer-motion"

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        console.log("Fetching events from room_bookings where type=event")

        // First, get the room bookings that are events
        const { data: bookings, error: bookingsError } = await supabase
          .from("room_bookings")
          .select(`
            id,
            purpose,
            notes,
            start_time,
            end_time,
            date,
            room_id,
            attendees,
            status,
            type,
            attachment_url
          `)
          .eq("type", "event")
          .eq("status", "confirmed")
          .order("date", { ascending: true })

        if (bookingsError) {
          console.error("Supabase error fetching bookings:", bookingsError)
          throw new Error(`Error fetching events: ${bookingsError.message}`)
        }

        if (!bookings || bookings.length === 0) {
          console.log("No events found")
          setEvents([])
          return
        }

        console.log(`Fetched ${bookings.length} events`)

        // Get room details for each booking
        const eventsWithRooms = await Promise.all(
          bookings.map(async (booking) => {
            const { data: room, error: roomError } = await supabase
              .from("rooms")
              .select("id, name, capacity, hourly_rate, description, image_url")
              .eq("id", booking.room_id)
              .single()

            if (roomError) {
              console.warn(`Could not fetch room for booking ${booking.id}:`, roomError)
              return { ...booking, room: null }
            }

            return { ...booking, room }
          }),
        )

        // Filter out past events
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const upcomingEvents = eventsWithRooms.filter((event) => {
          const eventDate = new Date(event.date)
          return eventDate >= today
        })

        console.log(`${upcomingEvents.length} upcoming events after filtering`)

        setEvents(upcomingEvents)
      } catch (err) {
        console.error("Error in fetchEvents:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.date)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (filter === "upcoming") {
      return eventDate >= today
    } else if (filter === "past") {
      return eventDate < today
    } else {
      return true
    }
  })

  if (isLoading) {
    return (
      <div className="container py-10">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            <Calendar className="h-12 w-12 text-primary" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground mt-4"
          >
            Loading events...
          </motion.p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="container py-10">
        <Header />
        <div className="mb-8">
          <motion.h1
            className="text-3xl font-bold tracking-tight"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Upcoming Events
          </motion.h1>
          <motion.p
            className="text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Browse and register for our upcoming community events
          </motion.p>
        </div>
        <motion.div
          className="flex flex-col items-center justify-center min-h-[40vh] text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Events Scheduled</h2>
          <p className="text-muted-foreground max-w-md">
            There are no upcoming events at the moment. Check back soon for new events.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <motion.h1
            className="text-3xl font-bold tracking-tight"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Upcoming Events
          </motion.h1>
          <motion.p
            className="text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Browse and register for our upcoming community events
          </motion.p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
            <p className="font-medium">Error loading events</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <motion.div
          className="flex flex-wrap gap-2 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="transition-all duration-300"
          >
            All Events
          </Button>
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
            className="transition-all duration-300"
          >
            Upcoming
          </Button>
          <Button
            variant={filter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("past")}
            className="transition-all duration-300"
          >
            Past Events
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{
                scale: 1.03,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                transition: { duration: 0.2 },
              }}
              className="col-span-1"
            >
              <Link href={`/events/${event.id}`}>
                <Card className="h-full overflow-hidden hover:border-primary/50 transition-all duration-300">
                  <div className="aspect-video relative bg-muted overflow-hidden">
                    {event.attachment_url ? (
                      <img
                        src={event.attachment_url || "/placeholder.svg"}
                        alt={event.purpose}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.src = event.room?.image_url || "/placeholder.svg?height=200&width=400"
                        }}
                      />
                    ) : event.room?.image_url ? (
                      <img
                        src={event.room.image_url || "/placeholder.svg"}
                        alt={event.room.name}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                      {event.purpose}
                    </CardTitle>
                    <CardDescription>{format(parseISO(event.date), "EEEE, MMMM d, yyyy")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>
                        {event.start_time} - {event.end_time}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{event.room?.name || "Room not specified"}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button variant="ghost" className="w-full justify-start hover:bg-primary/10 group">
                      <Eye className="h-4 w-4 mr-2 group-hover:text-primary transition-colors" />
                      <span className="group-hover:text-primary transition-colors">View Details</span>
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}
