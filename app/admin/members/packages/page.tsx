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
import { Loader2, CheckCircle2, XCircle, Eye, Search, RefreshCw, Filter, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { downloadExcel } from "@/lib/excel-utils"
import * as XLSX from "xlsx"

type MemberPackage = {
  id: string
  member_id: string
  member_name: string
  member_email: string
  package_id: string
  package_name: string
  package_price: number
  start_date: string
  end_date: string
  payment_status: string
  payment_method?: string
  payment_amount?: number
  payment_date?: string
  wifi_credential_id?: string
  wifi_username?: string
  is_current: boolean
  created_at: string
}

export default function MemberPackagesPage() {
  const router = useRouter()
  const [memberPackages, setMemberPackages] = useState<MemberPackage[]>([])
  const [filteredPackages, setFilteredPackages] = useState<MemberPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedPackage, setSelectedPackage] = useState<MemberPackage | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [availableWifiCredentials, setAvailableWifiCredentials] = useState<any[]>([])
  const [selectedWifiCredential, setSelectedWifiCredential] = useState<string>("")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    fetchMemberPackages()
    fetchAvailableWifiCredentials()
  }, [router])

  useEffect(() => {
    // Filter packages based on search term and status
    let filtered = memberPackages

    if (searchTerm.trim() !== "") {
      const lowercasedSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (pkg) =>
          pkg.member_name.toLowerCase().includes(lowercasedSearch) ||
          pkg.member_email.toLowerCase().includes(lowercasedSearch) ||
          pkg.member_id.toLowerCase().includes(lowercasedSearch) ||
          pkg.package_name.toLowerCase().includes(lowercasedSearch),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((pkg) => pkg.payment_status === statusFilter)
    }

    setFilteredPackages(filtered)
  }, [searchTerm, statusFilter, memberPackages])

  async function fetchMemberPackages() {
    try {
      setIsLoading(true)
      setError(null)

      // Get all member packages with member and package details
      const { data, error } = await supabase
        .from("member_packages")
        .select(`
          *,
          members:member_id (name, email),
          packages:package_id (name, price),
          wifi_credentials:wifi_credential_id (username)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Process the data to flatten the structure
      const processedData =
        data?.map((item) => ({
          id: item.id,
          member_id: item.member_id,
          member_name: item.members?.name || "Unknown",
          member_email: item.members?.email || "Unknown",
          package_id: item.package_id,
          package_name: item.packages?.name || "Unknown",
          package_price: item.packages?.price || 0,
          start_date: item.start_date,
          end_date: item.end_date,
          payment_status: item.payment_status,
          payment_method: item.payment_method,
          payment_amount: item.payment_amount,
          payment_date: item.payment_date,
          wifi_credential_id: item.wifi_credential_id,
          wifi_username: item.wifi_credentials?.username,
          is_current: item.is_current,
          created_at: item.created_at,
        })) || []

      setMemberPackages(processedData)
      setFilteredPackages(processedData)
    } catch (err) {
      console.error("Error fetching member packages:", err)
      setError("Failed to load member packages")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchAvailableWifiCredentials() {
    try {
      // Get all active WiFi credentials that are not assigned to any current member package
      const { data, error } = await supabase
        .from("wifi_credentials")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get all WiFi credentials that are currently in use
      const { data: usedCredentials, error: usedError } = await supabase
        .from("member_packages")
        .select("wifi_credential_id")
        .eq("is_current", true)
        .not("wifi_credential_id", "is", null)

      if (usedError) throw usedError

      // Create a set of credential IDs that are in use
      const inUseCredentialIds = new Set(usedCredentials?.map((item) => item.wifi_credential_id) || [])

      // Filter out credentials that are in use
      const availableCredentials = data?.filter((credential) => !inUseCredentialIds.has(credential.id)) || []

      setAvailableWifiCredentials(availableCredentials)
    } catch (err) {
      console.error("Error fetching available WiFi credentials:", err)
      toast.error("Failed to load available WiFi credentials")
    }
  }

  function handleConfirmPayment(pkg: MemberPackage) {
    setSelectedPackage(pkg)
    setShowConfirmDialog(true)
  }

  async function processPaymentConfirmation() {
    if (!selectedPackage) {
      toast.error("No package selected")
      return
    }

    // ถ้าไม่มี WiFi credentials ให้ดำเนินการต่อได้ แต่แจ้งเตือน
    if (!selectedWifiCredential && availableWifiCredentials.length > 0) {
      toast.error("Please select a WiFi credential")
      return
    }

    try {
      setIsProcessing(true)

      // เรียก API เพื่ออัพเดตสถานะแพ็คเกจ
      const response = await fetch("/api/packages/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageSelectionId: selectedPackage.id,
          status: "completed",
          wifiCredentialId: selectedWifiCredential || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to confirm payment")
      }

      toast.success("Payment confirmed successfully")

      // อัพเดต local state
      setMemberPackages(
        memberPackages.map((pkg) =>
          pkg.id === selectedPackage.id
            ? {
                ...pkg,
                payment_status: "completed",
                payment_date: new Date().toISOString(),
                wifi_credential_id: selectedWifiCredential,
              }
            : pkg,
        ),
      )

      // ปิด dialog และ reset state
      setShowConfirmDialog(false)
      setSelectedPackage(null)
      setSelectedWifiCredential("")

      // รีเฟรช WiFi credentials ที่ใช้ได้
      fetchAvailableWifiCredentials()
    } catch (err: any) {
      console.error("Error confirming payment:", err)
      toast.error(err.message || "Failed to confirm payment")
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleExportExcel() {
    try {
      setIsExporting(true)

      // Format the data for Excel
      const formattedData = memberPackages.map((pkg) => ({
        ID: pkg.id,
        "Member Name": pkg.member_name,
        "Member ID": pkg.member_id,
        "Member Email": pkg.member_email,
        "Package Name": pkg.package_name,
        "Package Price": `$${pkg.package_price.toFixed(2)}`,
        "Start Date": format(parseISO(pkg.start_date), "MMM d, yyyy"),
        "End Date": format(parseISO(pkg.end_date), "MMM d, yyyy"),
        "Payment Status": pkg.payment_status.charAt(0).toUpperCase() + pkg.payment_status.slice(1),
        "Payment Method": pkg.payment_method || "N/A",
        "Payment Date": pkg.payment_date ? format(parseISO(pkg.payment_date), "MMM d, yyyy") : "N/A",
        "WiFi Username": pkg.wifi_username || "Not Assigned",
        "Is Current": pkg.is_current ? "Yes" : "No",
        "Created At": format(parseISO(pkg.created_at), "MMM d, yyyy HH:mm:ss"),
      }))

      // Create a new workbook
      const wb = XLSX.utils.book_new()

      // Create a worksheet from the data
      const ws = XLSX.utils.json_to_sheet(formattedData)

      // Set column widths
      const colWidths = [
        { wch: 10 }, // ID
        { wch: 20 }, // Member Name
        { wch: 15 }, // Member ID
        { wch: 25 }, // Member Email
        { wch: 20 }, // Package Name
        { wch: 15 }, // Package Price
        { wch: 15 }, // Start Date
        { wch: 15 }, // End Date
        { wch: 15 }, // Payment Status
        { wch: 15 }, // Payment Method
        { wch: 15 }, // Payment Date
        { wch: 20 }, // WiFi Username
        { wch: 10 }, // Is Current
        { wch: 20 }, // Created At
      ]
      ws["!cols"] = colWidths

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Member Packages")

      // Create a summary worksheet
      const summaryData = [
        { Metric: "Total Packages", Value: memberPackages.length },
        { Metric: "Completed Payments", Value: memberPackages.filter((p) => p.payment_status === "completed").length },
        { Metric: "Pending Payments", Value: memberPackages.filter((p) => p.payment_status === "pending").length },
        { Metric: "Current Packages", Value: memberPackages.filter((p) => p.is_current).length },
        { Metric: "Report Generated", Value: format(new Date(), "MMM d, yyyy HH:mm:ss") },
      ]

      const summaryWs = XLSX.utils.json_to_sheet(summaryData)
      summaryWs["!cols"] = [{ wch: 25 }, { wch: 20 }]

      // Add the summary worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

      // Download the Excel file
      const filename = `member-packages-${format(new Date(), "yyyy-MM-dd")}.xlsx`
      downloadExcel(wb, filename)

      toast.success("Member packages exported successfully")
    } catch (err) {
      console.error("Error exporting member packages:", err)
      toast.error("Failed to export member packages")
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
          {/* New header with title and controls in the same row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Member Packages</h1>
              <p className="text-muted-foreground mt-1">Manage member packages and confirm payments.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-[180px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    {statusFilter === "all" ? "All" : statusFilter === "completed" ? "Paid" : "Pending"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Paid</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("pending")}>Pending</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isLoading || isExporting || memberPackages.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Export"}
              </Button>

              <Button variant="outline" size="icon" size="sm" onClick={fetchMemberPackages} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Member Packages</CardTitle>
              <CardDescription>View and manage all member packages in your system.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchMemberPackages}>
                    Try Again
                  </Button>
                </div>
              ) : filteredPackages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No member packages found</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Package</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>WiFi</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPackages.map((pkg) => (
                          <TableRow key={pkg.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{pkg.member_name}</div>
                                <div className="text-sm text-muted-foreground">{pkg.member_id}</div>
                              </div>
                            </TableCell>
                            <TableCell>{pkg.package_name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{format(parseISO(pkg.start_date), "MMM d, yyyy")}</div>
                                <div className="text-muted-foreground">
                                  to {format(parseISO(pkg.end_date), "MMM d, yyyy")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>${pkg.package_price.toFixed(2)}</TableCell>
                            <TableCell>
                              {pkg.payment_status === "completed" ? (
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                                  <span>Paid</span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <XCircle className="h-4 w-4 text-amber-500 mr-1" />
                                  <span>Pending</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {pkg.wifi_username ? (
                                <Badge variant="outline" className="bg-primary/5">
                                  {pkg.wifi_username}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Not Assigned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                  onClick={() => handleConfirmPayment(pkg)}
                                  disabled={pkg.payment_status === "completed"}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Confirm
                                </Button>
                                <Link href={`/admin/members/packages/${pkg.id}`}>
                                  <Button size="sm" variant="ghost">
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">View</span>
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredPackages.length} of {memberPackages.length} packages
                {searchTerm || statusFilter !== "all" ? " (filtered)" : ""}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Confirm Payment Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>Confirm payment and assign WiFi credentials for this member.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedPackage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Member:</div>
                  <div>{selectedPackage.member_name}</div>
                  <div className="font-medium">Member ID:</div>
                  <div>{selectedPackage.member_id}</div>
                  <div className="font-medium">Package:</div>
                  <div>{selectedPackage.package_name}</div>
                  <div className="font-medium">Price:</div>
                  <div>${selectedPackage.package_price.toFixed(2)}</div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium">Assign WiFi Credentials</label>
                  <Select value={selectedWifiCredential} onValueChange={setSelectedWifiCredential}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select WiFi credentials" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWifiCredentials.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No available WiFi credentials. Please create new ones.
                        </div>
                      ) : (
                        availableWifiCredentials.map((credential) => (
                          <SelectItem key={credential.id} value={credential.id}>
                            {credential.username} {credential.notes ? `(${credential.notes})` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {availableWifiCredentials.length === 0 && (
                    <div className="text-xs text-destructive mt-1">
                      You need to create new WiFi credentials before confirming payment.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={processPaymentConfirmation} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
