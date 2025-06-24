"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Room } from "@/types/booking"
import { motion } from "framer-motion"
import Image from "next/image"
import { Wifi, Coffee, MonitorSmartphone } from "lucide-react"

interface RoomCardProps {
  room: Room
  onClick?: () => void
  className?: string
}

export function RoomCard({ room, onClick, className = "" }: RoomCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`cursor-pointer ${className}`}
    >
      <Card className="overflow-hidden h-full border-2 hover:border-primary/50 transition-colors">
        <div className="relative aspect-video">
          <Image
            src={room.image_url || "/placeholder.svg?height=300&width=500&query=meeting+room"}
            alt={room.name}
            fill
            className="object-cover"
          />
          <Badge className="absolute top-2 right-2 bg-primary">Capacity: {room.capacity}</Badge>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <h3 className="font-bold text-white text-lg">{room.name}</h3>
            <p className="text-white/90 text-sm truncate">{room.description || "Meeting room"}</p>
          </div>
        </div>
        <CardContent className="p-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1 text-muted-foreground text-xs">
              {room.has_wifi && <Wifi className="h-3 w-3" />}
              {room.has_projector && <MonitorSmartphone className="h-3 w-3" />}
              {room.has_coffee && <Coffee className="h-3 w-3" />}
            </div>
            <p className="font-medium text-sm">฿{room.hourly_rate}/hour</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
