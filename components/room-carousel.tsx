"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DoorOpen, Users, Clock, Calendar } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Room = {
  id: string
  name: string
  capacity: number
  hourly_rate: number
  description: string
  image_url?: string
}

export function RoomCarousel() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [isAnimationPaused, setIsAnimationPaused] = useState(false)

  // Fetch rooms from the database
  useEffect(() => {
    async function fetchRooms() {
      try {
        const { data, error } = await supabase.from("rooms").select("*").order("name")

        if (error) {
          console.error("Error fetching rooms:", error)
          return
        }

        if (data && data.length > 0) {
          // Double the rooms array for infinite scrolling effect
          setRooms([...data, ...data])
        } else {
          // Fallback to empty array if no rooms found
          setRooms([])
        }
      } catch (err) {
        console.error("Error in fetchRooms:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRooms()
  }, [])

  // Pause animation on hover
  const handleMouseEnter = () => setIsAnimationPaused(true)
  const handleMouseLeave = () => setIsAnimationPaused(false)

  if (isLoading) {
    return (
      <div className="w-full py-6">
        <h2 className="text-2xl font-bold text-center mb-6">Our Meeting Rooms</h2>
        <div className="flex justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="w-full py-6">
        <h2 className="text-2xl font-bold text-center mb-6">Our Meeting Rooms</h2>
        <p className="text-center text-muted-foreground">No meeting rooms available</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden py-6">
      <h2 className="text-2xl font-bold text-center mb-6">Our Meeting Rooms</h2>

      <div
        ref={carouselRef}
        className={cn("flex gap-6 transition-transform", isAnimationPaused ? "animate-none" : "animate-carousel")}
        style={{
          width: `${rooms.length * 320}px`,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {rooms.map((room, index) => (
          <Card
            key={`${room.id}-${index}`}
            className="w-[300px] flex-shrink-0 flex flex-col h-[400px] transition-all duration-300 hover:shadow-lg hover:border-primary/50"
          >
            <div className="h-[150px] overflow-hidden">
              <img
                src={room.image_url || "/placeholder.svg?height=200&width=400"}
                alt={room.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              />
            </div>
            <div className="h-[100px] px-6 pt-6 pb-2">
              <div className="flex items-center mb-2">
                <DoorOpen className="h-5 w-5 mr-2 text-primary" />
                <h3 className="text-lg font-semibold">{room.name}</h3>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                <span>Capacity: {room.capacity} people</span>
              </div>
            </div>
            <CardContent className="flex-grow pt-2">
              <p className="text-sm line-clamp-2 mb-3">{room.description}</p>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />฿{room.hourly_rate}/hour
              </div>
            </CardContent>
            <CardFooter className="mt-auto pt-2">
              <Link href="/new" className="w-full">
                <Button variant="outline" className="w-full group">
                  <Calendar className="h-4 w-4 mr-2 group-hover:text-primary transition-colors" />
                  <span className="group-hover:text-primary transition-colors">Book Now</span>
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
