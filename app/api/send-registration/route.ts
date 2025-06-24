import { NextResponse } from "next/server"
import { sendMemberRegistrationEmail } from "@/lib/email-utils"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { to, subject, memberDetails } = await request.json()

    // ส่งอีเมลยืนยันการสมัครสมาชิก
    const emailSent = await sendMemberRegistrationEmail(to, memberDetails)

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send registration email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Registration email sent successfully",
    })
  } catch (error) {
    console.error("Error processing registration:", error)
    return NextResponse.json({ error: "Failed to process registration" }, { status: 500 })
  }
}
