"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminStats } from "@/components/admin-stats";

import { BookingsOverviewChart } from "@/components/bookings-overview-chart";
import { PackagesOverviewChart } from "@/components/packages-overview-chart";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Loader2, Calendar, PlusCircle } from "lucide-react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { generateBookingsExcel, downloadExcel } from "@/lib/excel-utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import * as XLSX from "xlsx";
import Link from "next/link";
import MemberPackagesOverview from "@/components/member-packages-overview";
import RecentBookings from "@/components/recent-bookings";

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin");
    if (adminCookie !== "true") {
      router.push("/admin-login");
      return;
    }

    setIsAdmin(true);
    fetchReportData();
  }, [router, dateRange]);

  async function fetchReportData() {
    try {
      setIsLoading(true);

      if (!dateRange.from || !dateRange.to) return;

      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");

      // Fetch bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("room_bookings")
        .select(
          `
          id,
          name,
          email,
          date,
          start_time,
          end_time,
          purpose,
          status,
          room_id,
          created_at
        `
        )
        .gte("date", `${fromDate} 00:00:00`)
        .lte("date", `${toDate} 23:59:59`)
        .order("date", { ascending: true });

      if (bookingsError) throw bookingsError;

      // Get room details for the bookings
      if (bookingsData && bookingsData.length > 0) {
        const roomIds = [
          ...new Set(bookingsData.map((booking) => booking.room_id)),
        ];
        const { data: roomsData, error: roomsError } = await supabase
          .from("rooms")
          .select("id, name")
          .in("id", roomIds);

        if (roomsError) throw roomsError;

        // Create a map of room IDs to room names
        const roomMap = new Map();
        if (roomsData) {
          roomsData.forEach((room) => {
            roomMap.set(room.id, room.name);
          });
        }

        // Combine the data
        const processedBookings = bookingsData.map((booking) => ({
          ...booking,
          room_name: roomMap.get(booking.room_id) || "Unknown Room",
        }));

        setBookings(processedBookings);
      } else {
        setBookings([]);
      }

      // Fetch packages data - using the correct column names
      const { data: packagesData, error: packagesError } = await supabase
        .from("member_packages")
        .select(
          `
          id,
          member_id,
          package_id,
          payment_status,
          start_date,
          end_date,
          created_at,
          packages(name, price, duration_days, description)
        `
        )
        .gte("created_at", `${fromDate} 00:00:00`)
        .lte("created_at", `${toDate} 23:59:59`)
        .order("created_at", { ascending: false });

      if (packagesError) throw packagesError;
      setPackages(packagesData || []);
    } catch (err) {
      console.error("Error fetching report data:", err);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  }

  function handleExportExcel(dataType = "bookings") {
    try {
      setIsExportingExcel(true);

      // Generate Excel with appropriate data based on data type
      let title, filename, wb;

      switch (dataType) {
        case "rooms":
          title = `Room Usage Report: ${format(
            dateRange.from || new Date(),
            "MMM d, yyyy"
          )} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`;
          filename = `room-usage-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
          wb = generateBookingsExcel(bookings, title, "rooms");
          break;
        case "packages":
          title = `Package Report: ${format(
            dateRange.from || new Date(),
            "MMM d, yyyy"
          )} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`;
          filename = `packages-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
          wb = generatePackageExcel(packages, title);
          break;
        default: // bookings
          title = `Booking Report: ${format(
            dateRange.from || new Date(),
            "MMM d, yyyy"
          )} - ${format(dateRange.to || new Date(), "MMM d, yyyy")}`;
          filename = `bookings-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
          wb = generateBookingsExcel(bookings, title, "overview");
      }

      // Download the Excel with appropriate filename
      downloadExcel(wb, filename);

      toast.success(
        `${
          dataType.charAt(0).toUpperCase() + dataType.slice(1)
        } data exported successfully as Excel`
      );
    } catch (error) {
      console.error(`Error exporting ${dataType} data:`, error);
      toast.error(`Failed to export ${dataType} data`);
    } finally {
      setIsExportingExcel(false);
    }
  }

  // Function to generate Excel for package data
  function generatePackageExcel(packages, title) {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Format the data for Excel
    const formattedData = packages.map((pkg) => ({
      ID: pkg.id,
      "Member ID": pkg.member_id,
      "Package Name": pkg.packages?.name || "Unknown Package",
      "Payment Status":
        pkg.payment_status.charAt(0).toUpperCase() +
        pkg.payment_status.slice(1),
      "Start Date": pkg.start_date
        ? format(new Date(pkg.start_date), "yyyy-MM-dd")
        : "N/A",
      "End Date": pkg.end_date
        ? format(new Date(pkg.end_date), "yyyy-MM-dd")
        : "N/A",
      Price: pkg.packages?.price || "N/A",
      "Duration (days)": pkg.packages?.duration_days || "N/A",
      "Created At": format(new Date(pkg.created_at), "yyyy-MM-dd HH:mm:ss"),
    }));

    // Create a worksheet from the data
    const ws = XLSX.utils.json_to_sheet(formattedData);

    // Set column widths
    const colWidths = [
      { wch: 10 }, // ID
      { wch: 15 }, // Member ID
      { wch: 25 }, // Package Name
      { wch: 15 }, // Payment Status
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 10 }, // Price
      { wch: 15 }, // Duration
      { wch: 20 }, // Created At
    ];
    ws["!cols"] = colWidths;

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Packages");

    // Create a summary worksheet
    const summaryData = [
      { Metric: "Total Packages", Value: packages.length },
      {
        Metric: "Active Packages",
        Value: packages.filter(
          (p) =>
            p.payment_status === "confirmed" &&
            new Date(p.end_date) >= new Date()
        ).length,
      },
      {
        Metric: "Pending Packages",
        Value: packages.filter((p) => p.payment_status === "pending").length,
      },
      {
        Metric: "Expired Packages",
        Value: packages.filter(
          (p) =>
            p.payment_status === "confirmed" &&
            new Date(p.end_date) < new Date()
        ).length,
      },
      {
        Metric: "Report Generated",
        Value: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      },
      { Metric: "Report Type", Value: "Package Report" },
    ];

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }];

    // Add the summary worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    return wb;
  }

  function handleDateRangeSelect(range: string) {
    const today = new Date();

    switch (range) {
      case "today":
        setDateRange({ from: today, to: today });
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        setDateRange({ from: yesterday, to: yesterday });
        break;
      case "last7days":
        setDateRange({ from: subDays(today, 6), to: today });
        break;
      case "last30days":
        setDateRange({ from: subDays(today, 29), to: today });
        break;
      case "thisMonth":
        setDateRange({
          from: startOfMonth(today),
          to: endOfMonth(today),
        });
        break;
      case "thisWeek":
        setDateRange({
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 }),
        });
        break;
      default:
        break;
    }
  }

  if (isLoading && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your booking system and monitor activity.
              </p>
            </div>
          </div>

          <Tabs
            defaultValue="overview"
            className="space-y-4"
            onValueChange={setActiveTab}
          >
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
              </TabsList>

              <Link
                href="/new"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-green-600 text-white hover:bg-green-700"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Booking
              </Link>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <AdminStats />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MemberPackagesOverview />
                <RecentBookings />
              </div>
            </TabsContent>

            {/* Reports & Analytics Tab */}
            <TabsContent value="reports" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Reports & Analytics
                  </h2>
                  <p className="text-muted-foreground">
                    View and analyze booking data and trends.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={handleDateRangeSelect}
                    defaultValue="last30days"
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="thisWeek">This Week</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="last7days">Last 7 Days</SelectItem>
                      <SelectItem value="last30days">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[240px] justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Reports content - removed tabs */}
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Bookings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {bookings.length}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            During selected period
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Confirmed Bookings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {
                              bookings.filter((b) => b.status === "confirmed")
                                .length
                            }
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(
                              (bookings.filter((b) => b.status === "confirmed")
                                .length /
                                bookings.length) *
                                100 || 0
                            ).toFixed(1)}
                            % of total
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Canceled Bookings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {
                              bookings.filter((b) => b.status === "cancelled")
                                .length
                            }
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(
                              (bookings.filter((b) => b.status === "cancelled")
                                .length /
                                bookings.length) *
                                100 || 0
                            ).toFixed(1)}
                            % of total
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Unique Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {new Set(bookings.map((b) => b.email)).size}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Made bookings during this period
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Booking Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Distribution</CardTitle>
                    <CardDescription>
                      Overview of booking status distribution and top rooms
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="flex flex-col justify-center items-center text-center gap-4 h-full">
                        <div className="text-muted-foreground">
                          No booking data available for the selected period
                        </div>
                      </div>
                    ) : (
                      <BookingsOverviewChart bookings={bookings} />
                    )}
                  </CardContent>
                </Card>

                {/* Package Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Package Distribution</CardTitle>
                    <CardDescription>
                      Overview of package purchases and status distribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[400px]">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : packages.length === 0 ? (
                      <div className="flex flex-col justify-center items-center text-center gap-4 h-full">
                        <div className="text-muted-foreground">
                          No package data available for the selected period
                        </div>
                      </div>
                    ) : (
                      <PackagesOverviewChart packages={packages} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
