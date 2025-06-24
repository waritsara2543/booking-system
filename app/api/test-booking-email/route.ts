import { NextResponse } from "next/server"
import { sendBookingCreatedEmail, sendBookingConfirmedEmail } from "@/lib/email-utils"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { email, type } = data

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const testBooking = {
      id: "test-" + Math.random().toString(36).substring(2, 9),
      room_name: "Test Meeting Room",
      date: new Date().toISOString(),
      start_time: "10:00",
      end_time: "11:00",
      purpose: "Testing Email System",
      name: "Test User",
      email: email,
      booking_date: new Date().toLocaleDateString(),
      status: "pending",
    }

    let result: boolean

    if (type === "confirmed") {
      result = await sendBookingConfirmedEmail(email, testBooking)
    } else {
      result = await sendBookingCreatedEmail(email, testBooking)
    }

    if (result) {
      return NextResponse.json({
        success: true,
        message: `Test ${type || "booking"} email sent successfully to ${email}`,
      })
    } else {
      return NextResponse.json(
        {
          error: "Failed to send email",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Error sending test email:", error)
    return NextResponse.json(
      {
        error: "Error sending test email",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
