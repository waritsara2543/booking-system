"use client"

import { useState } from "react"
import { MembershipCard } from "./membership-card"
import { ElectronicCardModal } from "./electronic-card-modal"

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

type InteractiveMembershipCardProps = {
  member: Member
  memberPackage: MemberPackage
  showWifi?: boolean
  handleProfilePictureUploaded: (url: string) => void
  profilePictureUrl?: string
  isEdit?: boolean
}

export function InteractiveMembershipCard({
  member,
  memberPackage,
  showWifi = false,
  handleProfilePictureUploaded,
  profilePictureUrl,
  isEdit = false,
}: InteractiveMembershipCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        <MembershipCard
          member={member}
          memberPackage={memberPackage}
          showWifi={showWifi}
          handleProfilePictureUploaded={handleProfilePictureUploaded}
          profilePictureUrl={profilePictureUrl}
          isEdit={isEdit}
        />
      </div>

      <ElectronicCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        member={member}
        memberPackage={memberPackage}
      />
    </>
  )
}
