import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"

type Booking = {
  id: string
  name: string
  email: string
  date: string
  start_time: string
  end_time: string
  purpose: string
  status: "pending" | "confirmed" | "cancelled"
  room_name?: string
}

type Room = {
  id: string
  name: string
  capacity: number
  hourly_rate: number
  description: string
  image_url?: string
  bookings_count?: number
}

type Member = {
  id: string
  member_id: string
  name: string
  email: string
  phone: string
  verified: boolean
  created_at: string
  bookings_count?: number
}

// Generate PDF for bookings
export function generateBookingsPDF(bookings: Booking[], title = "Bookings Report", tabType = "overview") {
  // Create a new PDF document
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.text(title, 14, 22)

  // Add generation date
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 30)

  // Calculate statistics
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length
  const pendingCount = bookings.filter((b) => b.status === "pending").length
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length
  const uniqueUsers = new Set(bookings.map((b) => b.email)).size

  // Add summary information based on tab type
  let startY = 40

  if (tabType === "overview") {
    // Create a more detailed statistics section for overview tab
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text("Summary Statistics", 14, startY)
    startY += 10

    // Add statistics boxes
    const boxWidth = 90
    const boxHeight = 25
    const margin = 14
    const gap = 10

    // Total Bookings Box
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(margin, startY, boxWidth, boxHeight, 3, 3, "FD")
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text("Total Bookings", margin + 5, startY + 10)
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text(bookings.length.toString(), margin + 5, startY + 20)

    // Confirmed Bookings Box
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(240, 250, 240)
    doc.roundedRect(margin + boxWidth + gap, startY, boxWidth, boxHeight, 3, 3, "FD")
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text("Confirmed Bookings", margin + boxWidth + gap + 5, startY + 10)
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text(confirmedCount.toString(), margin + boxWidth + gap + 5, startY + 20)

    startY += boxHeight + gap

    // Cancelled Bookings Box
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(250, 240, 240)
    doc.roundedRect(margin, startY, boxWidth, boxHeight, 3, 3, "FD")
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text("Cancelled Bookings", margin + 5, startY + 10)
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text(cancelledCount.toString(), margin + 5, startY + 20)

    // Unique Users Box
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(240, 240, 250)
    doc.roundedRect(margin + boxWidth + gap, startY, boxWidth, boxHeight, 3, 3, "FD")
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text("Unique Users", margin + boxWidth + gap + 5, startY + 10)
    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text(uniqueUsers.toString(), margin + boxWidth + gap + 5, startY + 20)

    startY += boxHeight + 15

    // Add percentages
    doc.setFontSize(11)
    doc.setTextColor(80, 80, 80)
    if (bookings.length > 0) {
      const confirmedPercent = ((confirmedCount / bookings.length) * 100).toFixed(1)
      const pendingPercent = ((pendingCount / bookings.length) * 100).toFixed(1)
      const cancelledPercent = ((cancelledCount / bookings.length) * 100).toFixed(1)

      doc.text(
        `Confirmed: ${confirmedPercent}% | Pending: ${pendingPercent}% | Cancelled: ${cancelledPercent}%`,
        margin,
        startY,
      )
    }

    startY += 10
  } else {
    // Simple statistics for other tabs
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Total Bookings: ${bookings.length}`, 14, startY)
    doc.text(`Confirmed: ${confirmedCount} | Pending: ${pendingCount} | Cancelled: ${cancelledCount}`, 14, startY + 6)
    startY += 12
  }

  // Prepare data for the table
  const tableColumn = ["Name", "Room", "Date", "Time", "Purpose", "Status"]
  const tableRows = bookings.map((booking) => [
    booking.name,
    booking.room_name || "Unknown",
    format(new Date(booking.date), "MMM d, yyyy"),
    `${booking.start_time} - ${booking.end_time}`,
    booking.purpose || "No purpose",
    booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
  ])

  // Generate the table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: startY },
  })

  // Add footer with page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    )
  }

  // Return the document
  return doc
}

// Generate PDF for rooms
export function generateRoomsPDF(rooms: Room[], title = "Room Management Report") {
  // Create a new PDF document
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.text(title, 14, 22)

  // Add generation date
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 30)

  // Add summary information
  let startY = 40
  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.text("Room Summary", 14, startY)
  startY += 10

  // Add statistics
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text(`Total Rooms: ${rooms.length}`, 14, startY)

  // Calculate total capacity
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0)
  doc.text(`Total Capacity: ${totalCapacity} people`, 14, startY + 6)

  // Calculate average hourly rate
  const avgRate = rooms.reduce((sum, room) => sum + room.hourly_rate, 0) / rooms.length
  doc.text(`Average Hourly Rate: $${avgRate.toFixed(2)}`, 14, startY + 12)

  startY += 24

  // Prepare data for the table
  const tableColumn = ["Room Name", "Capacity", "Hourly Rate", "Bookings", "Description"]
  const tableRows = rooms.map((room) => [
    room.name,
    room.capacity.toString(),
    `$${room.hourly_rate.toFixed(2)}`,
    room.bookings_count?.toString() || "0",
    room.description || "No description",
  ])

  // Generate the table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      4: { cellWidth: "auto" }, // Make description column wider
    },
    margin: { top: startY },
  })

  // Add footer with page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    )
  }

  // Return the document
  return doc
}

// Generate PDF for members/users
export function generateMembersPDF(members: Member[], title = "User Management Report") {
  // Create a new PDF document
  const doc = new jsPDF()

  // Add title
  doc.setFontSize(18)
  doc.text(title, 14, 22)

  // Add generation date
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Generated on: ${format(new Date(), "PPP p")}`, 14, 30)

  // Add summary information
  let startY = 40
  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.text("User Summary", 14, startY)
  startY += 10

  // Add statistics
  doc.setFontSize(12)
  doc.setTextColor(0)
  doc.text(`Total Users: ${members.length}`, 14, startY)

  // Calculate verified users
  const verifiedCount = members.filter((member) => member.verified).length
  const verifiedPercent = ((verifiedCount / members.length) * 100).toFixed(1)
  doc.text(`Verified Users: ${verifiedCount} (${verifiedPercent}%)`, 14, startY + 6)

  // Calculate total bookings
  const totalBookings = members.reduce((sum, member) => sum + (member.bookings_count || 0), 0)
  doc.text(`Total Bookings: ${totalBookings}`, 14, startY + 12)

  startY += 24

  // Prepare data for the table
  const tableColumn = ["Name", "Member ID", "Email", "Phone", "Status", "Joined", "Bookings"]
  const tableRows = members.map((member) => [
    member.name,
    member.member_id,
    member.email,
    member.phone,
    member.verified ? "Verified" : "Unverified",
    format(new Date(member.created_at), "MMM d, yyyy"),
    member.bookings_count?.toString() || "0",
  ])

  // Generate the table
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: startY,
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: startY },
  })

  // Add footer with page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    )
  }

  // Return the document
  return doc
}

export function downloadPDF(doc: jsPDF, filename = "report.pdf") {
  doc.save(filename)
}
