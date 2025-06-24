"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Loader2, Upload, X, Plus } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

type ImageUploadProps = {
  onImageUploaded: (url: string) => void
  currentImageUrl?: string
  bucketName: string
  folderPath: string
  className?: string
  aspectRatio?: "square" | "wide"
}

export function ImageUpload({
  onImageUploaded,
  currentImageUrl,
  bucketName,
  folderPath,
  className = "",
  aspectRatio = "square",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB")
      return
    }

    try {
      setIsUploading(true)

      // Create a local preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Generate a unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${folderPath}/${Date.now()}.${fileExt}`

      // Check if bucket exists, create if it doesn't
      const { data: buckets } = await supabase.storage.listBuckets()
      const bucketExists = buckets?.some((bucket) => bucket.name === bucketName)

      if (!bucketExists) {
        // Create the bucket with public access
        await supabase.storage.createBucket(bucketName, {
          public: true,
        })
        console.log(`Created bucket: ${bucketName}`)
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from(bucketName).upload(fileName, file, {
        cacheControl: "3600",
        upsert: true, // Changed to true to allow overwriting
      })

      if (error) {
        console.error("Upload error:", error)
        throw error
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName)

      // Call the callback with the new URL
      onImageUploaded(publicUrlData.publicUrl)
      toast.success("Image uploaded successfully")
    } catch (error: any) {
      console.error("Error uploading image:", error)

      // Check for RLS policy error
      if (error.message && error.message.includes("row-level security")) {
        toast.error(
          "Permission denied: Please check storage bucket policies in Supabase dashboard. Enable INSERT permissions for this bucket.",
        )
      } else {
        toast.error(`Failed to upload image: ${error.message || "Please try again"}`)
      }

      // Revert to previous image if upload fails
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
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`${className}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {previewUrl ? (
        <div className="relative">
          <div
            className={`relative overflow-hidden rounded-lg border ${
              aspectRatio === "square" ? "aspect-square" : "aspect-[16/9]"
            }`}
          >
            <Image src={previewUrl || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
          </div>
          <div className="absolute top-2 right-2 flex gap-2">
            <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={handleRemoveImage}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={triggerFileInput}>
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center rounded-lg border border-dashed p-6 cursor-pointer hover:bg-muted/50 transition-colors ${
            aspectRatio === "square" ? "aspect-square" : "aspect-[16/9]"
          }`}
          onClick={triggerFileInput}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center bg-muted rounded-full p-3 mb-2">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">Click to upload image</p>
              <p className="text-xs text-muted-foreground">JPG, PNG or GIF (max 5MB)</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
