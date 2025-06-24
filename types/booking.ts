export type Booking = {
  id: string
  name: string
  email: string
  date: Date
  time: string
  duration: number
  service: string
  notes?: string
  status: "pending" | "confirmed" | "cancelled"
}

export type MeetingRoomBooking = {
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
  type?: "regular" | "event" | "other"
}

export type Room = {
  id: string
  name: string
  capacity: number
  hourly_rate: number
  description: string
  image_url?: string
}

export type Member = {
  id: string
  member_id: string // Unique 7-character ID
  email: string
  name: string
  phone: string
  created_at: string
  verified: boolean
}

export type TimeSlot = {
  start: string
  end: string
}
