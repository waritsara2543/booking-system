import { supabaseServer } from "@/lib/supabase-server"

import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    
    const { id } = await params
    if (!id) {
      return new NextResponse("Booking ID is required", { status: 400 })
    }

    const { data: booking, error } = await supabaseServer.from("room_bookings").select(`*, rooms!fk_room (
      id,
      name    )`).eq("id", id).single()

    if (error) {
      console.error("Supabase error:", error)
      return new NextResponse("Failed to fetch booking", { status: 500 })
    }

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 })
    }

    return NextResponse.json(booking)
  } catch (error: any) {
    console.error("Route error:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return new NextResponse("Booking ID is required", { status: 400 })
    }

    const { data, error } = await supabaseServer.from("room_bookings").delete().eq("id", id)

    if (error) {
      console.error("Supabase error:", error)
      return new NextResponse("Failed to delete booking", { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Route error:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    if (!id) {
      return new NextResponse("Booking ID is required", { status: 400 })
    }

    const { data, error } = await supabaseServer.from("room_bookings").update(body).eq("id", id).select()

    if (error) {
      console.error("Supabase error:", error)
      return new NextResponse("Failed to update booking", { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Route error:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
