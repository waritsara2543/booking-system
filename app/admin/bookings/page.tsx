"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

interface Booking {
  id: string
  room_id: string
  room_name: string
  date: string
  start_time: string
  end_time: string
  name: string
  email: string
  status: string
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [statusNote, setStatusNote] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/bookings")
        if (!response.ok) {
          throw new Error("Failed to fetch bookings")
        }
        const data = await response.json()
        setBookings(data)
      } catch (err: any) {
        console.error("Error fetching bookings:", err)
        setError(err.message || "An error occurred while fetching bookings")
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  const openStatusDialog = (booking: Booking, status: string) => {
    setSelectedBooking(booking)
    setNewStatus(status)
    setStatusNote("")
    setDialogOpen(true)
  }

  const handleStatusChange = async () => {
    if (!selectedBooking || !newStatus) return

    try {
      setUpdatingStatus(true)

      const response = await fetch(`/api/bookings/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          status: newStatus,
          reason: statusNote,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update booking status")
      }

      // อัพเดตสถานะในหน้าจอ
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === selectedBooking.id ? { ...booking, status: newStatus } : booking,
        ),
      )

      toast({
        title: "Status Updated",
        description: `Booking status changed to ${newStatus}`,
      })

      setDialogOpen(false)
      setSelectedBooking(null)
      setNewStatus("")
      setStatusNote("")
    } catch (err: any) {
      console.error("Error updating status:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to update booking status",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>{booking.room_name}</TableCell>
                      <TableCell>{booking.date ? format(new Date(booking.date), "MMM d, yyyy") : "N/A"}</TableCell>
                      <TableCell>
                        {booking.start_time} - {booking.end_time}
                      </TableCell>
                      <TableCell>{booking.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${
                            booking.status === "confirmed"
                              ? "border-green-500 text-green-600"
                              : booking.status === "pending"
                                ? "border-amber-500 text-amber-600"
                                : booking.status === "cancelled"
                                  ? "border-red-500 text-red-600"
                                  : ""
                          }`}
                        >
                          {booking.status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Link href={`/bookings/${booking.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                          <div className="flex space-x-1">
                            {booking.status !== "confirmed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => openStatusDialog(booking, "confirmed")}
                              >
                                Confirm
                              </Button>
                            )}
                            {booking.status !== "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 border-amber-600 hover:bg-amber-50"
                                onClick={() => openStatusDialog(booking, "pending")}
                              >
                                Pending
                              </Button>
                            )}
                            {booking.status !== "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => openStatusDialog(booking, "cancelled")}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Booking Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status to{" "}
              <span
                className={`font-medium ${
                  newStatus === "confirmed"
                    ? "text-green-600"
                    : newStatus === "pending"
                      ? "text-amber-600"
                      : newStatus === "cancelled"
                        ? "text-red-600"
                        : ""
                }`}
              >
                {newStatus}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for status change (required)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for status change..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={updatingStatus || !statusNote.trim()}
              className={
                newStatus === "confirmed"
                  ? "bg-green-600 hover:bg-green-700"
                  : newStatus === "cancelled"
                    ? "bg-red-600 hover:bg-red-700"
                    : ""
              }
            >
              {updatingStatus ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
