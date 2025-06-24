"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Loader2, CheckCircle2, Eye } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

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
  is_upgrade?: boolean
  previous_package_id?: string
  created_at: string
}

export default function MemberPackagesOverview() {
  const [memberPackages, setMemberPackages] = useState<MemberPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<MemberPackage | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [availableWifiCredentials, setAvailableWifiCredentials] = useState<any[]>([])
  const [selectedWifiCredential, setSelectedWifiCredential] = useState<string>("")

  useEffect(() => {
    fetchMemberPackages()
    fetchAvailableWifiCredentials()
  }, [])

  async function fetchMemberPackages() {
    try {
      setIsLoading(true)
      setError(null)

      // Get all member packages with member and package details
      const { data, error } = await supabase
        .from("member_packages")
        .select(
          `
          *,
          members:member_id (name, email),
          packages:package_id (name, price),
          wifi_credentials:wifi_credential_id (username)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(3)

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
          is_upgrade: item.is_upgrade,
          previous_package_id: item.previous_package_id,
          created_at: item.created_at,
        })) || []

      setMemberPackages(processedData)
    } catch (err) {
      console.error("Error fetching member packages:", err)
      setError("Failed to load member packages")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchAvailableWifiCredentials() {
    try {
      // Get all active WiFi credentials that are not assigned
      const { data, error } = await supabase
        .from("wifi_credentials")
        .select("*")
        .eq("is_active", true)
        .eq("is_assigned", false)
        .order("created_at", { ascending: false })

      if (error) throw error

      setAvailableWifiCredentials(data || [])
    } catch (err) {
      console.error("Error fetching available WiFi credentials:", err)
      toast.error("Failed to load available WiFi credentials")
    }
  }

  function handleConfirmPayment(pkg: MemberPackage) {
    // Don't allow confirmation of upgrade packages if there's already an active package
    if (pkg.is_upgrade && pkg.payment_status === "pending") {
      toast.error("Cannot confirm upgrade package. Please handle the upgrade process properly.")
      return
    }

    setSelectedPackage(pkg)
    setShowConfirmDialog(true)
  }

  async function processPaymentConfirmation() {
    if (!selectedPackage || !selectedWifiCredential) {
      toast.error("Please select a WiFi credential")
      return
    }

    try {
      setIsProcessing(true)

      // Call the update status API instead of directly updating
      const response = await fetch("/api/packages/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageSelectionId: selectedPackage.id,
          status: "completed",
          wifiCredentialId: selectedWifiCredential,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to confirm package")
      }

      toast.success("Payment confirmed and confirmation email sent")

      // Update the local state by refreshing the packages
      fetchMemberPackages()

      // Close the dialog and reset state
      setShowConfirmDialog(false)
      setSelectedPackage(null)
      setSelectedWifiCredential("")

      // Refresh available WiFi credentials
      fetchAvailableWifiCredentials()
    } catch (err) {
      console.error("Error confirming payment:", err)
      toast.error("Failed to confirm payment")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Member Packages</CardTitle>
          <CardDescription>The 3 most recent package purchases</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMemberPackages}>
          <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {memberPackages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No member packages found</p>
            <Link href="/admin/members/packages">
              <Button variant="outline">View All Packages</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pkg.member_name}</div>
                          <div className="text-sm text-muted-foreground">{pkg.member_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{pkg.package_name}</div>
                          {pkg.is_upgrade && <div className="text-xs text-blue-600 font-medium">Upgrade Request</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pkg.payment_status === "completed"
                              ? "default"
                              : pkg.payment_status === "pending"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {pkg.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {pkg.payment_status === "pending" && !pkg.is_upgrade && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleConfirmPayment(pkg)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Confirm
                            </Button>
                          )}
                          {pkg.payment_status === "pending" && pkg.is_upgrade && (
                            <div className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded">
                              Upgrade Pending
                            </div>
                          )}
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
        <div className="mt-4 text-right">
          <Link href="/admin/members/packages">
            <Button variant="link" size="sm">
              View all packages →
            </Button>
          </Link>
        </div>
      </CardContent>

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
                  <div>฿{selectedPackage.package_price.toFixed(2)}</div>
                  {selectedPackage.is_upgrade && (
                    <>
                      <div className="font-medium">Type:</div>
                      <div className="text-blue-600 font-medium">Package Upgrade</div>
                    </>
                  )}
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
            <Button
              onClick={processPaymentConfirmation}
              disabled={isProcessing || !selectedWifiCredential || availableWifiCredentials.length === 0}
            >
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
    </Card>
  )
}
