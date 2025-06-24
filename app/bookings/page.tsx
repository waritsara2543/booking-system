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
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react"

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

// สถานะการจองเรียงตามลำดับ
const STATUS_ORDER = {
  pending: 0,
  confirmed: 1,
  cancelled: 2,
}

export default function BookingsPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [statusNote, setStatusNote] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Client-side security check
  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    const isUserAdmin = adminCookie === "true"

    setIsAdmin(isUserAdmin)

    if (!isUserAdmin) {
      console.error("Unauthorized access to bookings page - redirecting to login")
      router.push("/login?tab=admin&callbackUrl=/bookings")
      return
    }

    setIsAuthorized(true)
  }, [router])

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

  // ตรวจสอบว่าสถานะที่กำลังจะเปลี่ยนไปอยู่ในลำดับที่สูงกว่าสถานะปัจจุบันหรือไม่
  const canChangeToStatus = (currentStatus: string, newStatus: string) => {
    return (
      STATUS_ORDER[newStatus as keyof typeof STATUS_ORDER] > STATUS_ORDER[currentStatus as keyof typeof STATUS_ORDER]
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed"
      case "pending":
        return "Pending"
      case "cancelled":
        return "Cancelled"
      default:
        return status
    }
  }

  const openStatusDialog = (booking: Booking, status: string) => {
    console.log("Opening status dialog for booking:", booking.id, "new status:", status)
    setSelectedBooking(booking)
    setNewStatus(status)
    setStatusNote("")
    setDialogOpen(true)
  }

  const handleStatusChange = async () => {
    if (!selectedBooking || !newStatus) return

    try {
      setUpdatingStatus(true)

      // ใช้ API endpoint ที่มีอยู่แล้ว
      const response = await fetch(`/api/bookings`, {
        method: "PUT", // ใช้ PUT แทน POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedBooking.id, // ส่ง id ของการจอง
          status: newStatus, // สถานะใหม่
          notes: statusNote, // หมายเหตุ (ใช้ notes แทน admin_note)
        }),
      })

      if (!response.ok) {
        const errorMessage = `Failed to update booking status: ${response.status} ${response.statusText}`
        console.error("API error response:", errorMessage)
        throw new Error(errorMessage)
      }

      // อัพเดตสถานะในหน้าจอ
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking.id === selectedBooking.id ? { ...booking, status: newStatus } : booking,
        ),
      )

      toast({
        title: "สถานะอัพเดตแล้ว",
        description: `สถานะการจองถูกเปลี่ยนเป็น ${newStatus}`,
      })

      setDialogOpen(false)
    } catch (err: any) {
      console.error("Error updating status:", err)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message || "ไม่สามารถอัพเดตสถานะได้",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  // If not authorized yet, show minimal loading state
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <p className="mt-4 text-muted-foreground">Checking authorization...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
          <AdminSidebar />
          <main className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
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
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
          <AdminSidebar />
          <main className="space-y-6">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-600">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{error}</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Bookings</CardTitle>
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
                            <div className="flex items-center gap-2">
                              {getStatusIcon(booking.status)}
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
                                {getStatusText(booking.status)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Link href={`/bookings/${booking.id}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                              <div className="flex space-x-1">
                                {/* แสดงปุ่ม Confirm เฉพาะเมื่อสถานะปัจจุบันเป็น pending */}
                                {booking.status === "pending" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                    onClick={() => openStatusDialog(booking, "confirmed")}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Confirm
                                  </Button>
                                )}

                                {/* แสดงปุ่ม Cancel เฉพาะเมื่อสถานะปัจจุบันเป็น pending หรือ confirmed */}
                                {(booking.status === "pending" || booking.status === "confirmed") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => openStatusDialog(booking, "cancelled")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
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
        </main>
      </div>

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
                {newStatus && getStatusText(newStatus)}
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
