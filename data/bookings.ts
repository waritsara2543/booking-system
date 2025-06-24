import type { Booking } from "@/types/booking"
import { addDays } from "date-fns"

export const services = [
  "Haircut",
  "Massage",
  "Consultation",
  "Dental Checkup",
  "Therapy Session",
  "Tutoring",
  "Personal Training",
]

export const bookings: Booking[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    date: addDays(new Date(), 1),
    time: "10:00",
    duration: 60,
    service: "Haircut",
    notes: "First time customer",
    status: "confirmed",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    date: addDays(new Date(), 2),
    time: "14:30",
    duration: 90,
    service: "Massage",
    status: "pending",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    date: addDays(new Date(), 3),
    time: "11:15",
    duration: 45,
    service: "Consultation",
    notes: "Follow-up appointment",
    status: "confirmed",
  },
  {
    id: "4",
    name: "Alice Brown",
    email: "alice@example.com",
    date: addDays(new Date(), 4),
    time: "09:00",
    duration: 60,
    service: "Dental Checkup",
    status: "confirmed",
  },
  {
    id: "5",
    name: "Charlie Wilson",
    email: "charlie@example.com",
    date: addDays(new Date(), 5),
    time: "16:00",
    duration: 120,
    service: "Therapy Session",
    notes: "Bringing support person",
    status: "cancelled",
  },
]
