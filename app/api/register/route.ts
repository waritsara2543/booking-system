import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateMemberId } from "@/lib/supabase"

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const { name, email, phone, password } = await request.json()

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("members")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing user:", checkError)
      return NextResponse.json({ error: "Failed to check existing user" }, { status: 500 })
    }

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    // Generate a unique member ID
    let memberId = generateMemberId()
    let isUnique = false

    // Ensure the generated ID is unique
    while (!isUnique) {
      const { data, error } = await supabase.from("members").select("id").eq("member_id", memberId).maybeSingle()

      if (error) {
        console.error("Error checking member ID uniqueness:", error)
        return NextResponse.json({ error: "Failed to generate unique member ID" }, { status: 500 })
      }

      if (!data) {
        isUnique = true
      } else {
        memberId = generateMemberId()
      }
    }

    // Create the new member
    const { data: newMember, error: insertError } = await supabase
      .from("members")
      .insert([
        {
          member_id: memberId,
          name,
          email,
          phone: phone || null,
          password_hash: password, // In a real app, you would hash this password
        },
      ])
      .select()

    if (insertError) {
      console.error("Error creating member:", insertError)
      return NextResponse.json({ error: "Failed to create member" }, { status: 500 })
    }

    // Get the UUID of the newly created member
    const memberUUID = newMember[0].id

    // Notify admin of new user registration
    try {
      // ใช้ ID ของสมาชิกใหม่เป็น booking_id
      const { error: notificationError } = await supabase.from("admin_notifications").insert([
        {
          booking_id: memberUUID,
          title: "มีผู้ใช้ลงทะเบียนใหม่",
          message: `ผู้ใช้ใหม่: ${name} (${email}) ได้ลงทะเบียนเข้าใช้งานระบบ`,
          is_read: false,
        },
      ])

      if (notificationError) {
        console.error("Error creating admin notification:", notificationError)
        console.error("Notification error details:", JSON.stringify(notificationError, null, 2))
      } else {
        console.log("Admin notification created successfully for new user registration")
      }
    } catch (notificationError) {
      console.error("Exception creating admin notification:", notificationError)
      console.error("Exception details:", JSON.stringify(notificationError, null, 2))
    }

    return NextResponse.json({
      success: true,
      memberId,
      message: "Registration successful",
    })
  } catch (error) {
    console.error("Error in registration:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
