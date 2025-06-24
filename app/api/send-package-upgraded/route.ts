import { NextResponse } from "next/server"
import { sendPackageUpgradedEmail } from "@/lib/email-utils"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { to, member, oldPackage, newPackage } = await request.json()

    // ส่งอีเมลแจ้งการอัพเกรดแพ็คเกจ
    const emailSent = await sendPackageUpgradedEmail(to, member, oldPackage, newPackage)

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send package upgraded email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Package upgraded email sent successfully",
    })
  } catch (error) {
    console.error("Error processing package upgraded notification:", error)
    return NextResponse.json({ error: "Failed to process package upgraded notification" }, { status: 500 })
  }
}
