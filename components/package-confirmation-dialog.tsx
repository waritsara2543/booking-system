"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Loader2 } from "lucide-react"

type PackageType = {
  id: string
  name: string
  description?: string
  price: number
  duration_days: number
  features: string[]
  is_active: boolean
}

interface PackageConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  packageDetails: PackageType | null
  onConfirm: () => void
  isUpgrade: boolean
  isProcessing?: boolean
}

export function PackageConfirmationDialog({
  isOpen,
  onClose,
  packageDetails,
  onConfirm,
  isUpgrade,
  isProcessing = false,
}: PackageConfirmationDialogProps) {
  if (!packageDetails) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isUpgrade ? "Upgrade Package" : "Confirm Package Selection"}</DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? "You are about to upgrade to a new package. Please review the details below."
              : "Please review your package selection before proceeding."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{packageDetails.name}</h3>
            {packageDetails.description && (
              <p className="text-sm text-muted-foreground">{packageDetails.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="text-lg font-bold">฿{packageDetails.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-lg font-bold">{packageDetails.duration_days} days</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Features:</p>
            <ul className="space-y-1">
              {packageDetails.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mr-2" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              {isUpgrade
                ? "After confirming, please visit the counter to complete your payment for the upgrade."
                : "After confirming, please visit the counter to complete your payment."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
