import { NextResponse } from "next/server"
import { sendPackageExpiringSoonEmail } from "@/lib/email-utils"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { to, member, packageDetails, daysLeft } = await request.json()

    // ส่งอีเมลแจ้งเตือนแพ็คเกจใกล้หมดอายุ
    const emailSent = await sendPackageExpiringSoonEmail(to, member, packageDetails, daysLeft)

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send package expiring email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Package expiring email sent successfully",
    })
  } catch (error) {
    console.error("Error processing package expiring notification:", error)
    return NextResponse.json({ error: "Failed to process package expiring notification" }, { status: 500 })
  }
}
