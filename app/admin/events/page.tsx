"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  Loader2,
  Search,
  RefreshCw,
  Trash2,
  UserCheck,
  UserX,
  FileSpreadsheet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateExcel, downloadExcel } from "@/lib/excel-utils";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type memberRegistered = {
  id: string;
  event_id: string;
  member_id: string;
  created_at: string;
  registered_at: string;
  members: Member;
  room_bookings: RoomBooking;
};
type Member = {
  id: string;
  member_id: string;
  name: string;
  email: string;
  phone: string;
  position?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
  verified: boolean;
  created_at: string;
};
type RoomBooking = {
  id: string;
  attachment_url?: string | null;
  date: string;
  email: string;
  phone: string;
  room_id: string;
  start_time: string;
  end_time: string;
  member_id: string | null;
  name: string;
  status: string;
  notes?: string | null;
  payment_method?: string | null;
  purpose?: string | null;
  created_at: string;
  rooms: {
    id: string;
    name: string;
  };
};

export default function UserManagementPage() {
  const router = useRouter();
  const [membersRegistered, setMembersRegistered] = useState<
    memberRegistered[]
  >([]);
  const [filteredMembers, setFilteredMembers] = useState<memberRegistered[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [events, setEvents] = useState<RoomBooking[]>([]);
  const [eventSelected, setEventSelected] = useState<string>("all");

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin");
    if (adminCookie !== "true") {
      router.push("/admin-login");
      return;
    }

    fetchEventRegistrations();
    fetchAllEvent();
  }, [router]);

  useEffect(() => {
    let filtered = membersRegistered;

    if (eventSelected !== "all") {
      filtered = filtered.filter((member) => member.event_id === eventSelected);
    }

    if (searchTerm.trim() !== "") {
      const lowercasedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (member) =>
          member.members.name.toLowerCase().includes(lowercasedSearch) ||
          member.member_id.toLowerCase().includes(lowercasedSearch)
      );
    }

    setFilteredMembers(filtered);
  }, [eventSelected, membersRegistered, searchTerm]);

  async function fetchEventRegistrations() {
    try {
      setIsLoading(true);
      setError(null);

      // Get all members
      const { data: membersData, error: membersError } = await supabase
        .from("event_registrations")
        .select(
          `*, members(*) , room_bookings(*, rooms!fk_room (id, name    ))`
        )
        .order("registered_at", { ascending: false });

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembersRegistered([]);
        setFilteredMembers([]);
        setIsLoading(false);
        return;
      }

      setMembersRegistered(membersData as unknown as memberRegistered[]);
      setFilteredMembers(membersData as unknown as memberRegistered[]);
    } catch (err) {
      console.error("Error fetching members:", err);
      setError("Failed to load members");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExportExcel() {
    try {
      setIsExporting(true);

      // Prepare data for Excel
      const data = filteredMembers.map((member) => ({
        Event: member.room_bookings.name,
        "Room Name": member.room_bookings?.rooms?.name || "N/A",
        "Event Date": format(
          new Date(member.room_bookings.date),
          "MMM d, yyyy"
        ),
        "Event Time": `${member.room_bookings.start_time} - ${member.room_bookings.end_time}`,
        Name: member.members.name,
        "Member ID": member.member_id,
        Email: member.members.email,
        Phone: member.members.phone,
        Status: member.members.verified ? "Verified" : "Unverified",
        "Registered At": format(new Date(member.registered_at), "MMM d, yyyy"),
      }));

      // Generate Excel with members data
      const title = `User Management Report - ${format(
        new Date(),
        "MMM d, yyyy"
      )}`;
      const wb = generateExcel(data, title, [
        { header: "Event", key: "Event", width: 20 },
        { header: "Room Name", key: "Room Name", width: 20 },
        { header: "Event Date", key: "Event Date", width: 15 },
        { header: "Event Time", key: "Event Time", width: 20 },
        { header: "Name", key: "Name", width: 25 },
        { header: "Member ID", key: "Member ID", width: 15 },
        { header: "Email", key: "Email", width: 30 },
        { header: "Phone", key: "Phone", width: 15 },
        { header: "Status", key: "Status", width: 12 },
        { header: "Registered At", key: "Registered At", width: 15 },
      ]);

      // Create summary data
      const summaryData = [
        ["User Event Registration Report"],
        ["Generated on", format(new Date(), "MMM d, yyyy 'at' h:mm a")],
        [""],
        ["Total Users", filteredMembers.length],
      ];

      const verifiedCount = filteredMembers.filter(
        (m) => m.members.verified
      ).length;
      summaryData.push(["Verified Users", verifiedCount]);
      summaryData.push([
        "Unverified Users",
        filteredMembers.length - verifiedCount,
      ]);

      // Create a worksheet for the summary using the correct XLSX utility function
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

      // Set column widths for summary
      summaryWs["!cols"] = [{ wch: 20 }, { wch: 20 }];

      // Add the summary worksheet to the workbook using the correct XLSX utility function
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Download the Excel file
      downloadExcel(
        wb,
        `users-event-registration-${format(new Date(), "yyyy-MM-dd")}.xlsx`
      );

      toast.success("User report exported successfully as Excel");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast.error("Failed to export Excel");
    } finally {
      setIsExporting(false);
    }
  }

  async function fetchAllEvent() {
    try {
      setIsLoadingEvents(true);

      // Get all events
      const { data: eventsData, error: eventsError } = await supabase
        .from("room_bookings")
        .select(`*, rooms!fk_room (id, name    )`)
        .eq("type", "event")
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        setIsLoadingEvents(false);
        return;
      }

      setEvents(eventsData as unknown as RoomBooking[]);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setIsLoadingEvents(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Event Registration</h1>
              <p className="text-muted-foreground">
                Manage event registrations and their details.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground absolute right-2" />
                <Input
                  type="text"
                  placeholder="Search by name or ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="relative">
                <Select value={eventSelected} onValueChange={setEventSelected}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Events</SelectItem>
                      {events.map((event) => (
                        <SelectItem
                          key={event.id}
                          value={event.id}
                          onSelect={() => {}}
                        >
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchEventRegistrations}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="sr-only">Refresh</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={isExporting || filteredMembers.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export Excel"}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registered Users</CardTitle>
              <CardDescription>
                View and manage all registered users in your system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchEventRegistrations}>
                    Try Again
                  </Button>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "No users match your search"
                      : "No registered users found"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Name</TableHead>
                          <TableHead>Room Name</TableHead>
                          <TableHead>Event Date</TableHead>
                          <TableHead>Event Time</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Member ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Registered At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              {member.room_bookings.name || "N/A"}
                            </TableCell>
                            <TableCell>
                              {member.room_bookings?.rooms?.name || "N/A"}
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(member.room_bookings.date),
                                "MMM d, yyyy"
                              )}
                            </TableCell>
                            <TableCell>
                              {`${member.room_bookings.start_time} - ${member.room_bookings.end_time}`}
                            </TableCell>
                            <TableCell className="font-medium">
                              {member.members.name || "N/A"}
                            </TableCell>
                            <TableCell>{member.member_id}</TableCell>
                            <TableCell>
                              {member.members.email || "N/A"}
                            </TableCell>
                            <TableCell>
                              {member.members.phone || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  member.members.verified
                                    ? "default"
                                    : "outline"
                                }
                                className={
                                  member.members.verified
                                    ? "bg-green-500 hover:bg-green-500/80"
                                    : ""
                                }
                              >
                                {member.members.verified
                                  ? "Verified"
                                  : "Unverified"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(member.registered_at),
                                "MMM d, yyyy"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {filteredMembers.length > 0 && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Showing {filteredMembers.length} of {membersRegistered.length}{" "}
                  users
                  {searchTerm && " (filtered)"}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
