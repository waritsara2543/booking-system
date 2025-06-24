"use client"
import { createClient as supabaseCreateClient } from "@supabase/supabase-js"

// Create a lazy-loaded client to avoid initialization during build
let supabaseClient: ReturnType<typeof supabaseCreateClient> | null = null

// Function to get the Supabase client, creating it if it doesn't exist
export const getSupabase = () => {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if we're in a browser environment and have the required env vars
  if (typeof window !== "undefined" && supabaseUrl && supabaseKey) {
    try {
      supabaseClient = supabaseCreateClient(supabaseUrl, supabaseKey)
      console.log("Supabase client initialized")
      return supabaseClient
    } catch (error) {
      console.error("Error initializing Supabase client:", error)
    }
  }

  // For server-side or when env vars are missing, return a mock client or throw a clearer error
  if (process.env.NODE_ENV === "development") {
    console.warn("Supabase client not initialized: Missing environment variables or running on server")
  }

  // Return a mock client that won't break the build but will log errors if used
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: new Error("Supabase client not initialized") }),
        }),
      }),
    }),
    storage: {
      listBuckets: () => Promise.resolve({ data: [], error: null }),
      createBucket: () => Promise.resolve({ data: null, error: null }),
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: new Error("Supabase client not initialized") }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
    // Add other methods as needed
  } as any
}

// For backward compatibility
export const supabase = new Proxy({} as ReturnType<typeof supabaseCreateClient>, {
  get: (target, prop) => {
    const client = getSupabase()
    return client[prop as keyof typeof client]
  },
})

// For backward compatibility
export const createClient = () => {
  return getSupabase()
}

// Update the ensureStorageBuckets function to handle errors gracefully
export async function ensureStorageBuckets() {
  try {
    const client = getSupabase()
    const { data: buckets, error } = await client.storage.listBuckets()

    if (error) {
      console.error("Error listing storage buckets:", error)
      return false
    }

    // Check for profile-pictures bucket
    if (!buckets?.some((bucket) => bucket.name === "profile-pictures")) {
      await client.storage.createBucket("profile-pictures", {
        public: true,
      })
      console.log("Created profile-pictures bucket")
    }

    // Check for membership-cards bucket
    if (!buckets?.some((bucket) => bucket.name === "membership-cards")) {
      await client.storage.createBucket("membership-cards", {
        public: true,
      })
      console.log("Created membership-cards bucket")
    }

    // Check for booking-attachments bucket
    if (!buckets?.some((bucket) => bucket.name === "booking-attachments")) {
      await client.storage.createBucket("booking-attachments", {
        public: true,
      })
      console.log("Created booking-attachments bucket")
    }

    return true
  } catch (error) {
    console.error("Error ensuring storage buckets exist:", error)
    return false
  }
}

export async function getRooms() {
  try {
    const client = getSupabase()
    const { data, error } = await client.from("rooms").select("*")

    if (error) {
      console.error("Error fetching rooms:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error getting rooms:", error)
    return []
  }
}

export async function isMember(memberId: string): Promise<boolean> {
  try {
    const client = getSupabase()
    const { data, error } = await client.from("members").select("id").eq("member_id", memberId).maybeSingle()

    if (error) {
      console.error("Error checking member:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("Error checking member:", error)
    return false
  }
}

export const generateMemberId = (): string => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let memberId = ""
  // Generate exactly 7 characters
  for (let i = 0; i < 7; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    memberId += characters[randomIndex]
  }
  return memberId
}

// Get all available time slots for a room on a specific date
export async function getAvailableTimeSlots(roomId: string, date: string) {
  try {
    // Get all bookings for the room on the specified date
    const client = getSupabase()
    const { data: bookings, error } = await client
      .from("room_bookings")
      .select("start_time, end_time")
      .eq("room_id", roomId)
      .eq("date", date)
      .neq("status", "cancelled")

    if (error) {
      console.error("Error fetching bookings:", error)
      return []
    }

    // Define all possible time slots (half-hourly from 8 AM to 8 PM)
    const allTimeSlots = []
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startHour = hour.toString().padStart(2, "0")
        const startMinute = minute.toString().padStart(2, "0")

        let endHour = hour
        let endMinute = minute + 30

        if (endMinute >= 60) {
          endHour += 1
          endMinute = 0
        }

        const start = `${startHour}:${startMinute}`
        const end = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`

        allTimeSlots.push({
          start,
          end,
        })
      }
    }

    // Add the last slot ending at 20:00
    allTimeSlots.push({
      start: "19:30",
      end: "20:00",
    })

    // Filter out booked slots
    return allTimeSlots.filter((slot) => {
      // Check if this slot overlaps with any existing booking
      return !bookings.some((booking) => {
        // Check for overlap conditions - allowing back-to-back bookings
        return (
          // New booking starts during existing booking (but not exactly at the end)
          (slot.start >= booking.start_time && slot.start < booking.end_time) ||
          // New booking ends during existing booking (but not exactly at the start)
          (slot.end > booking.start_time && slot.end < booking.end_time) ||
          // New booking completely contains existing booking
          (slot.start < booking.start_time && slot.end > booking.end_time)
        )
      })
    })
  } catch (error) {
    console.error("Error getting available time slots:", error)
    return []
  }
}

// Completely revised function to check if a time slot is available
export async function getTimeSlotAvailable(roomId: string, date: string) {
  try {
    if (!roomId || !date) {
      return { startTimeOptions: [], endTimeOptions: [] }
    }
    // Direct query to check for overlapping bookings
    const client = getSupabase()
    const { data, error } = await client
      .from("room_bookings")
      .select("start_time, end_time, date")
      .eq("room_id", roomId)
      .eq("date", date)
      .neq("status", "cancelled")

    if (error) {
      console.error("Error checking time slot availability:", error)
      return { startTimeOptions: [], endTimeOptions: [] }
    }

    // Generate all possible time slots
    const startTimeOptions = []
    const endTimeOptions = []

    // Create a map of booked times for easier lookup
    const bookedTimes = new Map()

    // Mark all times that are within a booking as booked
    for (const booking of data) {
      const startTime = booking.start_time
      const endTime = booking.end_time

      // Convert to minutes for easier comparison
      const startMinutes = timeToMinutes(startTime)
      const endMinutes = timeToMinutes(endTime)

      // Mark all times within the booking as booked
      for (let min = startMinutes; min < endMinutes; min += 30) {
        const time = minutesToTime(min)
        bookedTimes.set(time, true)
      }
    }

    // Generate all possible time slots
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`

        // A time is available as a start time if it's not within a booking
        const isStartTimeBooked = bookedTimes.has(timeStr)
        startTimeOptions.push({ startTime: timeStr, enabled: !isStartTimeBooked })

        // A time is available as an end time if it's not within a booking
        const isEndTimeBooked = bookedTimes.has(timeStr)
        endTimeOptions.push({ endTime: timeStr, enabled: !isEndTimeBooked })
      }
    }

    // Add 20:00 as a possible end time
    endTimeOptions.push({ endTime: "20:00", enabled: !bookedTimes.has("20:00") })

    return { startTimeOptions, endTimeOptions }
  } catch (error) {
    console.error("Error checking time slot availability:", error)
    return { startTimeOptions: [], endTimeOptions: [] }
  }
}

// Helper function to convert time string to minutes
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number)
  return hours * 60 + minutes
}

// Helper function to convert minutes to time string
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

export type RoomBooking = {
  id: string
  member_id?: string
  name: string
  email: string
  phone: string
  room_id: string
  date: string // Single date for booking
  start_time: string
  end_time: string
  purpose: string
  attendees: number
  notes?: string
  payment_method: string
  attachment_url?: string
  status: "pending" | "confirmed" | "cancelled"
}
