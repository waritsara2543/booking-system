import { NextResponse } from "next/server"
import { sendBookingCancelledEmail, isPreviewEnvironment } from "@/lib/email-utils"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { to, subject, booking, reason } = await request.json()

    // ตรวจสอบว่าอยู่ในสภาพแวดล้อม preview หรือไม่
    if (await isPreviewEnvironment()) {
      console.log("Preview environment detected, mocking email send")
      return NextResponse.json({ success: true, mock: true })
    }

    // ส่งอีเมลยกเลิกการจอง
    const emailSent = await sendBookingCancelledEmail(to, booking, reason)

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send cancellation email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Cancellation email sent successfully",
    })
  } catch (error) {
    console.error("Error processing cancellation:", error)
    return NextResponse.json({ error: "Failed to process cancellation" }, { status: 500 })
  }
}
