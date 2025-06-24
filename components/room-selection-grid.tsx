"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wifi, Monitor, Coffee } from "lucide-react"
import type { Room } from "@/types/booking"
import { motion } from "framer-motion"

interface RoomSelectionGridProps {
  rooms: Room[]
  onSelectRoom: (room: Room) => void
}

export function RoomSelectionGrid({ rooms, onSelectRoom }: RoomSelectionGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <motion.div
          key={room.id}
          whileHover={{
            scale: 1.03,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video relative bg-muted">
              {room.image_url ? (
                <img
                  src={room.image_url || "/placeholder.svg"}
                  alt={room.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Monitor className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
              <Badge className="absolute top-2 right-2 bg-primary">Capacity: {room.capacity}</Badge>
            </div>
            <CardHeader>
              <CardTitle>{room.name}</CardTitle>
              <CardDescription>{room.description || "Meeting room"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {room.has_projector && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Monitor className="h-3 w-3" />
                    Projector
                  </Badge>
                )}
                {room.has_wifi && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    Wi-Fi
                  </Badge>
                )}
                {room.has_coffee && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Coffee className="h-3 w-3" />
                    Coffee
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Hourly Rate:</span>
                  <span className="font-medium">฿{room.hourly_rate}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => onSelectRoom(room)} className="w-full">
                Select Room
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
