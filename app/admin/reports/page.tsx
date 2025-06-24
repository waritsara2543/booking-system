"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Loader2, Calendar, FileDown, FileSpreadsheet } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { generateBookingsPDF, downloadPDF } from "@/lib/pdf-utils"
import { generateBookingsExcel, downloadExcel } from "@/lib/excel-utils"
import { toast } from "sonner"
import { BookingsByRoomChart } from "@/components/bookings-by-room-chart"
import { BookingsTrendChart } from "@/components/bookings-trend-chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

type DateRange = {
  from: Date | undefined
  to: Date | undefined
}

export default function ReportsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [reportType, setReportType] = useState<"bookings" | "rooms" | "users">("bookings")
  const [bookings, setBookings] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"overview" | "rooms" | "trends">("overview")

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    fetchReportData()
  }, [router, dateRange, reportType])

  async function fetchReportData() {
    try {
      setIsLoading(true)

      if (!dateRange.from || !dateRange.to) return

      const fromDate = format(dateRange.from, "yyyy-MM-dd")
      const toDate = format(dateRange.to, "yyyy-MM-dd")

      // Fetch bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("room_bookings")
        .select(`
          id,
          name,
          email,
          date,
          start_time,
          end_time,
          purpose,
          status,
          room_id,
          created_at
        `)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: true })

      if (bookingsError) throw bookingsError

      // Get room details for the bookings
      if (bookingsData && bookingsData.length > 0) {
        const roomIds = [...new Set(bookingsData.map((booking) => booking.room_id))]
        const { data: roomsData, error: roomsError } = await supabase.from("rooms").select("id, name").in("id", roomIds)

        if (roomsError) throw roomsError

        // Create a map of room IDs to room names
        const roomMap = new Map()
        if (roomsData) {
          roomsData.forEach((room) => {
            roomMap.set(room.id, room.name)
          })
        }

        // Combine the data
        const processedBookings = bookingsData.map((booking) => ({
          ...booking,
          room_name: roomMap.get(booking.room_id) || "Unknown Room",
        }))

        setBookings(processedBookings)
      } else {
        setBookings([])
      }
    } catch (err) {
      console.error("Error fetching report data:", err)
      toast.error("Failed to load report data")
    } finally {
      setIsLoading(false)
    }
  }

  function handleExportPDF() {
    try {
      setIsExporting(true)

      // Generate PDF with appropriate data based on active tab
      let title = `Booking Report: ${format(dateRange.from || new Date(), "MMM d, yyyy")} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`
      let doc

      switch (activeTab) {
        case "overview":
          title = `Booking Overview Report: ${format(dateRange.from || new Date(), "MMM d, yyyy")} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`
          doc = generateBookingsPDF(bookings, title, "overview")
          break
        case "rooms":
          title = `Room Usage Report: ${format(dateRange.from || new Date(), "MMM d, yyyy")} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`
          // For room usage, we still use the same data but with a different title
          doc = generateBookingsPDF(bookings, title, "rooms")
          break
        case "trends":
          title = `Booking Trends Report: ${format(dateRange.from || new Date(), "MMM d, yyyy")} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`
          doc = generateBookingsPDF(bookings, title, "trends")
          break
        default:
          doc = generateBookingsPDF(bookings, title, "overview")
      }

      // Download the PDF with appropriate filename
      const filename = `${activeTab}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`
      downloadPDF(doc, filename)

      toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} report exported successfully as PDF`)
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast.error("Failed to export PDF")
    } finally {
      setIsExporting(false)
    }
  }

  function handleExportExcel() {
    try {
      setIsExportingExcel(true)

      // Generate Excel with appropriate data based on active tab
      let title = `Booking Report: ${format(dateRange.from || new Date(), "MMM d, yyyy")} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`
      let wb

      switch (activeTab) {
        case "overview":
          title = `Booking Overview Report: ${format(dateRange.from || new Date(), "MMM d, yyyy")} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`
          wb = generateBookingsExcel(bookings, title, "overview")
          break
        case "rooms":
          title = `Room Usage Report: ${format(dateRange.from || new Date(), "MMM d, yyyy")} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`
          wb = generateBookingsExcel(bookings, title, "rooms")
          break
        case "trends":
          title = `Booking Trends Report: ${format(dateRange.from || new Date(), "MMM d, yyyy")} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`
          wb = generateBookingsExcel(bookings, title, "trends")
          break
        default:
          wb = generateBookingsExcel(bookings, title, "overview")
      }

      // Download the Excel with appropriate filename
      const filename = `${activeTab}-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`
      downloadExcel(wb, filename)

      toast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} report exported successfully as Excel`)
    } catch (error) {
      console.error("Error exporting Excel:", error)
      toast.error("Failed to export Excel")
    } finally {
      setIsExportingExcel(false)
    }
  }

  function handleDateRangeSelect(range: string) {
    const today = new Date()

    switch (range) {
      case "today":
        setDateRange({ from: today, to: today })
        break
      case "yesterday":
        const yesterday = subDays(today, 1)
        setDateRange({ from: yesterday, to: yesterday })
        break
      case "last7days":
        setDateRange({ from: subDays(today, 6), to: today })
        break
      case "last30days":
        setDateRange({ from: subDays(today, 29), to: today })
        break
      case "thisMonth":
        setDateRange({
          from: startOfMonth(today),
          to: endOfMonth(today),
        })
        break
      case "thisWeek":
        setDateRange({
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 }),
        })
        break
      default:
        break
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
              <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
              <p className="text-muted-foreground">View and analyze booking data and trends.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={handleDateRangeSelect} defaultValue="last30days">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel || bookings.length === 0}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {isExportingExcel ? "Exporting..." : `Export Excel`}
                </Button>

                <Button variant="outline" onClick={handleExportPDF} disabled={isExporting || bookings.length === 0}>
                  <FileDown className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : `Export PDF`}
                </Button>
              </div>
            </div>
          </div>

          <Tabs
            defaultValue="overview"
            className="space-y-4"
            onValueChange={(value) => setActiveTab(value as "overview" | "rooms" | "trends")}
          >
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rooms">Room Usage</TabsTrigger>
              <TabsTrigger value="trends">Booking Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{bookings.length}</div>
                        <p className="text-xs text-muted-foreground">During selected period</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Confirmed Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">
                          {bookings.filter((b) => b.status === "confirmed").length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(
                            (bookings.filter((b) => b.status === "confirmed").length / bookings.length) * 100 || 0
                          ).toFixed(1)}
                          % of total
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Canceled Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">
                          {bookings.filter((b) => b.status === "cancelled").length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(
                            (bookings.filter((b) => b.status === "cancelled").length / bookings.length) * 100 || 0
                          ).toFixed(1)}
                          % of total
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{new Set(bookings.map((b) => b.email)).size}</div>
                        <p className="text-xs text-muted-foreground">Made bookings during this period</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Booking Distribution</CardTitle>
                  <CardDescription>Distribution of bookings by room and status</CardDescription>
                </CardHeader>
                <CardContent className="h-[600px]">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                      No booking data available for the selected period
                    </div>
                  ) : (
                    <BookingsByRoomChart bookings={bookings} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rooms" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Room Usage Analysis</CardTitle>
                  <CardDescription>Compare usage statistics across different meeting rooms</CardDescription>
                </CardHeader>
                <CardContent className="h-[600px]">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                      No booking data available for the selected period
                    </div>
                  ) : (
                    <BookingsByRoomChart bookings={bookings} showLegend={true} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Trends Over Time</CardTitle>
                  <CardDescription>View booking patterns and trends during the selected period</CardDescription>
                </CardHeader>
                <CardContent className="h-[600px]">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                      No booking data available for the selected period
                    </div>
                  ) : (
                    <BookingsTrendChart bookings={bookings} dateRange={dateRange} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
