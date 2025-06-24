import { NextResponse } from "next/server"
import { sendPackageConfirmedEmail } from "@/lib/email-utils"
import { supabase } from "@/lib/supabase"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { to, subject, memberDetails, packageDetails, wifiCredentials } = await request.json()

    // ส่งอีเมลยืนยันแพ็คเกจ
    const emailSent = await sendPackageConfirmedEmail(to, memberDetails, packageDetails, wifiCredentials)

    // ยังคงสร้าง user notification
    if (memberDetails.memberId) {
      try {
        await supabase.from("user_notifications").insert([
          {
            user_id: memberDetails.memberId,
            title: "Package Confirmed",
            message: `Your ${packageDetails.name} package has been confirmed and is now active.`,
            type: "success",
          },
        ])
      } catch (notificationError) {
        console.error("Error creating user notification:", notificationError)
      }
    }

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send package confirmation email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Package confirmation email sent successfully",
    })
  } catch (error) {
    console.error("Error processing package confirmation:", error)
    return NextResponse.json({ error: "Failed to process package confirmation" }, { status: 500 })
  }
}
