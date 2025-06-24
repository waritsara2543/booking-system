"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Loader2, Plus, Pencil, Trash2, Users, DollarSign, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import * as XLSX from "xlsx"

type Room = {
  id: string
  name: string
  capacity: number
  hourly_rate: number
  description: string
  image_url?: string
  created_at: string
  bookings_count?: number
}

export default function RoomManagementPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    fetchRooms()
  }, [router])

  async function fetchRooms() {
    try {
      setIsLoading(true)
      setError(null)

      // Get all rooms
      const { data: roomsData, error: roomsError } = await supabase.from("rooms").select("*").order("name")

      if (roomsError) throw roomsError

      if (!roomsData || roomsData.length === 0) {
        setRooms([])
        setIsLoading(false)
        return
      }

      // Get booking counts for each room
      const roomsWithBookings = await Promise.all(
        roomsData.map(async (room) => {
          const { count, error: countError } = await supabase
            .from("room_bookings")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.id)

          if (countError) {
            console.error(`Error getting booking count for room ${room.id}:`, countError)
            return { ...room, bookings_count: 0 }
          }

          return { ...room, bookings_count: count || 0 }
        }),
      )

      setRooms(roomsWithBookings)
    } catch (err) {
      console.error("Error fetching rooms:", err)
      setError("Failed to load rooms")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteRoom(roomId: string) {
    try {
      setIsDeleting(roomId)

      // Check if room has any bookings
      const { count, error: countError } = await supabase
        .from("room_bookings")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)

      if (countError) throw countError

      if (count && count > 0) {
        toast.error("Cannot delete room with existing bookings")
        return
      }

      // Delete the room
      const { error: deleteError } = await supabase.from("rooms").delete().eq("id", roomId)

      if (deleteError) throw deleteError

      toast.success("Room deleted successfully")

      // Update the rooms list
      setRooms(rooms.filter((room) => room.id !== roomId))
    } catch (err) {
      console.error("Error deleting room:", err)
      toast.error("Failed to delete room")
    } finally {
      setIsDeleting(null)
    }
  }

  async function handleExportExcel() {
    try {
      setIsExporting(true)

      // Create a new workbook
      const wb = XLSX.utils.book_new()

      // Format the data for Excel
      const formattedData = rooms.map((room) => ({
        ID: room.id,
        Name: room.name,
        Capacity: room.capacity,
        "Hourly Rate": `฿${room.hourly_rate.toFixed(2)}`,
        Description: room.description || "",
        "Bookings Count": room.bookings_count || 0,
        "Created At": format(new Date(room.created_at), "yyyy-MM-dd"),
      }))

      // Create a worksheet from the data
      const ws = XLSX.utils.json_to_sheet(formattedData)

      // Set column widths
      const colWidths = [
        { wch: 36 }, // ID
        { wch: 25 }, // Name
        { wch: 10 }, // Capacity
        { wch: 12 }, // Hourly Rate
        { wch: 40 }, // Description
        { wch: 15 }, // Bookings Count
        { wch: 12 }, // Created At
      ]
      ws["!cols"] = colWidths

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Rooms")

      // Create a summary worksheet
      const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0)
      const avgHourlyRate = rooms.reduce((sum, room) => sum + room.hourly_rate, 0) / rooms.length
      const totalBookings = rooms.reduce((sum, room) => sum + (room.bookings_count || 0), 0)

      const summaryData = [
        { Metric: "Total Rooms", Value: rooms.length },
        { Metric: "Total Capacity", Value: totalCapacity },
        { Metric: "Average Hourly Rate", Value: `฿${avgHourlyRate.toFixed(2)}` },
        { Metric: "Total Bookings", Value: totalBookings },
        { Metric: "Report Generated", Value: format(new Date(), "yyyy-MM-dd HH:mm:ss") },
      ]

      const summaryWs = XLSX.utils.json_to_sheet(summaryData)
      summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }]

      // Add the summary worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

      // Download the Excel file
      // Convert the workbook to a binary string
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" })

      // Convert binary string to ArrayBuffer
      function s2ab(s: string) {
        const buf = new ArrayBuffer(s.length)
        const view = new Uint8Array(buf)
        for (let i = 0; i < s.length; i++) {
          view[i] = s.charCodeAt(i) & 0xff
        }
        return buf
      }

      // Create a Blob from the ArrayBuffer
      const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" })

      // Create a download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `rooms-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`

      // Append to the document, click, and remove
      document.body.appendChild(a)
      a.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 0)

      toast.success("Room report exported successfully as Excel")
    } catch (error) {
      console.error("Error exporting Excel:", error)
      toast.error("Failed to export Excel")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Meeting Room Management</h1>
              <p className="text-muted-foreground">Manage your meeting rooms and their settings.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportExcel} disabled={isExporting || rooms.length === 0}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export Excel"}
              </Button>
              <Link href="/admin/rooms/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Room
                </Button>
              </Link>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Meeting Rooms</CardTitle>
              <CardDescription>View and manage all meeting rooms in your system.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchRooms}>
                    Try Again
                  </Button>
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No meeting rooms found</p>
                  <Link href="/admin/rooms/new">
                    <Button>Add Your First Room</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Hourly Rate</TableHead>
                          <TableHead>Bookings</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rooms.map((room) => (
                          <TableRow key={room.id}>
                            <TableCell className="font-medium">{room.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                                {room.capacity}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <p className="h-4 w-4 mr-1 text-muted-foreground" />฿
                                {room.hourly_rate.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{room.bookings_count} bookings</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/admin/rooms/${room.id}`}>
                                  <Button size="sm" variant="ghost">
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                </Link>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the room "{room.name}". This action cannot be
                                        undone.
                                        {room.bookings_count > 0 && (
                                          <p className="text-destructive mt-2">
                                            Warning: This room has {room.bookings_count} bookings. You cannot delete a
                                            room with existing bookings.
                                          </p>
                                        )}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteRoom(room.id)}
                                        disabled={isDeleting === room.id || room.bookings_count > 0}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {isDeleting === room.id ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Deleting...
                                          </>
                                        ) : (
                                          "Delete"
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
