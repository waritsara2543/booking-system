export const runtime = "nodejs"
import { NextResponse } from "next/server"
import { sendEmail, checkEmailConfig } from "@/lib/email-utils"

export async function GET() {
  try {
    // ตรวจสอบการตั้งค่าอีเมล
    const configCheck = await checkEmailConfig()
    if (!configCheck.configured) {
      return NextResponse.json(
        {
          success: false,
          message: "Email configuration is not valid",
          error: configCheck.error,
        },
        { status: 500 },
      )
    }

    // ทดสอบส่งอีเมล
    const testEmail = "pittaya03538@gmail.com" // อีเมลที่ยืนยันแล้ว
    const subject = "Test Email from BTC Space Booking System"
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">Test Email</h2>
        <p>This is a test email from the BTC Space Booking System.</p>
        <p>If you received this email, it means that the email configuration is working correctly.</p>
        <p>Time sent: ${new Date().toLocaleString()}</p>
      </div>
    `

    const emailSent = await sendEmail({
      to: testEmail,
      subject,
      html,
    })

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send test email",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Error in test-email route:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error sending test email",
        error: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
