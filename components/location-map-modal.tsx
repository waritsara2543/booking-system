"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExternalLink, MapPin } from "lucide-react"

interface LocationMapModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LocationMapModal({ isOpen, onClose }: LocationMapModalProps) {
  // The coordinates for the provided location
  const latitude = 7.8271142
  const longitude = 98.3399754
  const locationName = "BTC Space - Blockchain Technology Center"
  const address = "BTC Space - Blockchain Technology Center, Phuket, Thailand"

  // Direct Google Maps URL that doesn't require an API key
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`

  // Direct link to Google Maps
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-primary" />
            Our Location
          </DialogTitle>
          <DialogDescription>
            {locationName} - {address}
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-[400px] rounded-md overflow-hidden border">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Meeting Room Location"
            className="absolute inset-0"
          ></iframe>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button as="a" href={directionsUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Get Directions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
