"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import type { Room } from "@/types/booking"
import { motion } from "framer-motion"
import Image from "next/image"

interface RoomDetailsCardProps {
  room: Room
  className?: string
}

export function RoomDetailsCard({ room, className = "" }: RoomDetailsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="overflow-hidden">
        <motion.div
          className="relative aspect-video overflow-hidden"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          <Image
            src={room.image_url || "/placeholder.svg?height=300&width=500&query=meeting+room"}
            alt={room.name}
            fill
            className="object-cover"
          />
        </motion.div>
        <Badge className="absolute top-2 right-2 bg-primary">Capacity: {room.capacity}</Badge>
        <CardHeader>
          <CardTitle>{room.name}</CardTitle>
          <CardDescription>{room.description || "Meeting room"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Room Features</h3>
            <ul className="space-y-1">
              <li className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                <span>Capacity for {room.capacity} people</span>
              </li>
              {room.has_projector && (
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Projector available</span>
                </li>
              )}
              {room.has_wifi && (
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>High-speed Wi-Fi</span>
                </li>
              )}
              {room.has_coffee && (
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Coffee service</span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Pricing</h3>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm">Hourly Rate:</span>
                <span className="font-bold">฿{room.hourly_rate}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Minimum booking: 1 hour</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
