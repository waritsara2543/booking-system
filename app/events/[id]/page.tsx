"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { getSupabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in
    try {
      const storedMemberId = localStorage.getItem("memberId");
      const memberName = localStorage.getItem("memberName");

      if (storedMemberId && memberName) {
        setIsLoggedIn(true);
        setMemberId(storedMemberId);
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }

    async function fetchEventDetails() {
      if (!params.id) return;

      setIsLoading(true);
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("room_bookings")
          .select(
            `
            id,
            name,
            email,
            phone,
            date,
            start_time,
            end_time,
            purpose,
            attendees,
            notes,
            rooms!room_bookings_room_id_fkey (
              id,
              name,
              capacity,
              hourly_rate,
              description,
              image_url
            )
            `
          )
          .eq("id", params.id)
          .eq("type", "event")
          .single();

        if (error) throw error;

        if (!data) {
          router.push("/events");
          return;
        }

        setEvent(data);
      } catch (error) {
        console.error("Error fetching event details:", error);
        toast.error("Event not found");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEventDetails();
  }, [params.id, router]);

  const handleRegisterForEvent = async () => {
    if (!isLoggedIn) {
      toast.error("Please log in to register for this event");
      return;
    }

    if (!event) return;

    setIsRegistering(true);
    try {
      // Here you would implement the registration logic
      // For example, creating a record in an event_registrations table
      const supabase = getSupabase();

      // Check if already registered
      const { data: existingReg, error: checkError } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", event.id)
        .eq("member_id", memberId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingReg) {
        toast.info("You are already registered for this event");
        return;
      }

      // Register for the event
      const { error } = await supabase.from("event_registrations").insert({
        event_id: event.id,
        member_id: memberId,
        registered_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Successfully registered for the event");
    } catch (error) {
      console.error("Error registering for event:", error);
      toast.error("Failed to register for the event");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleShareEvent = () => {
    if (navigator.share) {
      navigator
        .share({
          title: event?.purpose || "Event",
          text: `Check out this event: ${event?.purpose}`,
          url: window.location.href,
        })
        .catch((error) => console.error("Error sharing:", error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.success("Event link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <div className="mb-6">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <div className="aspect-video w-full bg-muted">
                  <Skeleton className="h-full w-full" />
                </div>
                <CardHeader>
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) return null;

  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-1 px-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
          <Button variant="outline" onClick={handleShareEvent}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Event
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <div className="aspect-video relative bg-muted">
                {event.rooms.image_url ? (
                  <img
                    src={event.rooms.image_url || "/placeholder.svg"}
                    alt={event.rooms.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted">
                    <Calendar className="h-16 w-16 text-muted-foreground opacity-20" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground">
                    Event
                  </Badge>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">{event.purpose}</CardTitle>
                <CardDescription className="text-base">
                  {format(new Date(event.date), "EEEE, MMMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Time</p>
                        <p>
                          {event.start_time} - {event.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p>{event.rooms.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Users className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Capacity</p>
                        <p>{event.rooms.capacity} people</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Organized by</p>
                        <p>{event.name}</p>
                      </div>
                    </div>
                  </div>

                  {event.notes && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {event.notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Event Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {format(new Date(event.date), "MMMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">
                      {event.start_time} - {event.end_time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{event.rooms.name}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {isPastEvent ? (
                  <Button disabled className="w-full">
                    Event has ended
                  </Button>
                ) : isLoggedIn ? (
                  <Button
                    className="w-full"
                    onClick={handleRegisterForEvent}
                    disabled={isRegistering}
                  >
                    {isRegistering ? "Registering..." : "Register for Event"}
                  </Button>
                ) : (
                  <div className="space-y-2 w-full">
                    <Link
                      href={`/login?redirect=${encodeURIComponent(
                        window.location.pathname
                      )}`}
                    >
                      <Button className="w-full">Login to Register</Button>
                    </Link>
                    <p className="text-xs text-center text-muted-foreground">
                      You need to be logged in to register for events
                    </p>
                  </div>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      <footer className="border-t py-6 mt-12">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Booking System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
