import { NextResponse } from "next/server"
import { sendPackageExpiredEmail } from "@/lib/email-utils"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { to, member, packageDetails } = await request.json()

    // ส่งอีเมลแจ้งแพ็คเกจหมดอายุ
    const emailSent = await sendPackageExpiredEmail(to, member, packageDetails)

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send package expired email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Package expired email sent successfully",
    })
  } catch (error) {
    console.error("Error processing package expired notification:", error)
    return NextResponse.json({ error: "Failed to process package expired notification" }, { status: 500 })
  }
}
