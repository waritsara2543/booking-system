import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname

  // Check if the user is an admin
  const isAdmin = request.cookies.get("isAdmin")?.value === "true"

  // Check if user is logged in as a member
  const memberId = request.cookies.get("memberId")?.value
  const isLoggedIn = isAdmin || !!memberId

  // เพิ่ม debug log เพื่อตรวจสอบค่า cookies
  console.log(`Middleware: path=${pathname}, isAdmin=${isAdmin}, memberId=${memberId}, isLoggedIn=${isLoggedIn}`)

  // ===== ADMIN ROUTES =====
  // Routes that require admin privileges
  const adminRoutes = [
    "/admin", // Admin dashboard
    "/bookings", // Bookings management
    "/calendar", // Calendar view
  ]

  // Check if the current path is an admin route or starts with an admin route
  if (adminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    if (!isAdmin) {
      console.log(`Unauthorized admin access to ${pathname} - redirecting to login`)
      return NextResponse.redirect(new URL(`/login?tab=admin&callbackUrl=${encodeURIComponent(pathname)}`, request.url))
    }
  }

  // ===== MEMBER ROUTES =====
  // Routes that require member login
  const memberRoutes = [
    "/my-bookings", // Member's bookings
    "/profile", // Member profile
    "/new", // Create new booking
  ]

  // Check if the current path is a member route or starts with a member route
  if (memberRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    if (!isLoggedIn) {
      console.log(`Unauthorized member access to ${pathname} - redirecting to login`)
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url))
    }
  }

  return NextResponse.next()
}

// Comprehensive matcher to ensure it catches all protected routes
export const config = {
  matcher: [
    // Admin routes
    "/admin",
    "/admin/:path*",
    "/bookings",
    "/bookings/:path*",
    "/calendar",
    "/calendar/:path*",

    // Member routes
    "/my-bookings",
    "/my-bookings/:path*",
    "/profile",
    "/profile/:path*",
    "/new",
    "/new/:path*",
  ],
}
