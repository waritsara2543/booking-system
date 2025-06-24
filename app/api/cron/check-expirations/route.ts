import { NextResponse } from "next/server"
import { checkAndNotifyPackageExpirations, checkAndNotifyWiFiQuota } from "@/lib/notification-utils"

// This endpoint can be called by a cron job to check for package expirations and WiFi quota
export async function GET(request: Request) {
  try {
    // Check for package expirations
    const expirationResult = await checkAndNotifyPackageExpirations()

    // Check WiFi quota
    const wifiQuotaResult = await checkAndNotifyWiFiQuota()

    return NextResponse.json({
      success: true,
      expirationChecked: expirationResult,
      wifiQuotaChecked: wifiQuotaResult,
    })
  } catch (error) {
    console.error("Error in cron job:", error)
    return NextResponse.json({ error: "Failed to run scheduled checks" }, { status: 500 })
  }
}
