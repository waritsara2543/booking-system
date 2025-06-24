import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import { sendBookingCreatedEmail } from "@/lib/email-utils"

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    // Parse request body
    const bookingData = await request.json()
    console.log("Received booking data:", JSON.stringify(bookingData, null, 2))

    // Validate required fields
    if (!bookingData.room_id || !bookingData.date || !bookingData.start_time || !bookingData.end_time) {
      console.error("Missing required booking fields:", {
        room_id: bookingData.room_id,
        date: bookingData.date,
        start_time: bookingData.start_time,
        end_time: bookingData.end_time,
      })
      return NextResponse.json({ error: "Missing required booking fields" }, { status: 400 })
    }

    // Get room details for notification
    let roomData
    try {
      const { data, error } = await supabase.from("rooms").select("name").eq("id", bookingData.room_id).single()

      if (error) {
        console.error("Error fetching room data:", error)
        roomData = { name: "Unknown Room" }
      } else {
        roomData = data
      }
    } catch (roomError) {
      console.error("Exception fetching room data:", roomError)
      roomData = { name: "Unknown Room" }
    }

    // Insert booking into database
    let createdBooking
    try {
      const { data, error } = await supabase
        .from("room_bookings")
        .insert([
          {
            member_id: bookingData.member_id || null,
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            room_id: bookingData.room_id,
            date: bookingData.date,
            start_time: bookingData.start_time,
            end_time: bookingData.end_time,
            purpose: bookingData.purpose,
            attendees: bookingData.attendees,
            notes: bookingData.notes || null,
            payment_method: bookingData.payment_method,
            attachment_url: bookingData.attachment_url || null,
            status: "pending",
            type: bookingData.type || "regular",
          },
        ])
        .select()

      if (error) {
        console.error("Error creating booking:", error)
        return NextResponse.json(
          {
            error: "Failed to create booking",
            details: error.message,
            code: error.code,
          },
          { status: 500 },
        )
      }

      if (!data || data.length === 0) {
        console.error("No booking data returned after insert")
        return NextResponse.json({ error: "No booking data returned after insert" }, { status: 500 })
      }

      createdBooking = data[0]
      console.log("Booking created successfully:", createdBooking)
    } catch (insertError: any) {
      console.error("Exception during booking creation:", insertError)
      return NextResponse.json(
        {
          error: "Exception during booking creation",
          details: insertError.message,
        },
        { status: 500 },
      )
    }

    // Create admin notification
    try {
      // ใช้ ID ของการจองเป็น booking_id
      const { error: notificationError } = await supabase.from("admin_notifications").insert([
        {
          booking_id: createdBooking.id,
          title: "New Booking Request",
          message: `New booking request for ${roomData.name} on ${format(
            new Date(bookingData.date),
            "MMMM d, yyyy",
          )} from ${bookingData.start_time} to ${bookingData.end_time}.`,
          is_read: false,
        },
      ])

      if (notificationError) {
        console.error("Error creating admin notification:", notificationError)
        console.error("Notification error details:", JSON.stringify(notificationError, null, 2))
      } else {
        console.log("Admin notification created successfully for booking")
      }
    } catch (notificationError) {
      console.error("Exception creating admin notification:", notificationError)
      console.error("Exception details:", JSON.stringify(notificationError, null, 2))
    }

    // Create user notification if member_id is provided
    if (bookingData.member_id) {
      try {
        const { error: userNotificationError } = await supabase.from("user_notifications").insert([
          {
            user_id: bookingData.member_id,
            title: "Booking Submitted",
            message: `Your booking for ${format(new Date(bookingData.date), "MMMM d, yyyy")} from ${
              bookingData.start_time
            } to ${bookingData.end_time} has been submitted and is pending confirmation.`,
            type: "booking", // Keep type for user_notifications as it exists in that table
            is_read: false,
          },
        ])

        if (userNotificationError) {
          console.error("Error creating user notification:", userNotificationError)
        } else {
          console.log("User notification created successfully for booking")
        }
      } catch (userNotificationError) {
        console.error("Exception creating user notification:", userNotificationError)
      }
    }

    // Send emails directly from this API
    try {
      // Prepare the booking object for the email
      const bookingForEmail = {
        ...createdBooking,
        room_name: roomData.name,
        booking_date: format(new Date(bookingData.date), "MMMM d, yyyy"),
      }

      // ในโหมดทดสอบ ให้ส่งอีเมลไปที่อีเมลที่ยืนยันแล้วเท่านั้น
      const isTestMode = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"
      const adminEmail = "pidtaya.p@btc-space.com"

      // ส่งอีเมลไปหาแอดมิน
      console.log("Sending admin notification email to:", adminEmail)
      await sendBookingCreatedEmail(adminEmail, bookingForEmail, true)

      // ส่งอีเมลไปหาผู้จอง (ถ้ามีอีเมล)
      if (bookingData.email) {
        console.log("Sending booking confirmation email to:", bookingData.email)
        await sendBookingCreatedEmail(bookingData.email, bookingForEmail)
      }
    } catch (emailError) {
      console.error("Failed to send booking emails:", emailError)
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      booking: createdBooking,
    })
  } catch (error: any) {
    console.error("Unhandled error processing booking request:", error)
    return NextResponse.json(
      {
        error: "Server error",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
