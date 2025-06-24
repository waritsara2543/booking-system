import { NextResponse } from "next/server"
import { checkAndNotifyWiFiQuota } from "@/lib/notification-utils"

export async function GET(request: Request) {
  try {
    const result = await checkAndNotifyWiFiQuota()

    return NextResponse.json({
      success: true,
      checked: result,
    })
  } catch (error) {
    console.error("Error checking WiFi quota:", error)
    return NextResponse.json({ error: "Failed to check WiFi quota" }, { status: 500 })
  }
}
