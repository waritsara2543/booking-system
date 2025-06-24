"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format, addDays, startOfDay } from "date-fns"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, CalendarIcon, ArrowLeft, ChevronDown } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getSupabase, getRooms, isMember, getTimeSlotAvailable } from "@/lib/supabase"
import type { Room } from "@/types/booking"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import Link from "next/link"
import { z } from "zod"
import { checkAuthStatus } from "@/lib/auth-utils"

// Import custom components
import { RoomSelectionGrid } from "@/components/room-selection-grid"
import { RoomDetailsCard } from "@/components/room-details-card"
import { AuthDialog } from "@/components/auth-dialog"
import { AuthGuard } from "@/components/auth-guard"

// Function to fetch member details by member ID
async function fetchMemberDetails(memberId: string) {
  const supabase = getSupabase()
  try {
    const { data, error } = await supabase
      .from("members")
      .select("name, email, phone")
      .eq("member_id", memberId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching member details:", error)
    return null
  }
}

// Function to check if user has pending bookings
async function checkPendingBookings(memberId: string) {
  const supabase = getSupabase()
  try {
    const { data, error } = await supabase
      .from("room_bookings")
      .select("id")
      .eq("member_id", memberId)
      .eq("status", "pending")
      .limit(1)

    if (error) throw error
    return data && data.length > 0
  } catch (error) {
    console.error("Error checking pending bookings:", error)
    return false
  }
}

// Form validation schema
const formSchema = z
  .object({
    memberId: z.string().optional(),
    name: z.string().min(2, {
      message: "Name must be at least 2 characters.",
    }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    phone: z.string().min(5, {
      message: "Please enter a valid phone number.",
    }),
    purpose: z.string().min(2, {
      message: "Please enter the purpose of the meeting.",
    }),
    attendees: z.coerce.number().min(1, {
      message: "Number of attendees must be at least 1.",
    }),
    notes: z.string().optional(),
    paymentMethod: z.string({
      required_error: "Please select a payment method.",
    }),
  })
  .refine(
    (data) => {
      return true
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  )

function NewBookingPageContent() {
  const router = useRouter()

  // State for rooms and selection
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [pendingRoomSelection, setPendingRoomSelection] = useState<Room | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    memberId: "",
    name: "",
    email: "",
    phone: "",
    purpose: "",
    attendees: 1,
    notes: "",
    paymentMethod: "cash",
    type: "regular", // Add this new field with default value
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Date and time selection state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [startTime, setStartTime] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")

  // Other state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [memberVerified, setMemberVerified] = useState<boolean | null>(null)
  const [showMemberWarning, setShowMemberWarning] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [bookingDetails, setBookingDetails] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [startTimeOptions, setStartTimeOption] = useState<
    {
      startTime: string
      enabled: boolean
    }[]
  >([])
  const [endTimeOptions, setEndTimeOption] = useState<{ endTime: string; enabled: boolean }[]>([])
  const [existingBookings, setExistingBookings] = useState<{ start_time: string; end_time: string }[]>([])
  const [validEndTimes, setValidEndTimes] = useState<string[]>([])
  const [memberFieldsReadOnly, setMemberFieldsReadOnly] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [hasPendingBooking, setHasPendingBooking] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Load rooms on component mount
  useEffect(() => {
    async function loadRooms() {
      setIsLoading(true)
      try {
        const roomsData = await getRooms()
        setRooms(roomsData)
      } catch (error) {
        console.error("Error loading rooms:", error)
        toast.error("Failed to load meeting rooms")
      } finally {
        setIsLoading(false)
      }
    }

    loadRooms()

    // ตรวจสอบสถานะการล็อกอินโดยใช้ฟังก์ชันใหม่
    const { isLoggedIn: loggedIn, isAdmin: admin, memberId } = checkAuthStatus()

    console.log("New Booking - Auth status:", { loggedIn, admin, memberId })

    setIsLoggedIn(loggedIn)
    setIsAdmin(admin)

    // ถ้าล็อกอินแล้ว ดึงข้อมูลจาก localStorage
    if (loggedIn && !admin && memberId) {
      try {
        const memberName = localStorage.getItem("memberName")
        const memberEmail = localStorage.getItem("memberEmail")
        const memberPhone = localStorage.getItem("memberPhone")

        if (memberId && memberName && memberEmail) {
          setFormData((prev) => ({
            ...prev,
            memberId: memberId,
            name: memberName,
            email: memberEmail,
            phone: memberPhone || prev.phone,
          }))
          setMemberVerified(true)
          setMemberFieldsReadOnly(true)

          // ตรวจสอบว่าผู้ใช้มีการจองที่รอการยืนยันหรือไม่
          checkPendingBookings(memberId).then((hasPending) => {
            setHasPendingBooking(hasPending)
          })
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error)
      }
    }
  }, [])

  // Handle room selection
  const handleRoomSelect = (room: Room) => {
    // Check if user is logged in
    if (!isLoggedIn && !isAdmin) {
      setPendingRoomSelection(room)
      setShowAuthDialog(true)
      return
    }

    // Check if user has pending bookings
    if (hasPendingBooking) {
      toast.error("You already have a pending booking. Please wait for confirmation before making another booking.")
      return
    }

    setSelectedRoom(room)

    // Set default date if not already set
    if (!selectedDate) {
      const tomorrow = addDays(new Date(), 1)
      setSelectedDate(tomorrow)
    }

    // Reset time selections
    setStartTime("")
    setEndTime("")
  }

  // Handle auth dialog close
  const handleAuthDialogClose = () => {
    setShowAuthDialog(false)
    setPendingRoomSelection(null)
  }

  // Load time slots when date or room changes
  useEffect(() => {
    async function getTime() {
      if (!selectedDate || !selectedRoom) return

      const formattedDate = format(selectedDate, "yyyy-MM-dd")
      const roomId = selectedRoom.id

      setIsCheckingAvailability(true)

      try {
        // Get existing bookings for this room and date
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from("room_bookings")
          .select("start_time, end_time")
          .eq("room_id", roomId)
          .eq("date", formattedDate)
          .neq("status", "cancelled")

        if (error) {
          console.error("Error fetching existing bookings:", error)
          toast.error("Failed to check room availability")
          return
        }

        setExistingBookings(data || [])

        // Get available time slots
        const result = await getTimeSlotAvailable(roomId, formattedDate)

        // If booking for today, filter out past times
        const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

        if (isToday) {
          const currentTime = new Date()
          const currentHour = currentTime.getHours()
          const currentMinute = currentTime.getMinutes()

          // Format current time as HH:MM for comparison
          const currentTimeString = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`

          // Filter start times that are in the future
          const filteredStartTimeOptions = result.startTimeOptions.map((option) => ({
            ...option,
            enabled: option.enabled && option.startTime > currentTimeString,
          }))

          setStartTimeOption(filteredStartTimeOptions)
        } else {
          setStartTimeOption(result.startTimeOptions)
        }

        setEndTimeOption(result.endTimeOptions)
      } catch (error) {
        console.error("Error checking availability:", error)
        toast.error("Failed to check room availability")
      } finally {
        setIsCheckingAvailability(false)
      }
    }

    if (selectedRoom && selectedDate) {
      getTime()
    }
  }, [selectedRoom, selectedDate])

  // Update valid end times when start time changes
  useEffect(() => {
    if (!startTime) {
      setValidEndTimes([])
      return
    }

    // Filter end times that are after the selected start time
    const validTimes = endTimeOptions.filter((option) => option.endTime > startTime).map((option) => option.endTime)

    // Check for overlapping bookings
    const filteredTimes = validTimes.filter((endTime) => {
      // Check if booking with this start and end time would overlap with any existing booking
      return !existingBookings.some((booking) => {
        // Skip if the booking starts at or after our end time
        if (booking.start_time >= endTime) return false

        // Skip if the booking ends at or before our start time
        if (booking.end_time <= startTime) return false

        // Otherwise, there's an overlap
        return true
      })
    })

    setValidEndTimes(filteredTimes)

    // If current end time is invalid, reset it
    if (endTime && !filteredTimes.includes(endTime)) {
      setEndTime("")
    }
  }, [startTime, endTimeOptions, existingBookings])

  // Fetch member details when member ID changes
  useEffect(() => {
    async function getMemberDetails() {
      const memberId = formData.memberId

      if (memberId && memberId.length === 7) {
        const supabase = getSupabase()
        const memberDetails = await fetchMemberDetails(memberId)

        if (memberDetails) {
          // Update form with member details
          setFormData((prev) => ({
            ...prev,
            memberId: memberId,
            name: memberDetails.name,
            email: memberDetails.email,
            phone: memberDetails.phone || "",
          }))
          setMemberVerified(true)
          setMemberFieldsReadOnly(true) // Make fields read-only when member details are retrieved
        } else {
          // Reset fields if member not found and they're currently read-only
          if (memberFieldsReadOnly) {
            setFormData((prev) => ({
              ...prev,
              name: "",
              email: "",
              phone: "",
            }))
            setMemberFieldsReadOnly(false)
          }
          setMemberVerified(false)
        }
      } else if (memberId === "" && memberFieldsReadOnly) {
        // Reset fields if member ID is cleared and fields are read-only
        setFormData((prev) => ({
          ...prev,
          name: "",
          email: "",
          phone: "",
        }))
        setMemberFieldsReadOnly(false)
        setMemberVerified(null)
      }
    }

    getMemberDetails()
  }, [formData.memberId, memberFieldsReadOnly])

  // Verify member ID when it changes
  useEffect(() => {
    async function verifyMember() {
      const memberId = formData.memberId

      if (memberId) {
        const verified = await isMember(memberId)
        setMemberVerified(verified)
        setShowMemberWarning(!verified)
      } else {
        setMemberVerified(null)
        setShowMemberWarning(false)
      }
    }

    verifyMember()
  }, [formData.memberId])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert("File size exceeds 5MB limit")
        toast.error("File size exceeds 5MB limit")
        return
      }
      setSelectedFile(file)
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Format dates for display
  const formatSelectedDate = (date: Date | null) => {
    if (!date) return "No date selected"
    return format(date, "PPP")
  }

  // Get today and tomorrow for date validation
  const today = startOfDay(new Date())
  const tomorrow = startOfDay(addDays(today, 1))

  // Check if a booking would overlap with existing bookings
  const checkBookingOverlap = (startTime: string, endTime: string) => {
    return existingBookings.some((booking) => {
      // Skip if the booking starts at or after our end time
      if (booking.start_time >= endTime) return false

      // Skip if the booking ends at or before our start time
      if (booking.end_time <= startTime) return false

      // Otherwise, there's an overlap
      return true
    })
  }

  // Reset room selection
  const handleBackToRooms = () => {
    setSelectedRoom(null)
    setStartTime("")
    setEndTime("")
  }

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {}

    // Validate required fields
    if (!formData.name || formData.name.length < 2) {
      errors.name = "Name must be at least 2 characters."
    }

    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address."
    }

    if (!formData.phone || formData.phone.length < 5) {
      errors.phone = "Please enter a valid phone number (minimum 5 digits)."
    }

    if (!formData.purpose || formData.purpose.length < 2) {
      errors.purpose = "Please enter the purpose of the meeting."
    }

    if (!selectedDate) {
      errors.date = "Please select a booking date."
    }

    if (!startTime) {
      errors.startTime = "Please select a start time."
    }

    if (!endTime) {
      errors.endTime = "Please select an end time."
    }

    if (!formData.paymentMethod) {
      errors.paymentMethod = "Please select a payment method."
    }

    // Check if attendees is a valid number
    const attendees = Number(formData.attendees)
    if (isNaN(attendees) || attendees < 1) {
      errors.attendees = "Number of attendees must be at least 1."
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    if (hasPendingBooking && formData.memberId) {
      toast.error("You already have a pending booking. Please wait for confirmation before making another booking.")
      return
    }

    if (!selectedRoom || !selectedDate) {
      toast.error("Please select a room and date")
      return
    }

    setIsSubmitting(true)
    setDebugInfo(null)

    try {
      // Format the selected date
      const formattedDate = format(selectedDate, "yyyy-MM-dd")

      // Final check for booking overlap
      if (checkBookingOverlap(startTime, endTime)) {
        throw new Error("This time slot overlaps with an existing booking. Please select a different time.")
      }

      // Check if the time slot is available
      const supabase = getSupabase()

      // Rest of the function remains the same...
      let attachmentUrl = null

      // Upload attachment if selected
      if (selectedFile) {
        try {
          const fileExt = selectedFile.name.split(".").pop()
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `attachments/${fileName}`

          // Ensure the booking-attachments bucket exists
          const { data: buckets } = await supabase.storage.listBuckets()
          if (!buckets?.some((bucket) => bucket.name === "booking-attachments")) {
            await supabase.storage.createBucket("booking-attachments", {
              public: true,
            })
            console.log("Created booking-attachments bucket")
          }

          // Upload file to Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("booking-attachments")
            .upload(filePath, selectedFile, {
              cacheControl: "3600",
              upsert: true,
            })

          if (uploadError) {
            console.error("File upload error:", uploadError)
            throw uploadError
          }

          // Get public URL of the uploaded file
          const {
            data: { publicUrl },
          } = supabase.storage.from("booking-attachments").getPublicUrl(filePath)

          // Set attachment URL
          attachmentUrl = publicUrl
        } catch (error) {
          console.error("File upload error:", error)
          toast.error("Failed to upload attachment. Continuing without attachment.")
        }
      }

      // Create booking object
      const bookingData = {
        member_id: formData.memberId || null,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        room_id: selectedRoom.id,
        date: formattedDate,
        start_time: startTime,
        end_time: endTime,
        purpose: formData.purpose,
        attendees: Number(formData.attendees),
        notes: formData.notes || null,
        payment_method: formData.paymentMethod,
        attachment_url: attachmentUrl,
        status: "pending",
        type: isAdmin ? formData.type : "regular", // Add this line
      }

      console.log("Submitting booking data:", bookingData) // Debug log

      // ใช้ API endpoint ที่ถูกต้อง
      let result
      try {
        console.log("Sending booking data to API:", JSON.stringify(bookingData))

        const response = await fetch("/api/bookings/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        })

        console.log("API response status:", response.status, response.statusText)

        if (!response.ok) {
          // ถ้า response ไม่สำเร็จ
          let errorMessage = `Server error: ${response.status} ${response.statusText}`

          try {
            // พยายามอ่านข้อความข้อผิดพลาดจาก response
            const errorData = await response.json()
            console.error("API error response:", errorData)
            errorMessage = errorData.error || errorData.details || errorMessage
          } catch (parseError) {
            // ถ้าไม่สามารถอ่านเป็น JSON ได้ ให้อ่านเป็น text
            try {
              const errorText = await response.text()
              console.error("API error response (Text):", errorText)
              errorMessage = errorText || errorMessage
            } catch (textError) {
              console.error("Could not parse error response:", textError)
            }
          }

          throw new Error(errorMessage)
        }

        // อ่านข้อมูล response
        try {
          result = await response.json()
          console.log("API response data:", result)

          if (!result || !result.success) {
            throw new Error("API returned unsuccessful response")
          }

          // ตั้งค่าข้อมูลสำหรับ modal
          setBookingDetails({
            room_name: selectedRoom.name,
            booking_date: format(selectedDate, "MMMM d, yyyy"),
            booking_time: `${startTime} - ${endTime}`,
            purpose: formData.purpose,
          })

          // แสดง modal ยืนยัน
          setShowConfirmation(true)
        } catch (parseError) {
          console.error("Error parsing API response:", parseError)
          throw new Error("Could not parse server response")
        }

        // บันทึกข้อมูลผู้ใช้ใน localStorage
        try {
          localStorage.setItem("memberId", formData.memberId || "")
          localStorage.setItem("memberName", formData.name)
          localStorage.setItem("memberEmail", formData.email)
          localStorage.setItem("memberPhone", formData.phone)
        } catch (storageError) {
          console.error("Error storing member info:", storageError)
          // Continue anyway, as this is just for convenience
        }

        toast.success("Thanks! Your booking has been received and is pending approval")
      } catch (err) {
        console.error("API call error:", err)
        toast.error(
          err instanceof Error ? err.message : "An error occurred while creating your booking. Please try again.",
        )
        setIsSubmitting(false)
        return
      }

      // ไม่ต้องส่งอีเมลอีกครั้ง เพราะ API จะจัดการให้แล้ว
    } catch (err: any) {
      console.error("Booking error:", err)
      toast.error(err.message || "An error occurred while creating your booking. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleConfirmationClose() {
    setShowConfirmation(false)
    setIsSubmitting(false)
    router.push("/")
  }

  const paymentMethods = [
    { value: "cash", label: "Cash" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ]

  const bookingTypes = [
    { value: "regular", label: "Regular" },
    { value: "event", label: "Event" },
    { value: "other", label: "Other" },
  ]

  // Handle date picker button click
  const handleDatePickerButtonClick = (e: React.MouseEvent) => {
    if (e) {
      e.preventDefault() // Prevent form submission
      e.stopPropagation() // Stop event propagation
    }
    setDatePickerOpen(!datePickerOpen)
  }

  // Handle back to admin dashboard
  const handleBackToAdmin = () => {
    router.push("/admin")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        {!selectedRoom ? (
          <>
            <div className="flex flex-col space-y-4 mb-6">
              {isAdmin && (
                <div className="w-full flex justify-start mb-4">
                  <Button
                    variant="default"
                    onClick={handleBackToAdmin}
                    className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Admin Dashboard
                  </Button>
                </div>
              )}
              <div className="flex justify-center items-center">
                <h1 className="text-3xl font-bold">Select a Meeting Room</h1>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <span className="ml-3">Loading rooms...</span>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, staggerChildren: 0.1 }}
                >
                  <RoomSelectionGrid rooms={rooms} onSelectRoom={handleRoomSelect} />
                </motion.div>
              </AnimatePresence>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              {isAdmin ? (
                <Button
                  variant="default"
                  onClick={handleBackToAdmin}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin Dashboard
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleBackToRooms} className="flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Rooms
                </Button>
              )}
              <h1 className="text-3xl font-bold">Book {selectedRoom.name}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="lg:col-span-2"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl">Book a Meeting Room</CardTitle>
                    <CardDescription>Fill out the form below to schedule a meeting room.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSubmit(e)
                      }}
                      className="space-y-4 sm:space-y-6"
                    >
                      {!isLoggedIn && !isAdmin && (
                        <Alert className="mb-6 bg-blue-50 border-blue-200">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Not logged in</AlertTitle>
                          <AlertDescription className="text-blue-700">
                            Please{" "}
                            <Link href="/login" className="font-medium underline">
                              log in
                            </Link>{" "}
                            or{" "}
                            <Link href="/register" className="font-medium underline">
                              register
                            </Link>{" "}
                            to create a booking. Logging in will allow you to track and manage your bookings.
                          </AlertDescription>
                        </Alert>
                      )}
                      {showMemberWarning && (
                        <Alert variant="warning" className="bg-amber-50 border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800">Member ID not found</AlertTitle>
                          <AlertDescription className="text-amber-700">
                            The member ID you entered is not valid.{" "}
                            <Link href="/register" className="font-medium underline">
                              Register as a member
                            </Link>{" "}
                            to receive benefits.
                          </AlertDescription>
                        </Alert>
                      )}

                      {hasPendingBooking && (
                        <Alert variant="warning" className="bg-amber-50 border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertTitle className="text-amber-800">Pending Booking</AlertTitle>
                          <AlertDescription className="text-amber-700">
                            You already have a pending booking. You can only make one booking at a time until it's
                            confirmed.
                          </AlertDescription>
                        </Alert>
                      )}

                      {debugInfo && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Debug Information</AlertTitle>
                          <AlertDescription>
                            <pre className="text-xs overflow-auto max-h-40">{debugInfo}</pre>
                          </AlertDescription>
                        </Alert>
                      )}

                      <motion.div
                        className="grid gap-4 md:grid-cols-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="memberId">Member ID (Optional)</Label>
                          <Input
                            id="memberId"
                            name="memberId"
                            placeholder="Enter member ID if available"
                            value={formData.memberId}
                            onChange={handleInputChange}
                            maxLength={7}
                          />
                          {memberVerified === true && (
                            <p className="text-xs text-muted-foreground">Member verified ✓</p>
                          )}
                          {formErrors.memberId && <p className="text-xs text-destructive">{formErrors.memberId}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="name">Your Name</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={handleInputChange}
                            readOnly={memberFieldsReadOnly}
                            className={memberFieldsReadOnly ? "bg-muted cursor-not-allowed" : ""}
                          />
                          {memberFieldsReadOnly && (
                            <p className="text-xs text-muted-foreground">Member information retrieved automatically</p>
                          )}
                          {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                        </div>
                      </motion.div>

                      <motion.div
                        className="grid gap-4 md:grid-cols-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            name="email"
                            placeholder="your.email@example.com"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            readOnly={memberFieldsReadOnly}
                            className={memberFieldsReadOnly ? "bg-muted cursor-not-allowed" : ""}
                          />
                          <p className="text-xs text-muted-foreground">
                            Must be a valid email format (e.g., name@example.com)
                          </p>
                          {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            name="phone"
                            placeholder="Your phone number"
                            value={formData.phone}
                            onChange={handleInputChange}
                            readOnly={memberFieldsReadOnly}
                            className={memberFieldsReadOnly ? "bg-muted cursor-not-allowed" : ""}
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter your phone number in any format (minimum 5 digits)
                          </p>
                          {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
                        </div>
                      </motion.div>

                      <div className="space-y-2">
                        <Label htmlFor="date">Booking Date</Label>
                        <div className="relative">
                          <motion.button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setDatePickerOpen(!datePickerOpen)
                            }}
                            className={cn(
                              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                              "cursor-pointer",
                            )}
                            whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {selectedDate ? (
                              <span className="flex items-center">
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {formatSelectedDate(selectedDate)}
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                Select booking date
                              </span>
                            )}
                            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                          </motion.button>

                          {datePickerOpen && (
                            <div className="absolute z-50 mt-1 w-auto bg-popover p-0 border-2 rounded-lg shadow-lg">
                              <div className="p-3 border-b bg-muted/20">
                                <h3 className="font-medium text-center">Select Booking Date</h3>
                              </div>
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  setSelectedDate(date)
                                  setDatePickerOpen(false)
                                  // Reset time selections when date changes
                                  setStartTime("")
                                  setEndTime("")
                                }}
                                disabled={(date) => {
                                  // Only disable past dates, allow current date
                                  return date < today
                                }}
                              />
                              <div className="p-3 border-t bg-muted/20 flex justify-between items-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const today = new Date()
                                    setSelectedDate(today)
                                    setDatePickerOpen(false)
                                    setStartTime("")
                                    setEndTime("")
                                  }}
                                >
                                  Today
                                </Button>
                                <div className="text-xs text-muted-foreground">
                                  {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "No date selected"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        {selectedDate && format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && (
                          <p className="text-xs text-amber-600">
                            Note: For bookings today, only future time slots are available.
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Select a date for your booking. You can book for today or any future date.
                        </p>
                        {formErrors.date && <p className="text-xs text-destructive">{formErrors.date}</p>}
                      </div>

                      {selectedDate && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            {isCheckingAvailability && (
                              <div className="text-sm text-muted-foreground flex items-center">
                                <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2"></div>
                                Checking availability...
                              </div>
                            )}
                          </div>

                          <motion.div
                            className="grid gap-4 md:grid-cols-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          >
                            <div className="space-y-2">
                              <Label htmlFor="startTime">Start Time</Label>
                              <Select
                                value={startTime}
                                onValueChange={(value) => {
                                  setStartTime(value)
                                  // Reset end time when start time changes
                                  setEndTime("")
                                }}
                              >
                                <SelectTrigger id="startTime">
                                  <SelectValue placeholder="Select start time" />
                                </SelectTrigger>
                                <SelectContent position="popper" align="start" side="bottom">
                                  {startTimeOptions.map((time) => (
                                    <SelectItem key={time.startTime} value={time.startTime} disabled={!time.enabled}>
                                      {time.startTime}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {formErrors.startTime && (
                                <p className="text-xs text-destructive">{formErrors.startTime}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="endTime">End Time</Label>
                              <Select value={endTime} onValueChange={setEndTime} disabled={!startTime}>
                                <SelectTrigger id="endTime">
                                  <SelectValue
                                    placeholder={!startTime ? "Select start time first" : "Select end time"}
                                  />
                                </SelectTrigger>
                                <SelectContent position="popper" align="start" side="bottom">
                                  {validEndTimes.map((endTime) => (
                                    <SelectItem key={endTime} value={endTime}>
                                      {endTime}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {formErrors.endTime && <p className="text-xs text-destructive">{formErrors.endTime}</p>}
                            </div>
                          </motion.div>
                        </div>
                      )}

                      <motion.div
                        className="grid gap-4 md:grid-cols-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="purpose">Meeting Purpose</Label>
                          <Input
                            id="purpose"
                            name="purpose"
                            placeholder="e.g., Team Standup, Client Meeting"
                            value={formData.purpose}
                            onChange={handleInputChange}
                          />
                          {formErrors.purpose && <p className="text-xs text-destructive">{formErrors.purpose}</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="attendees">Number of Attendees</Label>
                          <Input
                            id="attendees"
                            name="attendees"
                            type="number"
                            min={1}
                            value={formData.attendees}
                            onChange={handleInputChange}
                          />
                          {formErrors.attendees && <p className="text-xs text-destructive">{formErrors.attendees}</p>}
                        </div>
                      </motion.div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Additional Notes</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          placeholder="Any special requirements or setup instructions"
                          className="resize-none"
                          value={formData.notes}
                          onChange={handleInputChange}
                        />
                        {formErrors.notes && <p className="text-xs text-destructive">{formErrors.notes}</p>}
                      </div>

                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select
                          value={formData.paymentMethod}
                          onValueChange={(value) => {
                            setFormData((prev) => ({
                              ...prev,
                              paymentMethod: value,
                            }))
                          }}
                        >
                          <SelectTrigger id="paymentMethod">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method.value} value={method.value}>
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors.paymentMethod && (
                          <p className="text-xs text-destructive">{formErrors.paymentMethod}</p>
                        )}
                      </motion.div>

                      {isAdmin && (
                        <motion.div
                          className="space-y-2"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <Label htmlFor="bookingType">Booking Type</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) => {
                              setFormData((prev) => ({
                                ...prev,
                                type: value,
                              }))
                            }}
                          >
                            <SelectTrigger id="bookingType">
                              <SelectValue placeholder="Select booking type" />
                            </SelectTrigger>
                            <SelectContent>
                              {bookingTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Admin only: Specify the type of booking</p>
                        </motion.div>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-col space-y-1.5">
                          <Label htmlFor="dropzone-file">Attachment (Optional)</Label>
                          <div className="flex items-center justify-center w-full">
                            <motion.label
                              htmlFor="dropzone-file"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 dark:hover:bg-muted/70"
                              whileHover={{ backgroundColor: "rgba(0,0,0,0.1)" }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg
                                  className="w-6 h-6 mb-2 text-muted-foreground"
                                  aria-hidden="true"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 20 16"
                                >
                                  <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                                  />
                                </svg>
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-semibold">Click to upload</span> (Max: 5MB)
                                </p>
                                {selectedFile && (
                                  <p className="mt-1 text-xs font-medium">Selected: {selectedFile.name}</p>
                                )}
                              </div>
                              <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
                            </motion.label>
                          </div>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                  <CardFooter className="border-t pt-4 sm:pt-6 flex flex-col sm:flex-row justify-between gap-2">
                    {isAdmin ? (
                      <Button variant="outline" onClick={handleBackToAdmin} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleBackToRooms} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                    )}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isCheckingAvailability}
                        className="w-full sm:w-auto"
                      >
                        {isSubmitting ? "Creating..." : "Create Booking"}
                      </Button>
                    </motion.div>
                  </CardFooter>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-1"
              >
                <RoomDetailsCard room={selectedRoom} className="sticky top-6" />
              </motion.div>
            </div>
          </>
        )}
      </main>

      {/* Authentication Dialog */}
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={handleAuthDialogClose}
        packageName={pendingRoomSelection ? pendingRoomSelection.name : "Room"}
      />

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <Dialog
            open={showConfirmation}
            onOpenChange={(open) => {
              if (!open) {
                handleConfirmationClose()
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <DialogHeader>
                  <DialogTitle>Booking Submitted!</DialogTitle>
                  <DialogDescription>Your meeting room booking has been submitted.</DialogDescription>
                </DialogHeader>

                {bookingDetails && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Room:</div>
                      <div>{bookingDetails.room_name}</div>

                      <div className="font-medium">Date:</div>
                      <div>{bookingDetails.booking_date}</div>

                      <div className="font-medium">Time:</div>
                      <div>{bookingDetails.booking_time}</div>

                      <div className="font-medium">Purpose:</div>
                      <div>{bookingDetails.purpose}</div>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertTitle className="text-blue-800">Booking Submitted</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        Your booking has been submitted and is pending admin confirmation. You will receive a
                        confirmation notification once an administrator approves your booking.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <DialogFooter>
                  <div className="flex gap-2">
                    {isAdmin ? (
                      <Button
                        onClick={() => {
                          setShowConfirmation(false)
                          setIsSubmitting(false)
                          router.push("/admin")
                        }}
                      >
                        Go to Admin Dashboard
                      </Button>
                    ) : (
                      <Button onClick={handleConfirmationClose}>Go to Home</Button>
                    )}
                  </div>
                </DialogFooter>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function NewBookingPage() {
  return (
    <AuthGuard>
      <NewBookingPageContent />
    </AuthGuard>
  )
}
