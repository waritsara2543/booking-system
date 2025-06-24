"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Header } from "@/components/header";

interface BookingData {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  name: string;
  email: string;
  status: string;
  room_name: string;
  room_id: string;
  notes?: string;
}

// สถานะการจองเรียงตามลำดับ
const STATUS_ORDER = {
  pending: 0,
  confirmed: 1,
  cancelled: 2,
};

export default function BookingDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/bookings/${id}`);

        if (!response.ok) {
          console.error(
            "API error response:",
            response.status,
            response.statusText
          );
          throw new Error(
            response.status === 404
              ? "Booking not found"
              : "Failed to fetch booking data"
          );
        }

        const data = await response.json();
        setBooking(data);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching booking data:", err);
        setError(
          err.message || "An error occurred while fetching booking data"
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBookingData();
    }
  }, [id]);

  const openStatusDialog = (status: string) => {
    console.log("Opening status dialog for:", status);
    setSelectedStatus(status);
    setNotes("");
    setDialogOpen(true);
  };

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === booking?.status) return;

    try {
      setUpdatingStatus(true);
      console.log("Updating status to:", selectedStatus, "with notes:", notes);

      // ใช้ API endpoint ที่มีอยู่แล้ว
      const response = await fetch(`/api/bookings`, {
        method: "PUT", // ใช้ PUT แทน POST
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: id, // ส่ง id ของการจอง
          status: selectedStatus, // สถานะใหม่
          notes: notes, // ใช้ notes ตามโครงสร้างตาราง
        }),
      });

      if (!response.ok) {
        const errorMessage = `Failed to update booking status: ${response.status} ${response.statusText}`;
        console.error("API error response:", errorMessage);
        throw new Error(errorMessage);
      }

      // อัพเดตสถานะในหน้าจอ
      setBooking((prev) =>
        prev ? { ...prev, status: selectedStatus, notes } : null
      );

      toast({
        title: "สถานะอัพเดตแล้ว",
        description: `สถานะการจองถูกเปลี่ยนเป็น ${selectedStatus}`,
      });

      setDialogOpen(false);

      // รีโหลดข้อมูลการจองเพื่อให้แน่ใจว่าแสดงข้อมูลล่าสุด
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Error updating status:", err);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message || "ไม่สามารถอัพเดตสถานะได้",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ตรวจสอบว่าสถานะที่กำลังจะเปลี่ยนไปอยู่ในลำดับที่สูงกว่าสถานะปัจจุบันหรือไม่
  const canChangeToStatus = (currentStatus: string, newStatus: string) => {
    return (
      STATUS_ORDER[newStatus as keyof typeof STATUS_ORDER] >
      STATUS_ORDER[currentStatus as keyof typeof STATUS_ORDER]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "Pending";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-3/4" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-red-600">Error</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Booking Not Found</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p>
              The booking you are looking for does not exist or has been
              removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format date for display
  const formattedDate = booking.date
    ? format(new Date(booking.date), "MMMM d, yyyy")
    : "Unknown date";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-3xl font-bold">Booking Details</h1>
          </div>
          <div className="container mx-auto p-4">
            <Card>
              <CardHeader></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Booking ID</h3>
                    <p>{booking.id}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Status</h3>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(booking.status)}
                      <span
                        className={`capitalize ${
                          booking.status === "confirmed"
                            ? "text-green-600"
                            : booking.status === "pending"
                            ? "text-amber-600"
                            : booking.status === "cancelled"
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {getStatusText(booking.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Room</h3>
                    <p>{booking.room_name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Date</h3>
                    <p>{formattedDate}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Time</h3>
                    <p>
                      {booking.start_time} - {booking.end_time}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Booked By</h3>
                    <p>{booking.name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Contact Email</h3>
                    <p>{booking.email}</p>
                  </div>
                  {booking.notes && (
                    <div className="col-span-2">
                      <h3 className="font-semibold">Notes</h3>
                      <p className="whitespace-pre-wrap">{booking.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {/* แสดงปุ่ม Confirm เฉพาะเมื่อสถานะปัจจุบันเป็น pending */}
                {booking.status === "pending" && (
                  <Button
                    variant="outline"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    onClick={() => openStatusDialog("confirmed")}
                    disabled={updatingStatus}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm
                  </Button>
                )}

                {/* แสดงปุ่ม Cancel เฉพาะเมื่อสถานะปัจจุบันเป็น pending หรือ confirmed */}
                {(booking.status === "pending" ||
                  booking.status === "confirmed") && (
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                    onClick={() => openStatusDialog("cancelled")}
                    disabled={updatingStatus}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Booking Status</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to change the status to{" "}
                    <span
                      className={`font-medium ${
                        selectedStatus === "confirmed"
                          ? "text-green-600"
                          : selectedStatus === "pending"
                          ? "text-amber-600"
                          : selectedStatus === "cancelled"
                          ? "text-red-600"
                          : ""
                      }`}
                    >
                      {selectedStatus && getStatusText(selectedStatus)}
                    </span>
                    ?
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="notes">
                      Reason for status change (required)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter reason for status change..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStatusChange}
                    disabled={updatingStatus || !notes.trim()}
                    className={
                      selectedStatus === "confirmed"
                        ? "bg-green-600 hover:bg-green-700"
                        : selectedStatus === "cancelled"
                        ? "bg-red-600 hover:bg-red-700"
                        : ""
                    }
                  >
                    {updatingStatus ? "Updating..." : "Update Status"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
