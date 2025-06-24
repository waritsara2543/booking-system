"use client"

import type React from "react"

import { useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Plus } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

type ImageUploadProps = {
  onImageUploaded: (url: string) => void
  currentImageUrl?: string
  bucketName: string
  folderPath: string
  className?: string
  aspectRatio?: "square" | "wide"
  name: string
  memberId: string
}

export function ImageUploadProfile({
  onImageUploaded,
  currentImageUrl,
  bucketName,
  folderPath,
  className = "",
  aspectRatio = "square",
  name,
  memberId,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    if (currentImageUrl?.trim()) {
      return currentImageUrl
    }
    return null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB")
      return
    }

    try {
      setIsUploading(true)

      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const fileName = `${folderPath}/${memberId}_${Date.now()}.${fileExt}`

      // Ensure bucket exists
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some((bucket) => bucket.name === bucketName)

      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, {
          public: true,
        })
        console.log(`Created bucket: ${bucketName}`)
      }

      // Delete old image if exists
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split(`/storage/v1/object/public/${bucketName}/`)[1]
        if (oldPath) {
          await supabase.storage.from(bucketName).remove([oldPath])
        }
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName)

      if (!publicUrlData?.publicUrl) {
        throw new Error("Failed to get public URL after upload.")
      }

      onImageUploaded(publicUrlData.publicUrl)

      const { error: updateError } = await supabase
        .from("members")
        .update({
          profile_picture_url: publicUrlData.publicUrl,
        })
        .eq("member_id", memberId)

      if (updateError) throw updateError

      toast.success("Image uploaded successfully")
    } catch (error: any) {
      console.error("Error uploading image:", error)

      if (error.message?.includes("row-level security")) {
        toast.error(
          "Permission denied: Please check storage bucket policies in Supabase dashboard. Enable INSERT permissions for this bucket.",
        )
      } else {
        toast.error(`Failed to upload image: ${error.message || "Please try again"}`)
      }

      setPreviewUrl(currentImageUrl || null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(null)
    onImageUploaded("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const triggerFileInput = () => {
    if (isUploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className={`${className}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {previewUrl ? (
        <div className="relative cursor-pointer" onClick={triggerFileInput}>
          <div
            className={`relative overflow-hidden rounded-full ${
              aspectRatio === "square" ? "aspect-square" : "aspect-[16/9]"
            }`}
          >
            <Image
              src={previewUrl || "/placeholder.svg"}
              alt="Preview"
              fill
              className="object-cover"
              onError={() => {
                console.error("Failed to load image, using fallback")
                setPreviewUrl(null)
              }}
            />
          </div>
          <div className="bg-primary text-primary-foreground rounded-full p-1 z-20 absolute top-10 left-10">
            <Plus className="h-4 w-4" />
          </div>
        </div>
      ) : (
        <div onClick={triggerFileInput} className="cursor-pointer">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/20 ">
            <div className="w-full h-full flex items-center justify-center bg-primary/20 text-white text-lg font-bold">
              {name ? name.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
          <div className="bg-primary text-primary-foreground rounded-full p-1 z-20 absolute top-10 left-10">
            <Plus className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  )
}
