"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MembershipCard } from "./membership-card"
import { Button } from "./ui/button"
import { QRCodeSVG } from "qrcode.react"
import { format } from "date-fns"

type Member = {
  member_id: string
  name: string
  email: string
  profile_picture_url?: string
}

type MemberPackage = {
  start_date: string
  end_date: string
  payment_status: string
  wifi_credentials?: {
    username: string
    password: string
  } | null
  package_details: {
    name: string
    card_design_url?: string
  }
}

interface ElectronicCardModalProps {
  isOpen: boolean
  onClose: () => void
  member: Member
  memberPackage: MemberPackage
}

export function ElectronicCardModal({ isOpen, onClose, member, memberPackage }: ElectronicCardModalProps) {
  const endDate = new Date(memberPackage.end_date)

  // Generate QR code data
  const qrData = JSON.stringify({
    id: member.member_id,
    name: member.name,
    package: memberPackage.package_details.name,
    valid: format(endDate, "yyyy-MM-dd"),
    timestamp: new Date().toISOString(), // Add timestamp for security
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Electronic Membership Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Display the membership card */}
          <MembershipCard
            member={member}
            memberPackage={memberPackage}
            showWifi={false}
            handleProfilePictureUploaded={() => {}}
            isEdit={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
