"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { format, eachDayOfInterval } from "date-fns"

type BookingsTrendChartProps = {
  bookings: any[]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  chartType?: "line" | "area"
}

export function BookingsTrendChart({ bookings, dateRange, chartType = "area" }: BookingsTrendChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    if (!bookings || bookings.length === 0 || !dateRange.from || !dateRange.to) {
      setChartData([])
      return
    }

    // Generate all days in the date range
    const days = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    })

    // Initialize data for each day
    const dailyData = days.map((day) => ({
      date: format(day, "yyyy-MM-dd"),
      displayDate: format(day, "MMM d"),
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      total: 0,
    }))

    // Count bookings for each day
    bookings.forEach((booking) => {
      const bookingDate = booking.date
      const dayData = dailyData.find((d) => d.date === bookingDate)

      if (dayData) {
        dayData[booking.status]++
        dayData.total++
      }
    })

    setChartData(dailyData)
  }, [bookings, dateRange])

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
        total: {
          label: "Total",
          color: "hsl(var(--chart-4))",
        },
      }}
      className="w-full h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "area" ? (
          <AreaChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorConfirmed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-confirmed)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-confirmed)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-pending)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-pending)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-cancelled)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-cancelled)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayDate"
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 12 }}
              interval={Math.ceil(chartData.length / 15)}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              fillOpacity={1}
              fill="url(#colorTotal)"
              name="Total"
            />
            <Area
              type="monotone"
              dataKey="confirmed"
              stroke="var(--color-confirmed)"
              fillOpacity={1}
              fill="url(#colorConfirmed)"
              name="Confirmed"
            />
            <Area
              type="monotone"
              dataKey="pending"
              stroke="var(--color-pending)"
              fillOpacity={1}
              fill="url(#colorPending)"
              name="Pending"
            />
            <Area
              type="monotone"
              dataKey="cancelled"
              stroke="var(--color-cancelled)"
              fillOpacity={1}
              fill="url(#colorCancelled)"
              name="Cancelled"
            />
          </AreaChart>
        ) : (
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="displayDate"
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 12 }}
              interval={Math.ceil(chartData.length / 15)}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              strokeWidth={2}
              name="Total"
              dot={{ r: 3 }}
            />
            <Line type="monotone" dataKey="confirmed" stroke="var(--color-confirmed)" name="Confirmed" />
            <Line type="monotone" dataKey="pending" stroke="var(--color-pending)" name="Pending" />
            <Line type="monotone" dataKey="cancelled" stroke="var(--color-cancelled)" name="Cancelled" />
          </LineChart>
        )}
      </ResponsiveContainer>
    </ChartContainer>
  )
}
