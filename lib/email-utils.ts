"use server"

import nodemailer from "nodemailer"
import { format } from "date-fns"

// สร้าง transporter สำหรับ SMTP ของ Gmail
const createTransporter = async () => {
  // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log("Missing EMAIL_USER or EMAIL_PASSWORD environment variables")

    // ในโหมดทดสอบ ให้ใช้ test account
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      console.log("Development mode - creating test account")

      try {
        // สร้าง test account สำหรับทดสอบ
        const testAccount = await nodemailer.createTestAccount()

        console.log("Created test account:", testAccount)

        // สร้าง transporter สำหรับ ethereal.email
        return nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        })
      } catch (error) {
        console.error("Failed to create test account:", error)
        throw new Error("Missing email credentials and failed to create test account")
      }
    } else {
      throw new Error("Missing EMAIL_USER or EMAIL_PASSWORD environment variables")
    }
  }

  // สร้าง transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    debug: true, // เพิ่ม debug mode เพื่อดูข้อมูลการเชื่อมต่อละเอียดขึ้น
  })

  // ทดสอบการเชื่อมต่อ
  try {
    await transporter.verify()
    console.log("SMTP connection verified successfully")
    return transporter
  } catch (error) {
    console.error("SMTP connection verification failed:", error)
    throw error
  }
}

// ฟังก์ชันสำหรับส่งอีเมล
export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: any[]
}) {
  // ตรวจสอบว่าอยู่ในโหมดทดสอบหรือไม่
  const isTestMode = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"

  try {
    // สร้าง transporter
    const transporter = await createTransporter()

    // ถ้าอยู่ในโหมดทดสอบและอีเมลปลายทางไม่ใช่อีเมลที่ยืนยันแล้ว
    const originalTo = to

    // ใช้ pidtaya.it@gmail.com เป็นอีเมลต้นทางเสมอ
    const fromEmail = process.env.EMAIL_USER || "test@example.com"
    const fromName = "BTC Space Booking System"
    const from = `${fromName} <${fromEmail}>`

    // ส่งอีเมลด้วย nodemailer
    const mailOptions = {
      from: from,
      to: originalTo,
      subject: isTestMode ? `${subject}` : subject,
      html: html,
      text: text,
      attachments: attachments,
    }

    console.log("Attempting to send email with options:", {
      from,
      to,
      subject: mailOptions.subject,
    })

    const info = await transporter.sendMail(mailOptions)

    console.log("Email sent successfully to:", to)
    console.log("Message ID:", info.messageId)

    // ถ้าเป็น ethereal.email (test account) ให้แสดง link สำหรับดูอีเมล
    if (isTestMode && info.messageId && info.messageId.includes("ethereal.email")) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
    }

    return true
  } catch (error) {
    console.error("Error sending email:", error)
    // ในกรณีที่เป็น development/preview environment ให้ return true เพื่อให้ flow ทำงานต่อได้
    if (isTestMode) {
      console.log("Development/Preview mode - simulating email sent")
      return true
    }
    throw error // โยนข้อผิดพลาดออกไปเพื่อให้จัดการได้ที่ API route
  }
}

export async function isPreviewEnvironment(): Promise<boolean> {
  return process.env.VERCEL_ENV === "preview" || process.env.NODE_ENV === "development"
}

export async function checkEmailConfig(): Promise<{ configured: boolean; error?: string }> {
  try {
    const hasUser = !!process.env.EMAIL_USER
    const hasPassword = !!process.env.EMAIL_PASSWORD

    if (!hasUser || !hasPassword) {
      return {
        configured: false,
        error: !hasUser ? "Missing EMAIL_USER environment variable." : "Missing EMAIL_PASSWORD environment variable.",
      }
    }

    // ทดสอบการเชื่อมต่อกับ SMTP server
    try {
      await createTransporter()
      return { configured: true }
    } catch (error: any) {
      return {
        configured: false,
        error: `SMTP connection failed: ${error.message || "Unknown error"}`,
      }
    }
  } catch (error: any) {
    console.error("Error verifying email configuration:", error)
    return { configured: false, error: error.message || "Failed to verify email configuration." }
  }
}

// ฟังก์ชันสำหรับส่งอีเมลในแต่ละสถานะของการจอง

// 1. ส่งอีเมลเมื่อมีการจองใหม่ (Pending)
export async function sendBookingCreatedEmail(to: string, booking: any, isAdmin = false) {
  if (!to) {
    console.error("No recipient email provided for booking created email")
    return false
  }

  if (!booking) {
    console.error("No booking data provided for booking created email")
    return false
  }

  console.log("Sending booking created email to:", to, "with booking:", booking.id || "N/A")

  // ตรวจสอบว่า booking มีข้อมูลที่จำเป็นหรือไม่
  const bookingData = {
    id: booking.id || "N/A",
    room_name: booking.room_name || "Not specified",
    date: booking.date || new Date().toISOString(),
    start_time: booking.start_time || "N/A",
    end_time: booking.end_time || "N/A",
    purpose: booking.purpose || "Not specified",
    name: booking.name || "Guest",
    email: booking.email || "Not provided",
    booking_date: booking.booking_date || format(new Date(booking.date || new Date()), "MMMM d, yyyy"),
  }

  const subject = isAdmin ? "New Booking - Awaiting Confirmation" : "Booking - Awaiting Confirmation"

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a7dff; text-align: center;">Booking Received</h2>
      <p>Thank you for your booking request. Your booking is currently pending approval.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Booking ID:</strong> ${bookingData.id}</p>
        <p><strong>Room:</strong> ${bookingData.room_name}</p>
        <p><strong>Date:</strong> ${bookingData.booking_date}</p>
        <p><strong>Time:</strong> ${bookingData.start_time} - ${bookingData.end_time}</p>
        <p><strong>Purpose:</strong> ${bookingData.purpose}</p>
        <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending</span></p>
      </div>
      
      <p>We will review your booking request and send you a confirmation email once it's approved.</p>
      <p>If you have any questions, please contact our support team.</p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </div>
  `
  const htmlAdmin = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a7dff; text-align: center;">New Booking</h2>
      <p>Thank you for your booking request. Your booking is currently pending approval.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Booking ID:</strong> ${bookingData.id}</p>
        <p><strong>Room:</strong> ${bookingData.room_name}</p>
        <p><strong>Date:</strong> ${bookingData.booking_date}</p>
        <p><strong>Time:</strong> ${bookingData.start_time} - ${bookingData.end_time}</p>
        <p><strong>Purpose:</strong> ${bookingData.purpose}</p>
        <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending</span></p>
      </div>
      
      <p>We will review your booking request and send you a confirmation email once it's approved.</p>
      <p>If you have any questions, please contact our support team.</p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </div>
  `

  try {
    // ส่งอีเมลไปยัง user
    const emailSent = await sendEmail({ to, subject, html: isAdmin ? htmlAdmin : html })
    return emailSent
  } catch (error) {
    console.error("Error in sendBookingCreatedEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 2. ส่งอีเมลเมื่อการจองได้รับการยืนยัน (Confirmed)
export async function sendBookingConfirmedEmail(to: string, booking: any) {
  try {
    if (!to) throw new Error("Recipient email is required")
    if (!booking) throw new Error("Booking details are required")

    console.log("Sending booking confirmed email to:", to, "with booking:", booking.id || "N/A")

    // ตรวจสอบว่า booking มีข้อมูลที่จำเป็นหรือไม่
    const bookingData = {
      id: booking.id || "N/A",
      room_name: booking.room_name || "Not specified",
      date: booking.date || new Date().toISOString(),
      start_time: booking.start_time || "N/A",
      end_time: booking.end_time || "N/A",
      purpose: booking.purpose || "Not specified",
      name: booking.name || "Guest",
      email: booking.email || "Not provided",
      booking_date: booking.booking_date || format(new Date(booking.date || new Date()), "MMMM d, yyyy"),
    }

    const subject = "Booking Confirmed"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #10b981; text-align: center;">Booking Confirmed</h2>
        <p>Your booking has been confirmed. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingData.id}</p>
          <p><strong>Room:</strong> ${bookingData.room_name}</p>
          <p><strong>Date:</strong> ${bookingData.booking_date}</p>
          <p><strong>Time:</strong> ${bookingData.start_time} - ${bookingData.end_time}</p>
          <p><strong>Purpose:</strong> ${bookingData.purpose}</p>
          <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Confirmed</span></p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-bookings/${bookingData.id}" style="background-color: #4a7dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Booking Details
          </a>
        </div>
        
        <p>If you need to make any changes or have any questions, please contact us.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมล
    const emailSent = await sendEmail({ to, subject, html })
    return emailSent
  } catch (error) {
    console.error("Error in sendBookingConfirmedEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 3. ส่งอีเมลเมื่อการจองถูกยกเลิก (Cancelled)
export async function sendBookingCancelledEmail(to: string, booking: any, reason = "") {
  try {
    const subject = "Booking Cancelled"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #ef4444; text-align: center;">Booking Cancelled</h2>
        <p>We regret to inform you that your booking has been cancelled.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Room:</strong> ${booking.room_name || "Not specified"}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
          <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Cancelled</span></p>
        </div>
        
        ${
          reason
            ? `
        <div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p><strong>Reason for cancellation:</strong></p>
          <p>${reason}</p>
        </div>
        `
            : ""
        }
        
        <p style="margin-top: 20px;">If you have any questions or would like to make a new booking, please contact us.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "Booking Cancelled"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #ef4444; text-align: center;">Booking Cancelled</h2>
        <p>A booking has been cancelled. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Customer:</strong> ${booking.name}</p>
          <p><strong>Email:</strong> ${booking.email}</p>
          <p><strong>Room:</strong> ${booking.room_name || "Not specified"}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
          <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Cancelled</span></p>
        </div>
        
        ${
          reason
            ? `
        <div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p><strong>Reason for cancellation:</strong></p>
          <p>${reason}</p>
        </div>
        `
            : ""
        }
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendBookingCancelledEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 4. ส่งอีเมลเมื่อการจองเสร็จสิ้น (Completed)
export async function sendBookingCompletedEmail(to: string, booking: any) {
  try {
    const subject = "Booking Completed - Thank You"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">Thank You for Using Our Service</h2>
        <p>Your booking has been completed. We hope you enjoyed our service.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Room:</strong> ${booking.room_name || "Not specified"}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
          <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Completed</span></p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback/${booking.id}" style="background-color: #4a7dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Leave Feedback
          </a>
        </div>
        
        <p>We value your feedback and would appreciate if you could take a moment to share your experience.</p>
        <p>Thank you for choosing our service. We look forward to serving you again.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "Booking Completed"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">Booking Completed</h2>
        <p>A booking has been completed. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Customer:</strong> ${booking.name}</p>
          <p><strong>Email:</strong> ${booking.email}</p>
          <p><strong>Room:</strong> ${booking.room_name || "Not specified"}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
          <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Completed</span></p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendBookingCompletedEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 5. ส่งอีเมลเมื่อผู้ใช้ไม่มาใช้บริการ (No-Show)
export async function sendBookingNoShowEmail(to: string, booking: any) {
  try {
    const subject = "Missed Booking - No-Show"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #f59e0b; text-align: center;">Missed Booking</h2>
        <p>We noticed that you didn't attend your scheduled booking. We hope everything is okay.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Room:</strong> ${booking.room_name || "Not specified"}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">No-Show</span></p>
        </div>
        
        <p>If you would like to reschedule, please make a new booking through our system.</p>
        <p>Please note that repeated no-shows may affect your future booking privileges.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/new" style="background-color: #4a7dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Make a New Booking
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "Booking No-Show"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #f59e0b; text-align: center;">Booking No-Show</h2>
        <p>A customer did not attend their scheduled booking. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Customer:</strong> ${booking.name}</p>
          <p><strong>Email:</strong> ${booking.email}</p>
          <p><strong>Room:</strong> ${booking.room_name || "Not specified"}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">No-Show</span></p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendBookingNoShowEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// ฟังก์ชันสำหรับส่งอีเมลในแต่ละสถานะของแพ็คเกจ

// 1. ส่งอีเมลเมื่อมีการเลือกแพ็คเกจใหม่ (Pending)
export async function sendPackageSelectedEmail(to: string, member: any, packageDetails: any) {
  try {
    const subject = "Package Selection - Awaiting Payment"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">Package Selected</h2>
        <p>Thank you for selecting a membership package. Your package is currently pending payment.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>Price:</strong> ${packageDetails.price} THB</p>
          <p><strong>Duration:</strong> ${packageDetails.duration_days} days</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Payment</span></p>
        </div>
        
        <p>Please visit our counter to complete the payment and activate your package.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "New Package Selection"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">New Package Selection</h2>
        <p>A member has selected a new package. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>Price:</strong> ${packageDetails.price} THB</p>
          <p><strong>Duration:</strong> ${packageDetails.duration_days} days</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Payment</span></p>
        </div>
        
        <p>Please process the payment to activate this package.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendPackageSelectedEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 1.1 ส่งอีเมลเมื่อมีการอัปเกรดแพ็คเกจ (Upgrade Request)
export async function sendPackageUpgradeRequestEmail(
  to: string,
  member: any,
  oldPackageDetails: any,
  newPackageDetails: any,
) {
  try {
    const subject = "Package Upgrade Request - Awaiting Payment"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">Package Upgrade Request</h2>
        <p>Thank you for requesting to upgrade your membership package. Your upgrade is currently pending payment.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Current Package:</strong> ${oldPackageDetails.name}</p>
          <p><strong>Upgrade To:</strong> ${newPackageDetails.name}</p>
          <p><strong>New Price:</strong> ${newPackageDetails.price} THB</p>
          <p><strong>Duration:</strong> ${newPackageDetails.duration_days} days</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Payment</span></p>
        </div>
        
        <p>Please visit our counter to complete the payment and activate your upgraded package.</p>
        <p><strong>Note:</strong> Your current package will remain active until the upgrade is confirmed.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "Package Upgrade Request"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">Package Upgrade Request</h2>
        <p>A member has requested to upgrade their package. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Current Package:</strong> ${oldPackageDetails.name}</p>
          <p><strong>Upgrade To:</strong> ${newPackageDetails.name}</p>
          <p><strong>New Price:</strong> ${newPackageDetails.price} THB</p>
          <p><strong>Duration:</strong> ${newPackageDetails.duration_days} days</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Payment</span></p>
        </div>
        
        <p>Please process the payment to activate this package upgrade.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendPackageUpgradeRequestEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 2. ส่งอีเมลเมื่อแพ็คเกจได้รับการยืนยัน (Completed)
export async function sendPackageConfirmedEmail(to: string, member: any, packageDetails: any, wifiCredentials?: any) {
  try {
    const subject = "Package Confirmed - Ready to Use"

    // Generate WiFi section if credentials are provided
    let wifiSection = ""
    if (wifiCredentials && wifiCredentials.ssid && wifiCredentials.password) {
      wifiSection = `
        <div style="margin: 20px 0; padding: 15px; border: 1px dashed #4a7dff; border-radius: 5px; background-color: #f5f9ff;">
          <h3 style="color: #2c5282; margin-top: 0;">WiFi Access Information</h3>
          <p><strong>SSID:</strong> ${wifiCredentials.ssid}</p>
          <p><strong>Password:</strong> ${wifiCredentials.password}</p>
          <p><strong>Notes:</strong> ${wifiCredentials.notes || "No additional notes."}</p>
        </div>
      `
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #10b981; text-align: center;">Package Confirmed</h2>
        <p>Your membership package has been confirmed and is now active.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>Price:</strong> ${packageDetails.price} THB</p>
          <p><strong>Start Date:</strong> ${packageDetails.start_date ? new Date(packageDetails.start_date).toLocaleDateString() : "Not specified"}</p>
          <p><strong>End Date:</strong> ${packageDetails.end_date ? new Date(packageDetails.end_date).toLocaleDateString() : "Not specified"}</p>
          <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Active</span></p>
        </div>
        
        ${wifiSection}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="background-color: #4a7dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Your Profile
          </a>
        </div>
        
        <p>Thank you for choosing our services. If you have any questions or need assistance, please contact our support team.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "Package Confirmed"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #10b981; text-align: center;">Package Confirmed</h2>
        <p>A member's package has been confirmed. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>Price:</strong> ${packageDetails.price} THB</p>
          <p><strong>Start Date:</strong> ${packageDetails.start_date ? new Date(packageDetails.start_date).toLocaleDateString() : "Not specified"}</p>
          <p><strong>End Date:</strong> ${packageDetails.end_date ? new Date(packageDetails.end_date).toLocaleDateString() : "Not specified"}</p>
          <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Active</span></p>
        </div>
        
        ${wifiSection}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendPackageConfirmedEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 3. ส่งอีเมลเมื่อแพ็คเกจถูกยกเลิก (Cancelled)
export async function sendPackageCancelledEmail(to: string, member: any, packageDetails: any, reason = "") {
  try {
    const subject = "Package Cancelled"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #ef4444; text-align: center;">Package Cancelled</h2>
        <p>We regret to inform you that your membership package has been cancelled.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Cancelled</span></p>
        </div>
        
        ${
          reason
            ? `
        <div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p><strong>Reason for cancellation:</strong></p>
          <p>${reason}</p>
        </div>
        `
            : ""
        }
        
        <p style="margin-top: 20px;">If you have any questions or would like to select a new package, please contact us.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "Package Cancelled"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #ef4444; text-align: center;">Package Cancelled</h2>
        <p>A member's package has been cancelled. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Cancelled</span></p>
        </div>
        
        ${
          reason
            ? `
        <div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p><strong>Reason for cancellation:</strong></p>
          <p>${reason}</p>
        </div>
        `
            : ""
        }
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendPackageCancelledEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 4. ส่งอีเมลเมื่อแพ็คเกจใกล้หมดอายุ (Expiring Soon)
export async function sendPackageExpiringSoonEmail(to: string, member: any, packageDetails: any, daysLeft: number) {
  try {
    const subject = `Your Package Expires in ${daysLeft} ${daysLeft === 1 ? "Day" : "Days"}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #f59e0b; text-align: center;">Package Expiring Soon</h2>
        <p>Your membership package will expire in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>End Date:</strong> ${new Date(packageDetails.endDate).toLocaleDateString()}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Expiring Soon</span></p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/packages" style="background-color: #4a7dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Renew Your Package
          </a>
        </div>
        
        <p>To continue enjoying our services without interruption, please renew your package before it expires.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = `Package Expiring in ${daysLeft} ${daysLeft === 1 ? "Day" : "Days"}`
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #f59e0b; text-align: center;">Package Expiring Soon</h2>
        <p>A member's package will expire in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>End Date:</strong> ${new Date(packageDetails.endDate).toLocaleDateString()}</p>
          <p><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Expiring Soon</span></p>
        </div>
        
        <p>You may want to contact this member about renewing their package.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendPackageExpiringSoonEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 5. ส่งอีเมลเมื่อแพ็คเกจหมดอายุ (Expired)
export async function sendPackageExpiredEmail(to: string, member: any, packageDetails: any) {
  try {
    const subject = "Your Package Has Expired"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #ef4444; text-align: center;">Package Expired</h2>
        <p>Your membership package has expired.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>End Date:</strong> ${new Date(packageDetails.endDate).toLocaleDateString()}</p>
          <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Expired</span></p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/packages" style="background-color: #4a7dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Renew Your Package
          </a>
        </div>
        
        <p>To continue using our services, please select a new package or renew your existing one.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "Package Expired"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #ef4444; text-align: center;">Package Expired</h2>
        <p>A member's package has expired. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Package:</strong> ${packageDetails.name}</p>
          <p><strong>End Date:</strong> ${new Date(packageDetails.endDate).toLocaleDateString()}</p>
          <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">Expired</span></p>
        </div>
        
        <p>You may want to contact this member about renewing their package.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendPackageExpiredEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 6. ส่งอีเมลเมื่อแพ็คเกจถูกอัพเกรด (Upgraded)
export async function sendPackageUpgradedEmail(to: string, member: any, oldPackage: any, newPackage: any) {
  try {
    const subject = "Package Upgraded Successfully"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #10b981; text-align: center;">Package Upgraded</h2>
        <p>Your membership package has been successfully upgraded.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Previous Package:</strong> ${oldPackage.name}</p>
          <p><strong>New Package:</strong> ${newPackage.name}</p>
          <p><strong>Start Date:</strong> ${newPackage.start_date ? new Date(newPackage.start_date).toLocaleDateString() : "Not specified"}</p>
          <p><strong>End Date:</strong> ${newPackage.end_date ? new Date(newPackage.end_date).toLocaleDateString() : "Not specified"}</p>
          <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Active</span></p>
        </div>
        
        <p>Thank you for upgrading your membership. You now have access to additional benefits and features.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="background-color: #4a7dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Your Profile
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "Package Upgraded"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #10b981; text-align: center;">Package Upgraded</h2>
        <p>A member has upgraded their package. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Member:</strong> ${member.name}</p>
          <p><strong>Member ID:</strong> ${member.memberId}</p>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Previous Package:</strong> ${oldPackage.name}</p>
          <p><strong>New Package:</strong> ${newPackage.name}</p>
          <p><strong>Start Date:</strong> ${newPackage.start_date ? new Date(newPackage.start_date).toLocaleDateString() : "Not specified"}</p>
          <p><strong>End Date:</strong> ${newPackage.end_date ? new Date(newPackage.end_date).toLocaleDateString() : "Not specified"}</p>
          <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Active</span></p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendPackageUpgradedEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}

// 7. ส่งอีเมลเมื่อมีการสมัครสมาชิกใหม่
export async function sendMemberRegistrationEmail(to: string, memberDetails: any) {
  try {
    const subject = "Welcome to BTC Space - Registration Confirmed"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">Welcome to BTC Space!</h2>
        <p>Thank you for registering with us. Your membership has been confirmed.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${memberDetails.name}</p>
          <p><strong>Member ID:</strong> ${memberDetails.memberId}</p>
          <p><strong>Email:</strong> ${memberDetails.email}</p>
          <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="background-color: #4a7dff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Your Profile
          </a>
        </div>
        
        <p>You can now enjoy all the benefits of being a member, including booking meeting rooms and accessing our facilities.</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    // ส่งอีเมลไปยัง user
    const userEmailSent = await sendEmail({ to, subject, html })

    // ส่งอีเมลแจ้งเตือนไปยัง admin
    const adminEmail = "pidtaya.p@btc-space.com"
    const adminSubject = "New Member Registration"
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a7dff; text-align: center;">New Member Registration</h2>
        <p>A new member has registered. Here are the details:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${memberDetails.name}</p>
          <p><strong>Member ID:</strong> ${memberDetails.memberId}</p>
          <p><strong>Email:</strong> ${memberDetails.email}</p>
          <p><strong>Phone:</strong> ${memberDetails.phone || "Not provided"}</p>
          <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>Please review the new member's information in the admin dashboard.</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    `

    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml })

    return userEmailSent
  } catch (error) {
    console.error("Error in sendMemberRegistrationEmail:", error)
    // ในโหมดทดสอบให้ return true เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      return true
    }
    return false
  }
}
