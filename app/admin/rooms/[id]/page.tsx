"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import Cookies from "js-cookie"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const roomSchema = z.object({
  name: z.string().min(2, {
    message: "Room name must be at least 2 characters.",
  }),
  capacity: z.coerce.number().min(1, {
    message: "Capacity must be at least 1.",
  }),
  hourly_rate: z.coerce.number().min(0, {
    message: "Hourly rate must be a positive number.",
  }),
  description: z.string().optional(),
  image_url: z.string().optional(),
})

type RoomFormValues = z.infer<typeof roomSchema>

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === "new"
  const roomId = isNew ? null : (params.id as string)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: "",
      capacity: 1,
      hourly_rate: 0,
      description: "",
      image_url: "",
    },
  })

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    if (!isNew) {
      fetchRoomDetails()
    } else {
      setIsLoading(false)
    }
  }, [router, isNew])

  async function fetchRoomDetails() {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single()

      if (error) throw error

      if (!data) {
        throw new Error("Room not found")
      }

      // Set form values
      form.reset({
        name: data.name,
        capacity: data.capacity,
        hourly_rate: data.hourly_rate,
        description: data.description || "",
        image_url: data.image_url || "",
      })
    } catch (err) {
      console.error("Error fetching room details:", err)
      setError("Failed to load room details")
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(values: RoomFormValues) {
    try {
      setIsSaving(true)
      setError(null)

      if (isNew) {
        // Create new room
        const { data, error } = await supabase.from("rooms").insert([values]).select()

        if (error) throw error

        toast.success("Room created successfully")
        router.push("/admin/rooms")
      } else {
        // Update existing room
        const { error } = await supabase.from("rooms").update(values).eq("id", roomId)

        if (error) throw error

        toast.success("Room updated successfully")
        router.push("/admin/rooms")
      }
    } catch (err) {
      console.error("Error saving room:", err)
      setError("Failed to save room")
      toast.error("Failed to save room")
    } finally {
      setIsSaving(false)
    }
  }

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
            <h1 className="text-3xl font-bold">{isNew ? "Add New Room" : "Edit Room"}</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{isNew ? "Create a new meeting room" : "Edit meeting room details"}</CardTitle>
              <CardDescription>
                {isNew ? "Add a new meeting room to your booking system." : "Update the details of this meeting room."}
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
                  <Button variant="outline" onClick={fetchRoomDetails}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Conference Room A" {...field} />
                          </FormControl>
                          <FormDescription>The name of the meeting room as it will appear to users.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormDescription>Maximum number of people the room can accommodate.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="hourly_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Rate (฿)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <FormDescription>Cost per hour in Thai Baht for booking this room.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the room, its features, and available equipment..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Provide details about the room's features and equipment.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/room-image.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            URL to an image of the room. Leave blank if no image is available.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/admin/rooms")}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isNew ? (
                  "Create Room"
                ) : (
                  "Update Room"
                )}
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  )
}
