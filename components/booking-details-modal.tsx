"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, MapPin, User, Phone, Mail, FileText, Users } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface BookingDetailsModalProps {
  booking: any
  isOpen: boolean
  onClose: () => void
  onStatusUpdate: (bookingId: string, status: string, note?: string) => void
}

export function BookingDetailsModal({ booking, isOpen, onClose, onStatusUpdate }: BookingDetailsModalProps) {
  const [newStatus, setNewStatus] = useState(booking?.status || "pending")
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  if (!booking) return null

  const handleStatusUpdate = async () => {
    if (newStatus === booking.status && !note.trim()) {
      toast.error("Please change status or add a note")
      return
    }

    setIsUpdating(true)
    try {
      await onStatusUpdate(booking.id, newStatus, note.trim())
      toast.success("Booking status updated successfully")
      onClose()
    } catch (error) {
      toast.error("Failed to update booking status")
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Name</p>
                  <p className="text-sm text-muted-foreground">{booking.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{booking.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{booking.phone || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Room</p>
                  <p className="text-sm text-muted-foreground">{booking.room_name || "Unknown Room"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.date ? format(new Date(booking.date), "PPP") : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.start_time} - {booking.end_time}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Attendees</p>
                <p className="text-sm text-muted-foreground">{booking.attendees || "N/A"} people</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Purpose</p>
                <p className="text-sm text-muted-foreground">{booking.purpose || "N/A"}</p>
              </div>
            </div>

            {booking.notes && (
              <div>
                <p className="text-sm font-medium mb-1">Notes</p>
                <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">{booking.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium">Current Status</p>
                <Badge className={getStatusColor(booking.status)}>{booking.status.toUpperCase()}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Update Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Update Status</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note / Reason (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note or reason for the status change..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
