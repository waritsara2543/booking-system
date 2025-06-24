"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Package, User, Calendar, CreditCard, Clock } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface PackageDetailsModalProps {
  packageData: any
  isOpen: boolean
  onClose: () => void
  onStatusUpdate: (packageId: string, status: string, note?: string) => void
}

export function PackageDetailsModal({ packageData, isOpen, onClose, onStatusUpdate }: PackageDetailsModalProps) {
  const [newStatus, setNewStatus] = useState(packageData?.payment_status || "pending")
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  if (!packageData) return null

  const handleStatusUpdate = async () => {
    if (newStatus === packageData.payment_status && !note.trim()) {
      toast.error("Please change status or add a note")
      return
    }

    setIsUpdating(true)
    try {
      await onStatusUpdate(packageData.id, newStatus, note.trim())
      toast.success("Package status updated successfully")
      onClose()
    } catch (error) {
      toast.error("Failed to update package status")
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "expired":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Package Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Member ID</p>
                  <p className="text-sm text-muted-foreground">{packageData.member_id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Package Name</p>
                  <p className="text-sm text-muted-foreground">{packageData.packages?.name || "Unknown Package"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Price</p>
                  <p className="text-sm text-muted-foreground">
                    ฿{packageData.packages?.price?.toLocaleString() || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">{packageData.packages?.duration_days || "N/A"} days</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {packageData.start_date ? format(new Date(packageData.start_date), "PPP") : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">End Date</p>
                  <p className="text-sm text-muted-foreground">
                    {packageData.end_date ? format(new Date(packageData.end_date), "PPP") : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Package Description */}
          {packageData.packages?.description && (
            <div>
              <p className="text-sm font-medium mb-2">Package Description</p>
              <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">{packageData.packages.description}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div>
              <p className="text-sm font-medium">Current Status</p>
              <Badge className={getStatusColor(packageData.payment_status)}>
                {packageData.payment_status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Created At</p>
              <p className="text-sm text-muted-foreground">
                {packageData.created_at ? format(new Date(packageData.created_at), "PPP p") : "N/A"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Status Update Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Update Status</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note / Reason (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note or reason for the status change..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
