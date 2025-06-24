"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type BookingsByRoomChartProps = {
  bookings: any[]
  showLegend?: boolean
  horizontal?: boolean
}

export function BookingsByRoomChart({ bookings, showLegend = false, horizontal = false }: BookingsByRoomChartProps) {
  const [chartData, setChartData] = useState<any[]>([])
  const colors = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

  useEffect(() => {
    if (!bookings || bookings.length === 0) {
      setChartData([])
      return
    }

    // Group bookings by room
    const roomBookings = bookings.reduce((acc, booking) => {
      const roomName = booking.room_name || "Unknown Room"

      if (!acc[roomName]) {
        acc[roomName] = {
          name: roomName,
          confirmed: 0,
          pending: 0,
          cancelled: 0,
          total: 0,
        }
      }

      acc[roomName][booking.status]++
      acc[roomName].total++

      return acc
    }, {})

    // Convert to array for chart
    const chartData = Object.values(roomBookings)

    // Sort by total bookings
    chartData.sort((a: any, b: any) => b.total - a.total)

    setChartData(chartData)
  }, [bookings])

  if (chartData.length === 0) {
    return <div className="flex justify-center items-center h-full text-muted-foreground">No data available</div>
  }

  return (
    <ChartContainer
      config={{
        confirmed: {
          label: "Confirmed",
          color: "hsl(var(--chart-1))",
        },
        pending: {
          label: "Pending",
          color: "hsl(var(--chart-2))",
        },
        cancelled: {
          label: "Cancelled",
          color: "hsl(var(--chart-3))",
        },
      }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        {horizontal ? (
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 20,
              right: 30,
              left: 100, // More space for room names
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <Legend />}
            <Bar dataKey="confirmed" stackId="a" fill="var(--color-confirmed)" name="Confirmed" />
            <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" name="Pending" />
            <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" name="Cancelled" />
          </BarChart>
        ) : (
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            {showLegend && <Legend />}
            <Bar dataKey="confirmed" stackId="a" fill="var(--color-confirmed)" name="Confirmed" />
            <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" name="Pending" />
            <Bar dataKey="cancelled" stackId="a" fill="var(--color-cancelled)" name="Cancelled" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  )
}
