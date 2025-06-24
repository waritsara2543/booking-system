"use client"

import Link from "next/link"
import { ModeToggle } from "./mode-toggle"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Calendar,
  Home,
  LayoutDashboard,
  List,
  PlusCircle,
  LogIn,
  UserPlus,
  Menu,
  History,
  UserCircle,
  Package,
} from "lucide-react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { NotificationBell } from "./notification-bell"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { checkAuthStatus, clearAuthData, checkPageAccess } from "@/lib/auth-utils"

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [memberName, setMemberName] = useState<string | null>(null)
  const [adminUsername, setAdminUsername] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // ตรวจสอบสถานะการล็อกอินเมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    setIsMounted(true)

    // ใช้ฟังก์ชันใหม่เพื่อตรวจสอบสถานะการล็อกอิน
    const { isLoggedIn: loggedIn, isAdmin: admin, memberId } = checkAuthStatus()

    console.log("Header - Auth status:", { loggedIn, admin, memberId })

    setIsLoggedIn(loggedIn)
    setIsAdmin(admin)

    // ดึงข้อมูลเพิ่มเติมจาก localStorage
    if (loggedIn) {
      try {
        if (admin) {
          const adminUsername = localStorage.getItem("adminUsername") || "Admin"
          setAdminUsername(adminUsername)
        } else if (memberId) {
          const memberName = localStorage.getItem("memberName")
          setMemberName(memberName)
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error)
      }
    }

    // ตรวจสอบสิทธิ์การเข้าถึงหน้าปัจจุบัน
    if (pathname) {
      const { hasAccess, redirectTo } = checkPageAccess(pathname)
      if (!hasAccess && redirectTo) {
        console.log(`Unauthorized access to ${pathname} - redirecting to ${redirectTo}`)
        router.push(redirectTo)
      }
    }
  }, [pathname, router])

  // ฟังก์ชันสำหรับล็อกเอาต์
  const handleLogout = () => {
    try {
      // ใช้ฟังก์ชันใหม่เพื่อล้างข้อมูลการล็อกอิน
      clearAuthData()

      // รีเซ็ตสถานะ
      setIsLoggedIn(false)
      setIsAdmin(false)
      setMemberName(null)
      setAdminUsername(null)

      // นำทางกลับไปหน้าหลัก
      window.location.href = "/"
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  // Don't render anything during SSR to prevent hydration mismatch
  if (!isMounted) {
    return <header className="border-b h-16"></header>
  }

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/new", label: "New Booking" },
    { href: "/events", label: "Event" },
    { href: "/packages", label: "Packages" },
  ]

  const loggedInNavItems = [
    { href: "/my-bookings", label: "My Bookings" },
    { href: "/profile", label: "My Profile" },
  ]

  return (
    <header className="border-b sticky top-0 z-10 glass-effect">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-6 w-6 accent-orange" />
          <span className="hidden sm:inline">Booking System</span>
        </Link>

        {/* Mobile menu */}
        <div className="md:hidden ml-auto flex items-center gap-4">
          {isAdmin && <NotificationBell />}
          {/* ลบ UserNotificationBell ออกจากที่นี่ */}

          <Link href="/new">
            <Button size="sm" variant="default" className="btn-orange">
              <PlusCircle className="h-4 w-4 mr-2" />
              Book
            </Button>
          </Link>

          <Link href="/events">
            <Button size="sm" variant="outline" className="border-accent-blue">
              <Calendar className="h-4 w-4 mr-2 accent-blue" />
              Event
            </Button>
          </Link>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[300px] glass-effect">
              <div className="flex flex-col gap-4 py-4">
                {/* Only show admin links if admin is logged in */}
                {isAdmin ? (
                  <>
                    <SheetClose asChild>
                      <Link href="/admin">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <LayoutDashboard className="h-4 w-4 mr-2 accent-blue" />
                          Admin Dashboard
                        </Button>
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link href="/bookings">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <List className="h-4 w-4 mr-2 accent-orange" />
                          Bookings
                        </Button>
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link href="/calendar">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <Calendar className="h-4 w-4 mr-2 accent-blue" />
                          Calendar
                        </Button>
                      </Link>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link href="/">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <Home className="h-4 w-4 mr-2 accent-orange" />
                          Home
                        </Button>
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link href="/new">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <PlusCircle className="h-4 w-4 mr-2 accent-orange" />
                          New Booking
                        </Button>
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link href="/events">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <Calendar className="h-4 w-4 mr-2 accent-blue" />
                          Event
                        </Button>
                      </Link>
                    </SheetClose>

                    <SheetClose asChild>
                      <Link href="/packages">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <Package className="h-4 w-4 mr-2 accent-blue" />
                          Packages
                        </Button>
                      </Link>
                    </SheetClose>
                  </>
                )}

                {isLoggedIn && (
                  <>
                    <SheetClose asChild>
                      <Link href="/my-bookings">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <History className="h-4 w-4 mr-2 accent-orange" />
                          My Bookings
                        </Button>
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/profile">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <UserCircle className="h-4 w-4 mr-2 accent-blue" />
                          My Profile
                        </Button>
                      </Link>
                    </SheetClose>
                  </>
                )}

                {isLoggedIn ? (
                  <>
                    <div className="px-3 py-2 text-sm text-muted-foreground">Hello, {memberName}</div>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="justify-start w-full border-accent-orange"
                      >
                        Logout
                      </Button>
                    </SheetClose>
                  </>
                ) : !isAdmin ? (
                  <>
                    <SheetClose asChild>
                      <Link href="/login">
                        <Button variant="ghost" size="sm" className="justify-start w-full">
                          <LogIn className="h-4 w-4 mr-2 accent-blue" />
                          Login
                        </Button>
                      </Link>
                    </SheetClose>
                    {/* Remove the admin login button as it's now combined */}
                    <SheetClose asChild>
                      <Link href="/register">
                        <Button variant="outline" size="sm" className="justify-start w-full border-accent-orange">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Register
                        </Button>
                      </Link>
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="justify-start w-full border-accent-orange"
                    >
                      Logout
                    </Button>
                  </SheetClose>
                )}

                {isAdmin && <div className="px-3 py-2 text-sm text-muted-foreground">Admin: {adminUsername}</div>}

                <div className="flex justify-center mt-2">
                  <ModeToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop navigation */}
        <nav className="ml-auto hidden md:flex items-center gap-6">
          {/* Show regular user navigation only if not an admin */}
          {!isAdmin && (
            <>
              {navItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary relative group",
                      pathname === item.href ? "accent-orange" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                    <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#ff7b00] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  </Link>
                </motion.div>
              ))}

              {isLoggedIn &&
                loggedInNavItems.map((item, index) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "text-sm font-medium transition-colors hover:text-primary relative group",
                        pathname === item.href ? "accent-blue" : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                      <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#0066ff] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                    </Link>
                  </motion.div>
                ))}
            </>
          )}

          {/* Move notification bells here for better visibility */}
          {isAdmin && <NotificationBell />}
          {/* ลบ UserNotificationBell ออกจากที่นี่ */}

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Hello, {memberName}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-accent-orange btn-glow">
                Logout
              </Button>
            </div>
          ) : !isAdmin ? (
            <>
              <div className="flex flex-col gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="btn-blue">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              </div>
              {/* Remove the admin login button as it's now combined */}
              <Link href="/register">
                <Button variant="outline" size="sm" className="border-accent-orange btn-glow">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register
                </Button>
              </Link>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-accent-orange btn-glow">
              Logout
            </Button>
          )}

          {isAdmin && <span className="text-sm text-muted-foreground">Admin: {adminUsername}</span>}

          <ModeToggle />
        </nav>
      </div>
    </header>
  )
}
