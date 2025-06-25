"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type PackageType = {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
};

interface PackageConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  packageDetails: PackageType | null;
  onConfirm: () => void;
  isUpgrade: boolean;
  paymentMethod: "cash" | "bank_transfer";
  setPaymentMethod: (method: "cash" | "bank_transfer") => void;
  slipImage: File | null;
  setSlipImage: (file: File | null) => void;
  isProcessing?: boolean;
}

export function PackageConfirmationDialog({
  isOpen,
  onClose,
  packageDetails,
  onConfirm,
  isUpgrade,
  slipImage,
  setSlipImage,
  paymentMethod,
  setPaymentMethod,
  isProcessing = false,
}: PackageConfirmationDialogProps) {
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  if (!packageDetails) return null;

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSlipImage(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSlipPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setSlipPreview(null);
    }
  };

  // useEffect(() => {
  //   if (paymentMethod === "cash") {
  //     setSlipPreview(null);
  //   }
  // }, [paymentMethod]);

  // useEffect(() => {
  //   if (isOpen) {
  //     setPaymentMethod("cash");
  //     setSlipImage(null);
  //     setSlipPreview(null);
  //   }
  // }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-y-scroll max-h-[800px] shadow-2xl border-0 scrollbar-hide">
        <DialogHeader className="bg-gradient-to-r from-primary/80 to-secondary/80 px-8 py-6">
          <DialogTitle className="text-2xl font-bold text-white">
            {isUpgrade ? "Upgrade Package" : "Confirm Package Selection"}
          </DialogTitle>
          <DialogDescription className="text-white/80">
            {isUpgrade
              ? "You are about to upgrade to a new package. Please review the details below."
              : "Please review your package selection before proceeding."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 px-8 py-6 bg-background">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-primary flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {packageDetails.name}
            </h3>
            {packageDetails.description && (
              <p className="text-sm text-muted-foreground/80">
                {packageDetails.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg bg-muted/40 p-4 flex flex-col items-center">
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="text-2xl font-bold text-primary mt-1">
                ฿{packageDetails.price.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4 flex flex-col items-center">
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {packageDetails.duration_days} days
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-primary">Features:</p>
            <ul className="space-y-1">
              {packageDetails.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-primary">
              Select Payment Method:
            </label>
            <div className="flex gap-6">
              <label
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/10"
                    : "border-muted bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                  disabled={isProcessing}
                  className="accent-primary"
                />
                <span className="font-medium">Cash</span>
              </label>
              <label
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === "bank_transfer"
                    ? "border-primary bg-primary/10"
                    : "border-muted bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="bank_transfer"
                  checked={paymentMethod === "bank_transfer"}
                  onChange={() => setPaymentMethod("bank_transfer")}
                  disabled={isProcessing}
                  className="accent-primary"
                />
                <span className="font-medium">Bank Transfer</span>
              </label>
            </div>
          </div>

          {paymentMethod === "bank_transfer" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-primary">
                  Scan QR Code to Pay:
                </label>
                <div className="flex justify-center">
                  <img
                    src="/placeholder.svg"
                    alt="Bank Transfer QR Code"
                    className="w-44 h-44 border-2 border-primary/30 rounded-lg object-contain shadow-md bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-primary">
                  Upload Payment Slip:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSlipChange}
                  disabled={isProcessing}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {slipPreview && (
                  <div className="flex justify-center mt-2">
                    <img
                      src={slipPreview}
                      alt="Slip Preview"
                      className="w-32 h-32 object-contain border-2 border-primary/30 rounded-lg shadow"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {paymentMethod === "cash" && (
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              <p>
                {isUpgrade
                  ? "After confirming, please visit the counter to complete your payment for the upgrade."
                  : "After confirming, please visit the counter to complete your payment."}
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="bg-muted/40 px-8 py-4 flex justify-end gap-4 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-lg px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={
              isProcessing || (paymentMethod === "bank_transfer" && !slipImage)
            }
            className="rounded-lg px-6 shadow-md"
          >
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
  );
}
