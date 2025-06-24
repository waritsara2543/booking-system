import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    // ตรวจสอบโครงสร้างตาราง admin_notifications
    const { data: columns, error: columnsError } = await supabase.rpc("check_table_structure", {
      table_name: "admin_notifications",
    })

    if (columnsError) {
      console.error("Error checking table structure:", columnsError)
      return NextResponse.json({ error: "Failed to check table structure" }, { status: 500 })
    }

    // ตรวจสอบว่ามีข้อมูลในตาราง admin_notifications หรือไม่
    const { data: notifications, error: notificationsError } = await supabase
      .from("admin_notifications")
      .select("*")
      .limit(5)

    if (notificationsError) {
      console.error("Error fetching notifications:", notificationsError)
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      tableStructure: columns,
      sampleData: notifications,
    })
  } catch (error) {
    console.error("Error checking table structure:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
