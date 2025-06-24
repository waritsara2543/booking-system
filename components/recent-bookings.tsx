"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2, Eye } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Booking = {
  id: string;
  name: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: "pending" | "confirmed" | "cancelled";
  room_name: string;
  created_at: string;
};

export default function RecentBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentBookings() {
      try {
        setIsLoading(true);
        setError(null);

        // Get recent bookings
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
          .order("created_at", { ascending: false })
          .limit(3);

        if (bookingsError) throw bookingsError;

        if (!bookingsData || bookingsData.length === 0) {
          setBookings([]);
          return;
        }

        // Get room details
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
      } catch (err) {
        console.error("Error fetching recent bookings:", err);
        setError("Failed to load recent bookings");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentBookings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="pt-6">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No bookings found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
        <CardDescription>The 3 most recent booking requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.name}</TableCell>
                  <TableCell>{booking.room_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking.status === "confirmed"
                          ? "default"
                          : booking.status === "pending"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/bookings/${booking.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-right">
          <Link href="/bookings">
            <Button variant="link" size="sm">
              View all bookings →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
