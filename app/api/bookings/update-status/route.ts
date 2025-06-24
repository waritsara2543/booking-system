import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createAdminNotification, notifyUserOfBookingStatusChange } from "@/lib/notification-utils"
import { format } from "date-fns"
import { sendBookingConfirmedEmail } from "@/lib/email-utils"

export async function POST(request: Request) {
  try {
    const { bookingId, status, adminNote } = await request.json()
    console.log("Received request to update booking:", bookingId, "to status:", status, "with note:", adminNote)

    if (!bookingId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get booking details before update - แยกการดึงข้อมูลเพื่อหลีกเลี่ยงปัญหา relationship
    const { data: bookingData, error: bookingError } = await supabase
      .from("room_bookings")
      .select("*")
      .eq("id", bookingId)
      .single()

    if (bookingError) {
      console.error("Error fetching booking:", bookingError)
      return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 })
    }

    if (!bookingData) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    console.log("Found booking data:", bookingData)

    // ดึงข้อมูลห้องแยกต่างหาก
    let roomName = "Unknown Room"
    if (bookingData.room_id) {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("name")
        .eq("id", bookingData.room_id)
        .single()

      if (!roomError && roomData) {
        roomName = roomData.name
      } else {
        console.error("Error fetching room data:", roomError)
      }
    }

    // Update booking status
    const { data, error } = await supabase
      .from("room_bookings")
      .update({ status, admin_note: adminNote || null })
      .eq("id", bookingId)
      .select()

    if (error) {
      console.error("Error updating booking status:", error)
      return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 })
    }

    console.log("Successfully updated booking status:", data)

    const updatedBooking = data[0]
    const formattedDate = format(new Date(bookingData.date), "MMMM d, yyyy")

    // Create admin notification
    await createAdminNotification(
      bookingId,
      "Booking Status Updated",
      `Booking for ${roomName} on ${formattedDate} has been ${status}.`,
    )
    // Send email
    if (status === "confirmed") {
      await sendBookingConfirmedEmail(updatedBooking.email, {
        ...updatedBooking,
        room_name: roomName,
        booking_date: formattedDate,
      })
    }

    // If member_id is provided, create user notification
    if (bookingData.member_id) {
      console.log(
        "Creating user notification for booking status update:",
        bookingId,
        "for member:",
        bookingData.member_id,
      )

      try {
        // ตรวจสอบว่า member_id เป็น UUID หรือรหัสสมาชิก
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingData.member_id)

        let userIdForNotification = null

        if (isUuid) {
          // ถ้าเป็น UUID, ดึงข้อมูลสมาชิกจาก id
          console.log("member_id is UUID, fetching member data by id")
          const { data: memberData, error: memberError } = await supabase
            .from("members")
            .select("member_id, name")
            .eq("id", bookingData.member_id)
            .single()

          if (memberError) {
            console.error("Error fetching member data by id:", memberError)
          } else if (memberData) {
            console.log("Found member data by id:", memberData)
            userIdForNotification = memberData.member_id
          } else {
            console.log("Member not found by id")
          }
        } else {
          // ถ้าไม่ใช่ UUID, ใช้เป็นรหัสสมาชิกโดยตรง
          console.log("member_id is not UUID, using it directly for notification")
          userIdForNotification = bookingData.member_id
        }

        // ถ้ามี userIdForNotification ให้สร้างการแจ้งเตือน
        if (userIdForNotification) {
          // ใช้ฟังก์ชัน notifyUserOfBookingStatusChange แทนการสร้างการแจ้งเตือนโดยตรง
          const notificationResult = await notifyUserOfBookingStatusChange(
            userIdForNotification,
            bookingId,
            roomName,
            formattedDate,
            status,
            adminNote,
          )

          console.log("Notification result:", notificationResult)

          if (!notificationResult) {
            console.error("Failed to create user notification")
          }
        } else {
          console.error("Could not determine valid user_id for notification")
        }
      } catch (notificationError) {
        console.error("Error in notification process:", notificationError)
      }
    } else {
      console.log("No member_id provided for booking, skipping user notification")
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    })
  } catch (error) {
    console.error("Error updating booking status:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
