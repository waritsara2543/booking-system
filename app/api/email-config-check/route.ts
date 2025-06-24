export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { checkEmailConfig } from "@/lib/email-utils"

export async function GET() {
  try {
    const configCheck = await checkEmailConfig()

    return NextResponse.json({
      success: configCheck.configured,
      message: configCheck.configured ? "Email configuration is valid" : "Email configuration is not valid",
      error: configCheck.error,
    })
  } catch (error: any) {
    console.error("Error checking email configuration:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error checking email configuration",
        error: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
