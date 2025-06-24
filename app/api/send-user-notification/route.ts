import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { userId, title, message, type = "info" } = await request.json()

    if (!userId || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create notification in database
    const { data, error } = await supabase
      .from("user_notifications")
      .insert([
        {
          user_id: userId,
          title,
          message,
          type,
        },
      ])
      .select()

    if (error) {
      console.error("Error creating user notification:", error)
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 })
    }

    // Attempt to trigger a real-time update
    try {
      const broadcastChannel = supabase.channel("user_notifications_broadcast")
      broadcastChannel.send({
        type: "broadcast",
        event: "new_user_notification",
        payload: {
          userId,
          notification: data[0],
        },
      })
    } catch (broadcastError) {
      console.error("Error broadcasting user notification:", broadcastError)
    }

    return NextResponse.json({ success: true, notification: data[0] })
  } catch (error) {
    console.error("Error in send-user-notification API:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
