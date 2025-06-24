"use client"

import { format } from "date-fns"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { QRCodeSVG } from "qrcode.react"
import { Badge } from "@/components/ui/badge"
import { ImageUploadProfile } from "./image-upload-profile"
import { useEffect, useState } from "react"

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

type MembershipCardProps = {
  member: Member
  memberPackage: MemberPackage
  showWifi?: boolean
  handleProfilePictureUploaded: (url: string) => void
  profilePictureUrl?: string
  isEdit?: boolean
}

export function MembershipCard({
  member,
  memberPackage,
  showWifi = false,
  handleProfilePictureUploaded,
  profilePictureUrl,
  isEdit = false,
}: MembershipCardProps) {
  const startDate = new Date(memberPackage.start_date)
  const endDate = new Date(memberPackage.end_date)
  const isActive = endDate > new Date()

  // Generate QR code data
  const qrData = JSON.stringify({
    id: member.member_id,
    name: member.name,
    package: memberPackage.package_details.name,
    valid: format(endDate, "yyyy-MM-dd"),
  })
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    setImageUrl(member.profile_picture_url)
  }, [member])
  console.log("imageUrl", imageUrl)

  return (
    <Card className="w-full overflow-hidden">
      <div className="relative">
        {/* Card background */}
        <div className="relative w-full h-52 md:h-64">
          {memberPackage.package_details.card_design_url ? (
            <Image
              src={memberPackage.package_details.card_design_url || "/placeholder.svg"}
              alt="Membership card background"
              fill
              className="object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.src = "/placeholder.svg?height=208&width=416"
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600" />
          )}

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Card content */}
        <CardContent className="absolute inset-0 p-4 flex flex-col justify-between text-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold tracking-tight">{memberPackage.package_details.name}</h3>
              
            </div>

            {/* QR Code */}
            <div className="bg-white p-1 rounded">
              <QRCodeSVG value={qrData} size={64} level="M" />
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex items-center gap-3">
              {/* Profile picture */}
              {/* <div className="relative w-16 h-16 rounded-full bg-white/20"> */}
              {/* {member.profile_picture_url ? ( */}
              <div className="relative">
                <div className="relative w-16 h-16 rounded-full  bg-white/20">
                  {isEdit ? (
                    <ImageUploadProfile
                      onImageUploaded={handleProfilePictureUploaded}
                      currentImageUrl={profilePictureUrl}
                      bucketName="profile-pictures"
                      folderPath="members"
                      className="w-16 h-16 mb-4"
                      name={member.name.charAt(0)}
                      memberId={member.member_id}
                    />
                  ) : (
                    <div className="relative w-16 h-16">
                      {imageUrl ? (
                        <div className="relative rounded-full overflow-hidden w-16 h-16">
                          <Image
                            src={imageUrl}
                            alt="Preview"
                            className="object-cover rounded-full w-full h-full"
                            width={100}
                            height={100}
                          />
                        </div>
                      ) : (
                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/20 ">
                          <div className="w-full h-full flex items-center justify-center bg-primary/20 text-white text-lg font-bold">
                            {member.name.charAt(0)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* </div> */}
                </div>
              </div>

              <div>
                <h4 className="font-bold">{member.name}</h4>
                <p className="text-sm opacity-90">{member.member_id}</p>
              </div>
            </div>

            <div className="text-right text-sm">
              <p>Valid until</p>
              <p className="font-semibold">{format(endDate, "MMM d, yyyy")}</p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* WiFi credentials section */}
      {showWifi && memberPackage.wifi_credentials && (
        <div className="p-4 border-t">
          <h4 className="font-medium mb-2">WiFi Access</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground">Username</p>
              <p className="font-mono">{memberPackage.wifi_credentials.username}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Password</p>
              <p className="font-mono">{memberPackage.wifi_credentials.password}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
