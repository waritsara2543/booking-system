import { NextResponse } from "next/server"
import { sendBookingCreatedEmail } from "@/lib/email-utils"

export async function POST(request: Request) {
  try {
    console.log("Received request to send admin notification email")

    // Parse the request body
    const data = await request.json()

    console.log("Request data:", JSON.stringify(data, null, 2))

    // Validate required fields
    if (!data.booking || !data.adminEmail) {
      console.error("Missing required fields:", { booking: !!data.booking, adminEmail: data.adminEmail })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Send the email
    try {
      console.log("Attempting to send admin notification email to:", data.adminEmail)
      const result = await sendBookingCreatedEmail(data.adminEmail, data.booking)
      console.log("Email sending result:", result)

      // ถ้าเป็นการจองของสมาชิก ให้ส่งอีเมลไปยังสมาชิกด้วย
      if (data.booking.email && data.booking.email !== data.adminEmail) {
        console.log("Attempting to send confirmation email to member:", data.booking.email)
        await sendBookingCreatedEmail(data.booking.email, data.booking)
      }

      if (result) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json(
          { error: "Failed to send email", details: "Email function returned false" },
          { status: 500 },
        )
      }
    } catch (emailError: any) {
      console.error("Error sending admin notification email:", emailError)
      return NextResponse.json(
        {
          error: "Error sending admin notification email",
          details: emailError.message || "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Server error in send-admin-notification API:", error)
    return NextResponse.json({ error: "Server error", details: error.message || "Unknown error" }, { status: 500 })
  }
}
