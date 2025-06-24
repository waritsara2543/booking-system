"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

type Event = {
  id: string
  title: string
  description: string
  date: string
  start_time: string
  end_time: string
  status: string
  room: string
  organizer: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<"month" | "week">("month")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/login")
      return
    }

    setIsAdmin(true)
    fetchEvents()
  }, [router, currentDate])

  async function fetchEvents() {
    try {
      setIsLoading(true)

      // Get the start and end of the month
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)

      // Format dates for query
      const startDate = format(monthStart, "yyyy-MM-dd")
      const endDate = format(monthEnd, "yyyy-MM-dd")

      // Fetch bookings from the database
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("room_bookings")
        .select(`
          id,
          name,
          purpose,
          date,
          start_time,
          end_time,
          room_id,
          status
        `)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError)
        return
      }

      // Get room details
      const roomIds = [...new Set(bookingsData?.map((booking) => booking.room_id) || [])]
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("id, name")
        .in("id", roomIds.length > 0 ? roomIds : ["none"])

      // Create a map of room IDs to room names
      const roomMap = new Map()
      if (roomsData) {
        roomsData.forEach((room) => {
          roomMap.set(room.id, room.name)
        })
      }

      // Map bookings to events
      const mappedEvents =
        bookingsData?.map((booking) => {
          return {
            id: booking.id,
            title: booking.purpose,
            description: `${booking.name} - ${roomMap.get(booking.room_id) || "Unknown Room"}`,
            date: booking.date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: booking.status,
            room: roomMap.get(booking.room_id) || "Unknown Room",
            organizer: booking.name,
          }
        }) || []

      setEvents(mappedEvents)
    } catch (error) {
      console.error("Error in fetchEvents:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  // Get days of the month
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get days of the week
  const weekStart = selectedDate ? startOfWeek(selectedDate) : startOfWeek(currentDate)
  const weekEnd = endOfWeek(weekStart)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = parseISO(event.date)
      return isSameDay(eventDate, day) && (statusFilter === "all" || event.status === statusFilter)
    })
  }

  // Get upcoming events (all events in the current month)
  const upcomingEvents = events
    .filter((event) => statusFilter === "all" || event.status === statusFilter)
    .sort((a, b) => {
      const dateA = `${a.date}T${a.start_time}`
      const dateB = `${b.date}T${b.start_time}`
      return dateA.localeCompare(dateB)
    })

  const handleDateClick = (day: Date) => {
    // Set the selected date
    setSelectedDate(day)

    // Only open modal in month view
    if (view === "month") {
      setIsModalOpen(true)
    }
  }

  // Get filtered events based on selection
  const filteredEvents = selectedDate
    ? events.filter(
        (event) =>
          isSameDay(parseISO(event.date), selectedDate) && (statusFilter === "all" || event.status === statusFilter),
      )
    : upcomingEvents

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Confirmed
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Pending
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            Cancelled
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            {status}
          </Badge>
        )
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />
    }
  }

  // Render event item
  const renderEventItem = (event: Event, index: number) => (
    <div key={event.id}>
      {index > 0 && <Separator className="my-4" />}
      <div className="flex gap-4">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-white bg-primary/10">
            <AvatarFallback className="text-primary">{event.organizer.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 rounded-full p-1 bg-white dark:bg-gray-800">
            {getStatusIcon(event.status)}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{event.title}</h3>
            {getStatusBadge(event.status)}
          </div>

          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(parseISO(event.date), "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>
                {event.start_time} - {event.end_time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.room}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{event.organizer}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                <p className="text-muted-foreground">Manage and view all your bookings in one place</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-[200px]">
                  <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="month">Month</TabsTrigger>
                      <TabsTrigger value="week">Week</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="overflow-hidden border-none shadow-md">
              <CardHeader className="bg-white dark:bg-gray-800 p-4 flex flex-row justify-between items-center space-y-0">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={goToToday}>
                  Today
                </Button>
              </CardHeader>

              <div className="bg-white dark:bg-gray-800 rounded-b-lg overflow-hidden">
                {view === "month" ? (
                  <div>
                    {/* Calendar header */}
                    <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-700">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="p-3 text-center font-medium text-sm">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7">
                      {Array.from(
                        { length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() },
                        (_, i) => (
                          <div
                            key={`empty-start-${i}`}
                            className="border-t border-r p-1 min-h-[120px] bg-gray-50 dark:bg-gray-800/50"
                          ></div>
                        ),
                      )}

                      {monthDays.map((day) => {
                        const dayEvents = getEventsForDay(day)
                        const isToday = isSameDay(day, new Date())
                        const isSelected = selectedDate && isSameDay(selectedDate, day)

                        return (
                          <div
                            key={day.toString()}
                            className={cn(
                              "border-t border-r p-1 min-h-[120px] transition-colors relative",
                              isToday ? "bg-blue-50 dark:bg-blue-900/20" : "bg-white dark:bg-gray-800",
                              !isSameMonth(day, currentDate) ? "bg-gray-50 dark:bg-gray-800/50 text-gray-400" : "",
                              isSelected ? "ring-2 ring-primary ring-inset" : "",
                              "hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer",
                            )}
                            onClick={() => handleDateClick(day)}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <div
                                className={cn(
                                  "h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium",
                                  isToday ? "bg-primary text-primary-foreground" : "",
                                )}
                              >
                                {format(day, "d")}
                              </div>
                              {dayEvents.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20">
                                  {dayEvents.length}
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-1 mt-1">
                              {dayEvents.slice(0, 3).map((event) => (
                                <div
                                  key={event.id}
                                  className={cn(
                                    "text-xs p-1 rounded-md truncate flex items-center gap-1",
                                    event.status === "confirmed"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                      : event.status === "pending"
                                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                                  )}
                                >
                                  {getStatusIcon(event.status)}
                                  <span className="truncate">{event.title}</span>
                                </div>
                              ))}

                              {dayEvents.length > 3 && (
                                <div className="text-xs font-medium text-primary dark:text-primary/80 pl-1">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {Array.from(
                        {
                          length:
                            42 -
                            (monthDays.length +
                              new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()),
                        },
                        (_, i) => (
                          <div
                            key={`empty-end-${i}`}
                            className="border-t border-r p-1 min-h-[120px] bg-gray-50 dark:bg-gray-800/50"
                          ></div>
                        ),
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Week view header */}
                    <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-700">
                      {weekDays.map((day) => (
                        <div
                          key={day.toString()}
                          className={cn(
                            "p-3 text-center font-medium",
                            isSameDay(day, new Date()) ? "bg-primary/10 text-primary" : "",
                          )}
                        >
                          <div className="text-xs uppercase">{format(day, "EEE")}</div>
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center mx-auto mt-1",
                              isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "",
                            )}
                          >
                            {format(day, "d")}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Week view content */}
                    <div className="grid grid-cols-7 gap-1 p-2">
                      {weekDays.map((day) => {
                        const dayEvents = getEventsForDay(day)
                        return (
                          <div
                            key={day.toString()}
                            className="min-h-[300px] bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2"
                            onClick={() => handleDateClick(day)}
                          >
                            {dayEvents.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                                No events
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {dayEvents.map((event) => (
                                  <div
                                    key={event.id}
                                    className={cn(
                                      "p-2 rounded-md text-xs",
                                      event.status === "confirmed"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                        : event.status === "pending"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                                    )}
                                  >
                                    <div className="font-medium">{event.title}</div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        {event.start_time} - {event.end_time}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle>
                  {selectedDate ? `Events for ${format(selectedDate, "MMMM d, yyyy")}` : "Upcoming Events"}
                </CardTitle>
                {selectedDate && (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-muted-foreground hover:text-primary"
                    onClick={() => setSelectedDate(null)}
                  >
                    View all events
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No events</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedDate
                        ? `No events scheduled for ${format(selectedDate, "MMMM d, yyyy")}`
                        : "No upcoming events for the selected filters"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">{filteredEvents.map((event, index) => renderEventItem(event, index))}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Day Events Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Events for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}</span>
              <DialogClose className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center">
               
                <span className="sr-only">Close</span>
              </DialogClose>
            </DialogTitle>
            <DialogDescription>
              {filteredEvents.length === 0
                ? "No events scheduled for this day"
                : `${filteredEvents.length} event${filteredEvents.length > 1 ? "s" : ""} scheduled`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No events</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  No events scheduled for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
                </p>
              </div>
            ) : (
              filteredEvents.map((event, index) => renderEventItem(event, index))
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
