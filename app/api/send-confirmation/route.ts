import { NextResponse } from "next/server"
import { sendBookingConfirmedEmail } from "@/lib/email-utils"

export async function POST(request: Request) {
  try {
    console.log("Received request to send confirmation email")

    // Parse the request body
    const data = await request.json()

    console.log("Request data:", JSON.stringify(data, null, 2))

    // Validate required fields
    if (!data.email || !data.booking) {
      console.error("Missing required fields:", { email: data.email, booking: !!data.booking })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Send the email
    try {
      console.log("Attempting to send confirmation email to:", data.email)
      const result = await sendBookingConfirmedEmail(data.email, data.booking)
      console.log("Email sending result:", result)

      if (result) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json(
          { error: "Failed to send email", details: "Email function returned false" },
          { status: 500 },
        )
      }
    } catch (emailError: any) {
      console.error("Error sending confirmation email:", emailError)
      return NextResponse.json(
        {
          error: "Error sending confirmation email",
          details: emailError.message || "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Server error in send-confirmation API:", error)
    return NextResponse.json({ error: "Server error", details: error.message || "Unknown error" }, { status: 500 })
  }
}
