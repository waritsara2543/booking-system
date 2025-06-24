"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Loader2, Search, RefreshCw, Trash2, UserCheck, UserX, FileSpreadsheet } from "lucide-react"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { toast } from "sonner"
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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { generateExcel, downloadExcel } from "@/lib/excel-utils"
import * as XLSX from "xlsx"

type Member = {
  id: string
  member_id: string
  name: string
  email: string
  phone: string
  verified: boolean
  created_at: string
  bookings_count?: number
}

export default function UserManagementPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    fetchMembers()
  }, [router])

  useEffect(() => {
    // Filter members based on search term
    if (searchTerm.trim() === "") {
      setFilteredMembers(members)
    } else {
      const lowercasedSearch = searchTerm.toLowerCase()
      const filtered = members.filter(
        (member) =>
          member.name.toLowerCase().includes(lowercasedSearch) ||
          member.email.toLowerCase().includes(lowercasedSearch) ||
          member.member_id.toLowerCase().includes(lowercasedSearch) ||
          member.phone.toLowerCase().includes(lowercasedSearch),
      )
      setFilteredMembers(filtered)
    }
  }, [searchTerm, members])

  async function fetchMembers() {
    try {
      setIsLoading(true)
      setError(null)

      // Get all members
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false })

      if (membersError) throw membersError

      if (!membersData || membersData.length === 0) {
        setMembers([])
        setFilteredMembers([])
        setIsLoading(false)
        return
      }

      // Get booking counts for each member
      const membersWithBookings = await Promise.all(
        membersData.map(async (member) => {
          const { count, error: countError } = await supabase
            .from("room_bookings")
            .select("*", { count: "exact", head: true })
            .eq("member_id", member.member_id)

          if (countError) {
            console.error(`Error getting booking count for member ${member.id}:`, countError)
            return { ...member, bookings_count: 0 }
          }

          return { ...member, bookings_count: count || 0 }
        }),
      )

      setMembers(membersWithBookings)
      setFilteredMembers(membersWithBookings)
    } catch (err) {
      console.error("Error fetching members:", err)
      setError("Failed to load members")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyMember(memberId: string, verified: boolean) {
    try {
      setIsProcessing(memberId)

      const { error } = await supabase.from("members").update({ verified }).eq("id", memberId)

      if (error) throw error

      // Update local state
      setMembers(members.map((member) => (member.id === memberId ? { ...member, verified } : member)))

      toast.success(`Member ${verified ? "verified" : "unverified"} successfully`)
    } catch (err) {
      console.error("Error updating member verification:", err)
      toast.error("Failed to update member verification status")
    } finally {
      setIsProcessing(null)
    }
  }

  async function handleDeleteMember(memberId: string) {
    try {
      setIsProcessing(memberId)

      // Find the member to get their member_id
      const member = members.find((m) => m.id === memberId)
      if (!member) {
        toast.error("Member not found")
        return
      }

      // Check if member has any bookings
      const { count, error: countError } = await supabase
        .from("room_bookings")
        .select("*", { count: "exact", head: true })
        .eq("member_id", member.member_id)

      if (countError) throw countError

      if (count && count > 0) {
        toast.error("Cannot delete member with existing bookings")
        return
      }

      // Delete the member
      const { error: deleteError } = await supabase.from("members").delete().eq("id", memberId)

      if (deleteError) throw deleteError

      toast.success("Member deleted successfully")

      // Update the members list
      setMembers(members.filter((member) => member.id !== memberId))
    } catch (err) {
      console.error("Error deleting member:", err)
      toast.error("Failed to delete member")
    } finally {
      setIsProcessing(null)
    }
  }

  async function handleExportExcel() {
    try {
      setIsExporting(true)

      // Prepare data for Excel
      const data = filteredMembers.map((member) => ({
        Name: member.name,
        "Member ID": member.member_id,
        Email: member.email,
        Phone: member.phone,
        Status: member.verified ? "Verified" : "Unverified",
        "Joined Date": format(new Date(member.created_at), "MMM d, yyyy"),
        "Bookings Count": member.bookings_count || 0,
      }))

      // Generate Excel with members data
      const title = `User Management Report - ${format(new Date(), "MMM d, yyyy")}`
      const wb = generateExcel(data, title, [
        { header: "Name", key: "Name", width: 25 },
        { header: "Member ID", key: "Member ID", width: 15 },
        { header: "Email", key: "Email", width: 30 },
        { header: "Phone", key: "Phone", width: 15 },
        { header: "Status", key: "Status", width: 12 },
        { header: "Joined Date", key: "Joined Date", width: 15 },
        { header: "Bookings Count", key: "Bookings Count", width: 15 },
      ])

      // Create summary data
      const summaryData = [
        ["User Management Summary"],
        ["Generated on", format(new Date(), "MMM d, yyyy 'at' h:mm a")],
        [""],
        ["Total Users", filteredMembers.length],
      ]

      const verifiedCount = filteredMembers.filter((m) => m.verified).length
      summaryData.push(["Verified Users", verifiedCount])
      summaryData.push(["Unverified Users", filteredMembers.length - verifiedCount])

      const totalBookings = filteredMembers.reduce((sum, member) => sum + (member.bookings_count || 0), 0)
      summaryData.push(["Total Bookings", totalBookings])

      // Create a worksheet for the summary using the correct XLSX utility function
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)

      // Set column widths for summary
      summaryWs["!cols"] = [{ wch: 20 }, { wch: 20 }]

      // Add the summary worksheet to the workbook using the correct XLSX utility function
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

      // Download the Excel file
      downloadExcel(wb, `users-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`)

      toast.success("User report exported successfully as Excel")
    } catch (error) {
      console.error("Error exporting Excel:", error)
      toast.error("Failed to export Excel")
    } finally {
      setIsExporting(false)
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
              <h1 className="text-3xl font-bold mb-2">User Management</h1>
              <p className="text-muted-foreground">Manage registered users and their accounts.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8 w-[200px] md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchMembers} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
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
              <CardDescription>View and manage all registered users in your system.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchMembers}>
                    Try Again
                  </Button>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm ? "No users match your search" : "No registered users found"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Member ID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell>{member.member_id}</TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>{member.phone}</TableCell>
                            <TableCell>
                              <Badge
                                variant={member.verified ? "default" : "outline"}
                                className={member.verified ? "bg-green-500 hover:bg-green-500/80" : ""}
                              >
                                {member.verified ? "Verified" : "Unverified"}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(member.created_at), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    {isProcessing === member.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Actions"
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {member.verified ? (
                                    <DropdownMenuItem onClick={() => handleVerifyMember(member.id, false)}>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Unverify User
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleVerifyMember(member.id, true)}>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Verify User
                                    </DropdownMenuItem>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete User
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete the user account for {member.name}. This action
                                          cannot be undone.
                                          {member.bookings_count > 0 && (
                                            <p className="text-destructive mt-2">
                                              Warning: This user has {member.bookings_count} bookings. You cannot delete
                                              a user with existing bookings.
                                            </p>
                                          )}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteMember(member.id)}
                                          disabled={isProcessing === member.id || member.bookings_count > 0}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                  Showing {filteredMembers.length} of {members.length} users
                  {searchTerm && " (filtered)"}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
