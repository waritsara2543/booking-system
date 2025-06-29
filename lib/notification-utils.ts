"use server"

import { createClient } from "@supabase/supabase-js"

// สร้าง Supabase client สำหรับ server-side operations
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey)
}

// ฟังก์ชันสร้างการแจ้งเตือนสำหรับผู้ดูแลระบบ
export async function createAdminNotification(
  entityId: string,
  title: string,
  message: string,
  type = "booking",
  _priority = "normal", // priority kept for compatibility, but unused
): Promise<any> {
  try {
    console.log(`Creating admin notification: ${title} - ${message}`)
    const supabase = getSupabaseClient()

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
    if (!entityId || !title || !message) {
      console.error("Missing required notification fields:", { entityId, title, message })
      throw new Error("Missing required notification fields")
    }

    // ---------------------------------------------
    // Build the insert payload based on notification type
    const insertData: Record<string, any> = {
      title,
      message,
      is_read: false, // correct column name
      created_at: new Date().toISOString(),
    }

    // Map entityId to the proper FK / metadata
    switch (type) {
      case "booking":
        insertData.booking_id = entityId
        break
      default:
        // Store all other refs in the JSONB metadata column
        insertData.metadata = { type, entityId }
        break
    }

    // Insert the notification
    const { data, error } = await supabase.from("admin_notifications").insert([insertData]).select()

    if (error) {
      console.error("Error creating admin notification:", error)
      // ในโหมดทดสอบ ให้ return mock data เพื่อให้ flow ทำงานต่อได้
      if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
        console.log("Development mode - returning mock notification data")
        return {
          id: "mock-" + Math.random().toString(36).substring(2, 9),
          entity_id: entityId,
          title: title,
          message: message,
          type: type,
          read: false,
          created_at: new Date().toISOString(),
        }
      }
      throw error
    }

    console.log("Admin notification created successfully:", data)
    return data[0]
  } catch (error) {
    console.error("Error in createAdminNotification:", error)
    // ในโหมดทดสอบ ให้ return mock data เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      console.log("Development mode - returning mock notification data after error")
      return {
        id: "mock-error-" + Math.random().toString(36).substring(2, 9),
        entity_id: entityId,
        title: title,
        message: message,
        type: type,
        read: false,
        created_at: new Date().toISOString(),
      }
    }
    throw error
  }
}

// ฟังก์ชันสร้างการแจ้งเตือนสำหรับผู้ใช้
export async function createUserNotification(
  memberId: string,
  title: string,
  message: string,
  type = "booking",
  entityId = "",
  priority = "normal",
): Promise<any> {
  try {
    console.log(`Creating user notification for member ${memberId}: ${title} - ${message}`)
    const supabase = getSupabaseClient()

    // ตรวจสอบว่ามี member_id หรือไม่
    if (!memberId) {
      console.error("Missing member_id for user notification")
      throw new Error("Missing member_id for user notification")
    }

    // สร้างการแจ้งเตือนใหม่
    const { data, error } = await supabase
      .from("user_notifications")
      .insert([
        {
          user_id: memberId,
          title: title,
          message: message,
          type: type,
          is_read: false,
        },
      ])
      .select()

    if (error) {
      console.error("Error creating user notification:", error)
      // ในโหมดทดสอบ ให้ return mock data เพื่อให้ flow ทำงานต่อได้
      if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
        console.log("Development mode - returning mock user notification data")
        return {
          id: "mock-" + Math.random().toString(36).substring(2, 9),
          member_id: memberId,
          title: title,
          message: message,
          type: type,
          priority: priority,
          read: false,
          created_at: new Date().toISOString(),
        }
      }
      throw error
    }

    console.log("User notification created successfully:", data)
    return data[0]
  } catch (error) {
    console.error("Error in createUserNotification:", error)
    // ในโหมดทดสอบ ให้ return mock data เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      console.log("Development mode - returning mock user notification data after error")
      return {
        id: "mock-error-" + Math.random().toString(36).substring(2, 9),
        member_id: memberId,
        title: title,
        message: message,
        type: type,
        priority: priority,
        read: false,
        created_at: new Date().toISOString(),
      }
    }
    throw error
  }
}

// ฟังก์ชันดึงการแจ้งเตือนของผู้ใช้
export async function getUserNotifications(memberId: string, limit = 10): Promise<any[]> {
  try {
    console.log(`Fetching notifications for member ${memberId}`)
    const supabase = getSupabaseClient()

    // ตรวจสอบว่ามี member_id หรือไม่
    if (!memberId) {
      console.error("Missing member_id for fetching user notifications")
      return []
    }

    // ดึงการแจ้งเตือนของผู้ใช้
    const { data, error } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching user notifications:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getUserNotifications:", error)
    return []
  }
}

// ฟังก์ชันดึงการแจ้งเตือนของผู้ดูแลระบบ
export async function getAdminNotifications(limit = 10): Promise<any[]> {
  try {
    console.log("Fetching admin notifications")
    const supabase = getSupabaseClient()

    // ดึงการแจ้งเตือนของผู้ดูแลระบบ
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching admin notifications:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getAdminNotifications:", error)
    return []
  }
}

// ฟังก์ชันอัปเดตสถานะการอ่านของการแจ้งเตือนผู้ใช้
export async function markUserNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    console.log(`Marking user notification ${notificationId} as read`)
    const supabase = getSupabaseClient()

    // อัปเดตสถานะการอ่าน
    const { error } = await supabase.from("user_notifications").update({ read: true }).eq("id", notificationId)

    if (error) {
      console.error("Error marking user notification as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markUserNotificationAsRead:", error)
    return false
  }
}

// ฟังก์ชันอัปเดตสถานะการอ่านของการแจ้งเตือนผู้ดูแลระบบ
export async function markAdminNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    console.log(`Marking admin notification ${notificationId} as read`)
    const supabase = getSupabaseClient()

    // อัปเดตสถานะการอ่าน
    const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("id", notificationId)

    if (error) {
      console.error("Error marking admin notification as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markAdminNotificationAsRead:", error)
    return false
  }
}

// ฟังก์ชันนับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่านของผู้ใช้
export async function countUnreadUserNotifications(memberId: string): Promise<number> {
  try {
    console.log(`Counting unread notifications for member ${memberId}`)
    const supabase = getSupabaseClient()

    // ตรวจสอบว่ามี member_id หรือไม่
    if (!memberId) {
      console.error("Missing member_id for counting unread user notifications")
      return 0
    }

    // นับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
    const { count, error } = await supabase
      .from("user_notifications")
      .select("*", { count: "exact", head: true })
      .eq("member_id", memberId)
      .eq("read", false)

    if (error) {
      console.error("Error counting unread user notifications:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Error in countUnreadUserNotifications:", error)
    return 0
  }
}

// ฟังก์ชันนับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่านของผู้ดูแลระบบ
export async function countUnreadAdminNotifications(): Promise<number> {
  try {
    console.log("Counting unread admin notifications")
    const supabase = getSupabaseClient()

    // นับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
    const { count, error } = await supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)

    if (error) {
      console.error("Error counting unread admin notifications:", error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error("Error in countUnreadAdminNotifications:", error)
    return 0
  }
}

// ฟังก์ชันลบการแจ้งเตือนของผู้ใช้
export async function deleteUserNotification(notificationId: string): Promise<boolean> {
  try {
    console.log(`Deleting user notification ${notificationId}`)
    const supabase = getSupabaseClient()

    // ลบการแจ้งเตือน
    const { error } = await supabase.from("user_notifications").delete().eq("id", notificationId)

    if (error) {
      console.error("Error deleting user notification:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteUserNotification:", error)
    return false
  }
}

// ฟังก์ชันลบการแจ้งเตือนของผู้ดูแลระบบ
export async function deleteAdminNotification(notificationId: string): Promise<boolean> {
  try {
    console.log(`Deleting admin notification ${notificationId}`)
    const supabase = getSupabaseClient()

    // ลบการแจ้งเตือน
    const { error } = await supabase.from("admin_notifications").delete().eq("id", notificationId)

    if (error) {
      console.error("Error deleting admin notification:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteAdminNotification:", error)
    return false
  }
}

// ฟังก์ชันอ่านการแจ้งเตือนทั้งหมดของผู้ใช้
export async function markAllUserNotificationsAsRead(memberId: string): Promise<boolean> {
  try {
    console.log(`Marking all notifications as read for member ${memberId}`)
    const supabase = getSupabaseClient()

    // ตรวจสอบว่ามี member_id หรือไม่
    if (!memberId) {
      console.error("Missing member_id for marking all user notifications as read")
      return false
    }

    // อัปเดตสถานะการอ่านทั้งหมด
    const { error } = await supabase
      .from("user_notifications")
      .update({ read: true })
      .eq("member_id", memberId)
      .eq("read", false)

    if (error) {
      console.error("Error marking all user notifications as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markAllUserNotificationsAsRead:", error)
    return false
  }
}

// ฟังก์ชันอ่านการแจ้งเตือนทั้งหมดของผู้ดูแลระบบ
export async function markAllAdminNotificationsAsRead(): Promise<boolean> {
  try {
    console.log("Marking all admin notifications as read")
    const supabase = getSupabaseClient()

    // อัปเดตสถานะการอ่านทั้งหมด
    const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false)

    if (error) {
      console.error("Error marking all admin notifications as read:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in markAllAdminNotificationsAsRead:", error)
    return false
  }
}

// ฟังก์ชันแจ้งเตือนผู้ดูแลระบบเกี่ยวกับแพ็คเกจ
export async function createPackageAdminNotification(
  packageId: string,
  title: string,
  message: string,
  priority = "normal",
): Promise<any> {
  try {
    console.log(`Creating package admin notification: ${title} - ${message}`)

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
    if (!packageId || !title || !message) {
      console.error("Missing required package notification fields:", { packageId, title, message })
      throw new Error("Missing required package notification fields")
    }

    // สร้างการแจ้งเตือนใหม่
    return await createAdminNotification(packageId, title, message, "package", priority)
  } catch (error) {
    console.error("Error in createPackageAdminNotification:", error)
    // ในโหมดทดสอบ ให้ return mock data เพื่อให้ flow ทำงานต่อได้
    if (process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview") {
      console.log("Development mode - returning mock notification data after error")
      return {
        id: "mock-error-" + Math.random().toString(36).substring(2, 9),
        entity_id: packageId,
        title: title,
        message: message,
        type: "package",
        priority: priority,
        read: false,
        created_at: new Date().toISOString(),
      }
    }
    throw error
  }
}

// ฟังก์ชันแจ้งเตือนผู้ใช้เมื่อสถานะการจองเปลี่ยนแปลง
export async function notifyUserOfBookingStatusChange(
  memberId: string,
  bookingId: string,
  newStatus: string,
  roomName: string,
): Promise<any> {
  try {
    console.log(`Notifying user ${memberId} of booking status change to ${newStatus}`)

    // สร้างข้อความแจ้งเตือนตามสถานะใหม่
    let title = "การจองของคุณมีการเปลี่ยนแปลง"
    let message = `การจองห้อง ${roomName} ของคุณได้เปลี่ยนสถานะเป็น ${newStatus}`

    if (newStatus === "confirmed") {
      title = "การจองของคุณได้รับการยืนยันแล้ว"
      message = `การจองห้อง ${roomName} ของคุณได้รับการยืนยันแล้ว`
    } else if (newStatus === "cancelled") {
      title = "การจองของคุณถูกยกเลิก"
      message = `การจองห้อง ${roomName} ของคุณถูกยกเลิก`
    } else if (newStatus === "completed") {
      title = "การจองของคุณเสร็จสิ้นแล้ว"
      message = `การจองห้อง ${roomName} ของคุณเสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ`
    }

    // สร้างการแจ้งเตือนใหม่
    return await createUserNotification(memberId, title, message, "booking", bookingId)
  } catch (error) {
    console.error("Error in notifyUserOfBookingStatusChange:", error)
    return null
  }
}

// ฟังก์ชันแจ้งเตือนผู้ดูแลระบบเมื่อมีผู้ใช้ใหม่
export async function notifyAdminOfNewUser(userId: string, userName: string, userEmail: string): Promise<any> {
  try {
    console.log(`Notifying admin of new user: ${userName} (${userEmail})`)

    const title = "มีผู้ใช้ลงทะเบียนใหม่"
    const message = `ผู้ใช้ใหม่: ${userName} (${userEmail}) ได้ลงทะเบียนเข้าใช้งานระบบ`

    // สร้างการแจ้งเตือนใหม่
    return await createAdminNotification(userId, title, message, "user", "normal")
  } catch (error) {
    console.error("Error in notifyAdminOfNewUser:", error)
    return null
  }
}

// ฟังก์ชันตรวจสอบและแจ้งเตือนการหมดอายุของแพ็คเกจ
export async function checkAndNotifyPackageExpirations(): Promise<any> {
  try {
    console.log("Checking for package expirations")
    const supabase = getSupabaseClient()

    // ในที่นี้จะเป็นโค้ดที่ตรวจสอบแพ็คเกจที่กำลังจะหมดอายุและส่งการแจ้งเตือน
    // ตัวอย่างเช่น ดึงข้อมูลแพ็คเกจที่กำลังจะหมดอายุใน 7 วัน
    const { data: expiringPackages, error } = await supabase
      .from("member_packages")
      .select("*, members(id, name, email)")
      .gte("expiry_date", new Date().toISOString())
      .lte("expiry_date", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq("status", "active")

    if (error) {
      console.error("Error checking for expiring packages:", error)
      return { success: false, error }
    }

    // ส่งการแจ้งเตือนสำหรับแต่ละแพ็คเกจที่กำลังจะหมดอายุ
    const notifications = []
    for (const pkg of expiringPackages || []) {
      const member = pkg.members
      if (member) {
        const daysToExpiry = Math.ceil(
          (new Date(pkg.expiry_date).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000),
        )

        const title = `แพ็คเกจของคุณกำลังจะหมดอายุใน ${daysToExpiry} วัน`
        const message = `แพ็คเกจ ${pkg.package_name} ของคุณจะหมดอายุในวันที่ ${new Date(pkg.expiry_date).toLocaleDateString()}`

        const notification = await createUserNotification(member.id, title, message, "package", pkg.id)
        notifications.push(notification)
      }
    }

    return { success: true, notifications }
  } catch (error) {
    console.error("Error in checkAndNotifyPackageExpirations:", error)
    return { success: false, error }
  }
}

// ฟังก์ชันตรวจสอบและแจ้งเตือนโควต้า WiFi
export async function checkAndNotifyWiFiQuota(): Promise<any> {
  try {
    console.log("Checking for WiFi quota alerts")
    const supabase = getSupabaseClient()

    // ในที่นี้จะเป็นโค้ดที่ตรวจสอบโควต้า WiFi ที่เหลือน้อยและส่งการแจ้งเตือน
    // ตัวอย่างเช่น ดึงข้อมูลผู้ใช้ที่มีโควต้า WiFi เหลือน้อยกว่า 10%
    const { data: lowQuotaUsers, error } = await supabase
      .from("wifi_quotas")
      .select("*, members(id, name, email)")
      .lt("remaining_percentage", 10)
      .gt("remaining_percentage", 0)

    if (error) {
      console.error("Error checking for low WiFi quotas:", error)
      return { success: false, error }
    }

    // ส่งการแจ้งเตือนสำหรับแต่ละผู้ใช้ที่มีโควต้าเหลือน้อย
    const notifications = []
    for (const quota of lowQuotaUsers || []) {
      const member = quota.members
      if (member) {
        const title = "โควต้า WiFi ของคุณเหลือน้อย"
        const message = `โควต้า WiFi ของคุณเหลือเพียง ${quota.remaining_percentage}% กรุณาอัพเกรดแพ็คเกจหรือซื้อโควต้าเพิ่มเติม`

        const notification = await createUserNotification(member.id, title, message, "wifi", quota.id)
        notifications.push(notification)
      }
    }

    return { success: true, notifications }
  } catch (error) {
    console.error("Error in checkAndNotifyWiFiQuota:", error)
    return { success: false, error }
  }
}

// ฟังก์ชันแจ้งเตือนผู้ใช้เมื่อเลือกแพ็คเกจ
export async function notifyUserOfPackageSelection(
  memberId: string,
  packageId: string,
  packageName: string,
): Promise<any> {
  try {
    console.log(`Notifying user ${memberId} of package selection: ${packageName}`)

    const title = "คุณได้เลือกแพ็คเกจใหม่"
    const message = `คุณได้เลือกแพ็คเกจ ${packageName} โปรดรอการยืนยันจากผู้ดูแลระบบ`

    // สร้างการแจ้งเตือนใหม่
    return await createUserNotification(memberId, title, message, "package", packageId)
  } catch (error) {
    console.error("Error in notifyUserOfPackageSelection:", error)
    return null
  }
}

// ฟังก์ชันแจ้งเตือนผู้ใช้เมื่อสถานะแพ็คเกจเปลี่ยนแปลง
export async function notifyUserOfPackageStatusChange(
  memberId: string,
  packageId: string,
  packageName: string,
  newStatus: string,
): Promise<any> {
  try {
    console.log(`Notifying user ${memberId} of package status change to ${newStatus}`)

    // สร้างข้อความแจ้งเตือนตามสถานะใหม่
    let title = "แพ็คเกจของคุณมีการเปลี่ยนแปลง"
    let message = `แพ็คเกจ ${packageName} ของคุณได้เปลี่ยนสถานะเป็น ${newStatus}`

    if (newStatus === "active") {
      title = "แพ็คเกจของคุณได้รับการยืนยันแล้ว"
      message = `แพ็คเกจ ${packageName} ของคุณได้รับการยืนยันและเปิดใช้งานแล้ว`
    } else if (newStatus === "expired") {
      title = "แพ็คเกจของคุณหมดอายุแล้ว"
      message = `แพ็คเกจ ${packageName} ของคุณหมดอายุแล้ว กรุณาต่ออายุหรือเลือกแพ็คเกจใหม่`
    } else if (newStatus === "cancelled") {
      title = "แพ็คเกจของคุณถูกยกเลิก"
      message = `แพ็คเกจ ${packageName} ของคุณถูกยกเลิก`
    }

    // สร้างการแจ้งเตือนใหม่
    return await createUserNotification(memberId, title, message, "package", packageId)
  } catch (error) {
    console.error("Error in notifyUserOfPackageStatusChange:", error)
    return null
  }
}
