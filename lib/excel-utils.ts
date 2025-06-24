import * as XLSX from "xlsx"
import { format } from "date-fns"

// Function to generate Excel file from any data
export function generateExcel(data: any[], title: string, columns: any[]) {
  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Create a worksheet from the data
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map((col) => col.key) })

  // Set column widths
  ws["!cols"] = columns.map((col) => ({ wch: col.width }))

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Data")

  return wb
}

// Function to generate Excel file from bookings data
export function generateBookingsExcel(bookings: any[], title: string) {
  // Format the data for Excel
  const formattedData = bookings.map((booking) => {
    // Safely format dates with validation
    let bookingDate = "N/A"
    let createdAt = "N/A"

    try {
      if (booking.date) {
        const dateObj = new Date(booking.date)
        if (!isNaN(dateObj.getTime())) {
          bookingDate = format(dateObj, "yyyy-MM-dd")
        }
      }
    } catch (error) {
      console.error("Error formatting booking date:", error)
    }

    try {
      if (booking.created_at) {
        const createdAtObj = new Date(booking.created_at)
        if (!isNaN(createdAtObj.getTime())) {
          createdAt = format(createdAtObj, "yyyy-MM-dd HH:mm:ss")
        }
      }
    } catch (error) {
      console.error("Error formatting created_at date:", error)
    }

    return {
      ID: booking.id || "N/A",
      Name: booking.name || "N/A",
      Email: booking.email || "N/A",
      Room: booking.room_name || "N/A",
      Date: bookingDate,
      "Start Time": booking.start_time || "N/A",
      "End Time": booking.end_time || "N/A",
      Purpose: booking.purpose || "N/A",
      Status: booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : "N/A",
      "Created At": createdAt,
    }
  })

  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Create a worksheet from the data
  const ws = XLSX.utils.json_to_sheet(formattedData)

  // Set column widths
  const colWidths = [
    { wch: 10 }, // ID
    { wch: 20 }, // Name
    { wch: 25 }, // Email
    { wch: 20 }, // Room
    { wch: 12 }, // Date
    { wch: 12 }, // Start Time
    { wch: 12 }, // End Time
    { wch: 30 }, // Purpose
    { wch: 15 }, // Status
    { wch: 20 }, // Created At
  ]
  ws["!cols"] = colWidths

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Bookings")

  // Create a summary worksheet
  const summaryData = [
    ["Booking Report Summary"],
    ["Generated on", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    ["Report Title", title],
    [""],
    ["Total Bookings", bookings.length],
    ["Confirmed Bookings", bookings.filter((b) => b.status === "confirmed").length],
    ["Cancelled Bookings", bookings.filter((b) => b.status === "cancelled").length],
    ["Pending Bookings", bookings.filter((b) => b.status === "pending").length],
    ["Unique Users", new Set(bookings.map((b) => b.email)).size],
  ]

  // Create a worksheet for the summary
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths for summary
  summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }]

  // Add the summary worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

  return wb
}

// Function to generate Excel file from room data
export function generateRoomsExcel(rooms: any[], title: string) {
  // Format the data for Excel
  const formattedData = rooms.map((room) => ({
    "Room ID": room.id,
    "Room Name": room.name,
    Capacity: room.capacity,
    "Hourly Rate": `฿${room.hourly_rate.toFixed(2)}`,
    Features: room.features?.join(", ") || "",
    Status: room.status,
    "Booking Count": room.booking_count || 0,
  }))

  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Create a worksheet from the data
  const ws = XLSX.utils.json_to_sheet(formattedData)

  // Set column widths
  const colWidths = [
    { wch: 10 }, // Room ID
    { wch: 25 }, // Room Name
    { wch: 10 }, // Capacity
    { wch: 15 }, // Hourly Rate
    { wch: 40 }, // Features
    { wch: 15 }, // Status
    { wch: 15 }, // Booking Count
  ]
  ws["!cols"] = colWidths

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Rooms")

  // Create a summary worksheet
  const summaryData = [
    ["Room Report Summary"],
    ["Generated on", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    ["Report Title", title],
    [""],
    ["Total Rooms", rooms.length],
    ["Available Rooms", rooms.filter((r) => r.status === "available").length],
    ["Unavailable Rooms", rooms.filter((r) => r.status !== "available").length],
    ["Total Capacity", rooms.reduce((sum, r) => sum + r.capacity, 0)],
    ["Average Hourly Rate", `฿${(rooms.reduce((sum, r) => sum + r.hourly_rate, 0) / rooms.length).toFixed(2)}`],
  ]

  // Create a worksheet for the summary
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths for summary
  summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }]

  // Add the summary worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

  return wb
}

// Function to generate Excel file from package data
export function generatePackagesExcel(packages: any[], title: string) {
  // Format the data for Excel
  const formattedData = packages.map((pkg) => {
    // Safely format dates
    let createdAt = "N/A"

    try {
      if (pkg.created_at) {
        const createdAtObj = new Date(pkg.created_at)
        if (!isNaN(createdAtObj.getTime())) {
          createdAt = format(createdAtObj, "yyyy-MM-dd")
        }
      }
    } catch (error) {
      console.error("Error formatting created_at date:", error)
    }

    return {
      "Package ID": pkg.id || "N/A",
      "Package Name": pkg.name || "N/A",
      Description: pkg.description || "N/A",
      Price: `฿${(pkg.price || 0).toFixed(2)}`,
      Duration: pkg.duration ? `${pkg.duration} ${pkg.duration === 1 ? "month" : "months"}` : "N/A",
      "Purchase Count": pkg.purchase_count || 0,
      "Created At": createdAt,
    }
  })

  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Create a worksheet from the data
  const ws = XLSX.utils.json_to_sheet(formattedData)

  // Set column widths
  const colWidths = [
    { wch: 12 }, // Package ID
    { wch: 25 }, // Package Name
    { wch: 40 }, // Description
    { wch: 12 }, // Price
    { wch: 12 }, // Duration
    { wch: 15 }, // Purchase Count
    { wch: 15 }, // Created At
  ]
  ws["!cols"] = colWidths

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Packages")

  // Create a summary worksheet
  const summaryData = [
    ["Package Report Summary"],
    ["Generated on", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    ["Report Title", title],
    [""],
    ["Total Packages", packages.length],
    ["Total Purchases", packages.reduce((sum, p) => sum + (p.purchase_count || 0), 0)],
    ["Average Price", `฿${(packages.reduce((sum, p) => sum + (p.price || 0), 0) / packages.length).toFixed(2)}`],
  ]

  // Create a worksheet for the summary
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths for summary
  summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }]

  // Add the summary worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

  return wb
}

// Function to generate Excel file from wifi credentials data
export function generateWifiCredentialsExcel(credentials: any[], title: string) {
  // Format the data for Excel
  const formattedData = credentials.map((credential) => {
    // Safely format dates
    let createdAt = "N/A"
    let updatedAt = "N/A"

    try {
      if (credential.created_at) {
        const createdAtObj = new Date(credential.created_at)
        if (!isNaN(createdAtObj.getTime())) {
          createdAt = format(createdAtObj, "yyyy-MM-dd HH:mm:ss")
        }
      }
    } catch (error) {
      console.error("Error formatting created_at date:", error)
    }

    try {
      if (credential.updated_at) {
        const updatedAtObj = new Date(credential.updated_at)
        if (!isNaN(updatedAtObj.getTime())) {
          updatedAt = format(updatedAtObj, "yyyy-MM-dd HH:mm:ss")
        }
      }
    } catch (error) {
      console.error("Error formatting updated_at date:", error)
    }

    return {
      Username: credential.username || "N/A",
      Password: credential.password || "N/A", // This should be masked in the data before passing to this function
      Status: credential.is_active ? "Active" : "Inactive",
      Notes: credential.notes || "",
      Usage: credential.in_use ? "In Use" : "Available",
      "Created At": createdAt,
      "Updated At": updatedAt,
    }
  })

  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Create a worksheet from the data
  const ws = XLSX.utils.json_to_sheet(formattedData)

  // Set column widths
  const colWidths = [
    { wch: 20 }, // Username
    { wch: 20 }, // Password
    { wch: 12 }, // Status
    { wch: 30 }, // Notes
    { wch: 12 }, // Usage
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ]
  ws["!cols"] = colWidths

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "WiFi Credentials")

  // Create a summary worksheet
  const summaryData = [
    ["WiFi Credentials Report Summary"],
    ["Generated on", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    ["Report Title", title],
    [""],
    ["Total Credentials", credentials.length],
    ["Active Credentials", credentials.filter((c) => c.is_active).length],
    ["Inactive Credentials", credentials.filter((c) => !c.is_active).length],
    ["In Use Credentials", credentials.filter((c) => c.in_use).length],
    ["Available Credentials", credentials.filter((c) => !c.in_use).length],
  ]

  // Create a worksheet for the summary
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths for summary
  summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }]

  // Add the summary worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

  return wb
}

// Function to download the Excel file in the browser
export function downloadExcel(wb: XLSX.WorkBook, filename: string) {
  try {
    // Make sure filename has .xlsx extension
    if (!filename.endsWith(".xlsx")) {
      filename += ".xlsx"
    }

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
    a.download = filename

    // Append to the document, click, and remove
    document.body.appendChild(a)
    a.click()

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
  } catch (error) {
    console.error("Error in downloadExcel:", error)
    throw new Error("Failed to download Excel file: " + (error instanceof Error ? error.message : String(error)))
  }
}
