import Cookies from "js-cookie"

// ฟังก์ชันสำหรับตั้งค่า cookie และ localStorage พร้อมกัน
export function setAuthData(memberId: string, memberName: string, memberEmail: string, memberPhone = "") {
  // ตั้งค่า localStorage
  try {
    localStorage.setItem("memberId", memberId)
    localStorage.setItem("memberName", memberName)
    localStorage.setItem("memberEmail", memberEmail)
    localStorage.setItem("memberPhone", memberPhone)
  } catch (error) {
    console.error("Error setting localStorage:", error)
  }

  // ตั้งค่า cookie
  Cookies.set("memberId", memberId, {
    expires: 7,
    path: "/",
    sameSite: "lax",
  })

  // ส่งคืนค่าเพื่อยืนยันว่าการตั้งค่าสำเร็จ
  return { success: true, memberId }
}

// ฟังก์ชันสำหรับตั้งค่า admin cookie
export function setAdminData(username: string) {
  Cookies.set("isAdmin", "true", {
    expires: 7,
    path: "/",
    sameSite: "lax",
  })
  Cookies.set("adminUsername", username, {
    expires: 7,
    path: "/",
    sameSite: "lax",
  })

  return { success: true, username }
}

// ฟังก์ชันสำหรับล้างข้อมูลการล็อกอิน
export function clearAuthData() {
  // ล้าง localStorage
  try {
    localStorage.removeItem("memberId")
    localStorage.removeItem("memberName")
    localStorage.removeItem("memberEmail")
    localStorage.removeItem("memberPhone")
  } catch (error) {
    console.error("Error clearing localStorage:", error)
  }

  // ล้าง cookies
  Cookies.remove("memberId", { path: "/" })
  Cookies.remove("isAdmin", { path: "/" })
  Cookies.remove("adminUsername", { path: "/" })

  return { success: true }
}

// ฟังก์ชันสำหรับตรวจสอบสถานะการล็อกอิน
export function checkAuthStatus() {
  const isAdmin = Cookies.get("isAdmin") === "true"
  const memberId = Cookies.get("memberId")
  const isLoggedIn = isAdmin || !!memberId

  // ถ้าไม่มี cookie แต่มีข้อมูลใน localStorage ให้ตั้งค่า cookie ใหม่
  if (!memberId) {
    try {
      const storedMemberId = localStorage.getItem("memberId")
      const storedMemberName = localStorage.getItem("memberName")
      const storedMemberEmail = localStorage.getItem("memberEmail")
      const storedMemberPhone = localStorage.getItem("memberPhone") || ""

      if (storedMemberId && storedMemberName && storedMemberEmail) {
        // ตั้งค่า cookie ใหม่
        setAuthData(storedMemberId, storedMemberName, storedMemberEmail, storedMemberPhone)
        return { isLoggedIn: true, isAdmin, memberId: storedMemberId }
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
    }
  }

  return { isLoggedIn, isAdmin, memberId }
}

// ฟังก์ชันสำหรับตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงหน้านี้หรือไม่
export function checkPageAccess(pathname: string) {
  const { isLoggedIn, isAdmin } = checkAuthStatus()

  // ตรวจสอบเส้นทางที่ต้องการสิทธิ์แอดมิน
  const adminRoutes = ["/admin", "/bookings", "/calendar"]
  const isAdminRoute = adminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  // ตรวจสอบเส้นทางที่ต้องการการล็อกอิน
  const memberRoutes = ["/my-bookings", "/profile", "/new"]
  const isMemberRoute = memberRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  // ถ้าเป็นเส้นทางแอดมินและผู้ใช้ไม่ใช่แอดมิน
  if (isAdminRoute && !isAdmin) {
    return { hasAccess: false, redirectTo: `/login?tab=admin&callbackUrl=${encodeURIComponent(pathname)}` }
  }

  // ถ้าเป็นเส้นทางสมาชิกและผู้ใช้ไม่ได้ล็อกอิน
  if (isMemberRoute && !isLoggedIn) {
    return { hasAccess: false, redirectTo: `/login?callbackUrl=${encodeURIComponent(pathname)}` }
  }

  // ถ้าไม่มีเงื่อนไขใดๆ ข้างต้น แสดงว่าผู้ใช้มีสิทธิ์เข้าถึง
  return { hasAccess: true }
}
