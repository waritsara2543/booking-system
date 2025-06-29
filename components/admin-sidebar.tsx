"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  FileText,
  DoorOpen,
  Wifi,
  Package,
  Mail,
  NotebookPen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const adminRoutes = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Room Management",
    href: "/admin/rooms",
    icon: DoorOpen,
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Event Registration",
    href: "/admin/events",
    icon: NotebookPen,
  },
  {
    title: "WiFi Credentials",
    href: "/admin/wifi",
    icon: Wifi,
  },
  {
    title: "Packages",
    href: "/admin/packages",
    icon: Package,
  },
  {
    title: "Member Packages",
    href: "/admin/members/packages",
    icon: Users,
  },
  {
    title: "Bookings",
    href: "/bookings",
    icon: CalendarDays,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: FileText,
  },
  {
    title: "Email Test",
    href: "/admin/email-test",
    icon: Mail,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-full">
      <div className="mt-8">
        <h3 className="px-4 text-sm font-semibold text-muted-foreground mb-2">
          Admin Navigation
        </h3>
        <nav className="space-y-1">
          {adminRoutes.map((route) => (
            <Link key={route.href} href={route.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  (pathname === route.href ||
                    (pathname === "/bookings" && route.href === "/bookings") ||
                    (pathname === "/calendar" && route.href === "/calendar")) &&
                    "bg-muted"
                )}
              >
                <route.icon className="mr-2 h-4 w-4" />
                {route.title}
              </Button>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
