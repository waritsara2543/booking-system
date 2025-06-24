import { NextResponse } from "next/server"
import { checkAndNotifyPackageExpirations } from "@/lib/notification-utils"

export async function GET(request: Request) {
  try {
    const result = await checkAndNotifyPackageExpirations()

    return NextResponse.json({
      success: true,
      checked: result,
    })
  } catch (error) {
    console.error("Error checking package expirations:", error)
    return NextResponse.json({ error: "Failed to check package expirations" }, { status: 500 })
  }
}
