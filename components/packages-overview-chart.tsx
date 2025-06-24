"use client"

import { useState } from "react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface PackagesOverviewChartProps {
  packages: any[]
}

export function PackagesOverviewChart({ packages }: PackagesOverviewChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Prepare data for status distribution pie chart
  const statusCounts = packages.reduce((acc: Record<string, number>, pkg) => {
    const status = pkg.payment_status || "unknown"
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }))

  // Prepare data for top packages bar chart
  const packageCounts = packages.reduce((acc: Record<string, number>, pkg) => {
    const packageName = pkg.packages?.name || "Unknown Package"
    acc[packageName] = (acc[packageName] || 0) + 1
    return acc
  }, {})

  // Sort packages by purchase count and take top 5
  const topPackages = Object.entries(packageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({
      name: name.length > 20 ? name.substring(0, 20) + "..." : name,
      value,
    }))

  // Colors for the pie chart
  const COLORS = ["#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b", "#10b981"]
  const STATUS_COLORS: Record<string, string> = {
    Confirmed: "#10b981",
    Pending: "#f59e0b",
    Active: "#06b6d4",
    Expired: "#6b7280",
    Cancelled: "#ef4444",
    Unknown: "#6b7280",
  }

  const handlePieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const handlePieLeave = () => {
    setActiveIndex(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <div className="flex flex-col items-center justify-center">
        <h3 className="text-base font-medium mb-2">Package Status Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              onMouseEnter={handlePieEnter}
              onMouseLeave={handlePieLeave}
            >
              {statusData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]}
                  stroke={activeIndex === index ? "#fff" : "transparent"}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-md p-2 text-sm">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-muted-foreground">
                        {data.value} packages ({((data.value / packages.length) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              formatter={(value, entry, index) => (
                <span className="text-sm">
                  {value}: {statusCounts[value.toLowerCase()] || 0} (
                  {(((statusCounts[value.toLowerCase()] || 0) / packages.length) * 100).toFixed(1)}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col items-center justify-center">
        <h3 className="text-base font-medium mb-2">Top 5 Packages by Purchases</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={topPackages}
            layout="vertical"
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={150} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-md p-2 text-sm">
                      <p className="font-medium">{label}</p>
                      <p className="text-muted-foreground">
                        {payload[0].value} purchases (
                        {(((payload[0].value as number) / packages.length) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
