"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { CalendarDays, Users, DoorOpen, Package } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

type StatsData = {
  totalBookingsToday: number
  totalBookingsMonth: number
  totalUsers: number
  activePackages: number
  totalRooms: number
  activeRooms: number
}

export function AdminStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDebugging, setIsDebugging] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      setIsLoading(true)
      setError(null)

      // Get today's date in YYYY-MM-DD format
      const today = format(new Date(), "yyyy-MM-dd")
      const firstDayOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd")
      const lastDayOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd")

      // Get total bookings today
      const { count: todayBookings, error: todayError } = await supabase
        .from("room_bookings")
        .select("*", { count: "exact", head: true })
        .eq("date", today)

      if (todayError) throw todayError

      // Get total bookings this month
      const { count: monthBookings, error: monthError } = await supabase
        .from("room_bookings")
        .select("*", { count: "exact", head: true })
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth)

      if (monthError) throw monthError

      // Get total users
      const { count: userCount, error: userError } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })

      if (userError) throw userError

      // ดึงข้อมูล member_packages ทั้งหมดเพื่อตรวจสอบ
      const { data: allPackages, error: allPackagesError } = await supabase
        .from("member_packages")
        .select("id, payment_status, end_date, is_current")

      if (allPackagesError) {
        console.error("Error fetching all packages:", allPackagesError)
        throw allPackagesError
      }

      console.log("All packages:", allPackages)

      // ตรวจสอบทุกสถานะการชำระเงินที่เป็นไปได้
      const paymentStatusCounts = {
        completed: 0,
        confirmed: 0,
        pending: 0,
        other: 0,
      }

      // นับจำนวนแพ็คเกจตามสถานะ
      allPackages?.forEach((pkg) => {
        if (pkg.payment_status === "completed") paymentStatusCounts.completed++
        else if (pkg.payment_status === "confirmed") paymentStatusCounts.confirmed++
        else if (pkg.payment_status === "pending") paymentStatusCounts.pending++
        else paymentStatusCounts.other++
      })

      console.log("Payment status counts:", paymentStatusCounts)

      // ตรวจสอบแพ็คเกจที่ยังไม่หมดอายุ (end_date >= today)
      const activeByEndDate =
        allPackages?.filter((pkg) => {
          const endDate = pkg.end_date
          return endDate && endDate >= today
        }).length || 0

      console.log("Active packages by end date:", activeByEndDate)

      // ตรวจสอบแพ็คเกจที่มี is_current = true
      const activeByIsCurrent = allPackages?.filter((pkg) => pkg.is_current).length || 0

      console.log("Active packages by is_current:", activeByIsCurrent)

      // ตรวจสอบแพ็คเกจที่มีสถานะการชำระเงินเป็น completed หรือ confirmed และยังไม่หมดอายุ
      const activePackages =
        allPackages?.filter((pkg) => {
          const validStatus = pkg.payment_status === "completed" || pkg.payment_status === "confirmed"
          const validDate = pkg.end_date && pkg.end_date >= today
          return validStatus && validDate
        }).length || 0

      console.log("Active packages (valid status & date):", activePackages)

      // Get total rooms
      const { count: roomCount, error: roomError } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })

      if (roomError) throw roomError

      // แก้ไขการนับ Active Rooms ตามเงื่อนไขใหม่
      // 1. นับเฉพาะห้องที่มีการจองที่มีสถานะเป็น "confirmed"
      // 2. นับเฉพาะการจองที่ยังไม่เกินวันที่จอง (ยังไม่หมดอายุ)
      const { data: activeBookings, error: activeBookingsError } = await supabase
        .from("room_bookings")
        .select("room_id, date, end_time")
        .eq("status", "confirmed")
        .gte("date", today) // เลือกเฉพาะการจองที่มีวันที่ตั้งแต่วันนี้เป็นต้นไป

      if (activeBookingsError) throw activeBookingsError

      console.log("Active bookings:", activeBookings)

      // นับจำนวนห้องที่ไม่ซ้ำกันจากการจองที่ยังไม่หมดอายุ
      const uniqueActiveRoomIds = new Set(activeBookings.map((booking) => booking.room_id))
      const activeRoomsCount = uniqueActiveRoomIds.size

      console.log("Active rooms count:", activeRoomsCount)
      console.log("Total rooms count:", roomCount)

      setStats({
        totalBookingsToday: todayBookings || 0,
        totalBookingsMonth: monthBookings || 0,
        totalUsers: userCount || 0,
        activePackages: activePackages,
        totalRooms: roomCount || 0,
        activeRooms: activeRoomsCount || 0,
      })
    } catch (err) {
      console.error("Error fetching stats:", err)
      setError("Failed to load statistics")
    } finally {
      setIsLoading(false)
    }
  }

  async function debugPackages() {
    try {
      setIsDebugging(true)
      const response = await fetch("/api/debug-packages")
      const data = await response.json()
      console.log("Debug packages data:", data)
      toast.success(`Found ${data.activePackagesCount} active packages`)

      // อัพเดตค่า activePackages ในสถิติ
      if (stats) {
        setStats({
          ...stats,
          activePackages: data.activePackagesCount,
        })
      }
    } catch (error) {
      console.error("Error debugging packages:", error)
      toast.error("Failed to debug packages")
    } finally {
      setIsDebugging(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <div className="h-4 w-4 rounded-full bg-muted"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Loading data...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBookingsToday}</div>
            <p className="text-xs text-muted-foreground">{stats?.totalBookingsMonth} bookings this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Total registered members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meeting Rooms</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeRooms} / {stats?.totalRooms}
            </div>
            <p className="text-xs text-muted-foreground">Active rooms / Total rooms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePackages}</div>
            <p className="text-xs text-muted-foreground">Current active member packages</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
