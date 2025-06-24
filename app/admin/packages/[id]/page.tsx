"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import Cookies from "js-cookie"
import { Loader2, ArrowLeft, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUpload } from "@/components/image-upload"
import { MembershipCard } from "@/components/membership-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const packageSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, {
    message: "Price must be a positive number.",
  }),
  duration_days: z.coerce.number().min(1, {
    message: "Duration must be at least 1 day.",
  }),
  features: z.array(z.string()).min(1, {
    message: "Package must have at least one feature.",
  }),
  is_active: z.boolean().default(true),
  card_design_url: z.string().optional(),
})

type PackageFormValues = z.infer<typeof packageSchema>

export default function PackageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === "new"
  const packageId = isNew ? null : (params.id as string)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inUse, setInUse] = useState(false)
  const [newFeature, setNewFeature] = useState("")
  const [cardDesignUrl, setCardDesignUrl] = useState<string>("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusNote, setStatusNote] = useState("")
  const [newStatus, setNewStatus] = useState<boolean | null>(null)

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      duration_days: 30,
      features: [""],
      is_active: true,
      card_design_url: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "features",
  })

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    if (!isNew) {
      fetchPackageDetails()
    } else {
      setIsLoading(false)
    }
  }, [router, isNew])

  async function fetchPackageDetails() {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase.from("packages").select("*").eq("id", packageId).single()

      if (error) throw error

      if (!data) {
        throw new Error("Package not found")
      }

      // Check if package is in use
      const { count, error: countError } = await supabase
        .from("member_packages")
        .select("*", { count: "exact", head: true })
        .eq("package_id", packageId)
        .eq("is_current", true)

      if (countError) throw countError

      setInUse(count !== null && count > 0)

      // Parse features if needed
      const features = Array.isArray(data.features) ? data.features : JSON.parse(data.features as unknown as string)

      // Set card design URL
      setCardDesignUrl(data.card_design_url || "")

      // Set form values
      form.reset({
        name: data.name,
        description: data.description || "",
        price: data.price,
        duration_days: data.duration_days,
        features: features.length > 0 ? features : [""],
        is_active: data.is_active,
        card_design_url: data.card_design_url || "",
      })
    } catch (err) {
      console.error("Error fetching package details:", err)
      setError("Failed to load package details")
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(values: PackageFormValues) {
    try {
      setIsSaving(true)
      setError(null)

      // Filter out empty features
      const filteredValues = {
        ...values,
        features: values.features.filter((feature) => feature.trim() !== ""),
        card_design_url: cardDesignUrl,
      }

      if (isNew) {
        // Create new package
        const { data, error } = await supabase.from("packages").insert([filteredValues]).select()

        if (error) throw error

        toast.success("Package created successfully")
        router.push("/admin/packages")
      } else {
        // Update existing package
        const { error } = await supabase.from("packages").update(filteredValues).eq("id", packageId)

        if (error) throw error

        toast.success("Package updated successfully")
        router.push("/admin/packages")
      }
    } catch (err) {
      console.error("Error saving package:", err)
      setError("Failed to save package")
      toast.error("Failed to save package")
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      append(newFeature.trim())
      setNewFeature("")
    }
  }

  const handleCardDesignUploaded = (url: string) => {
    setCardDesignUrl(url)
    form.setValue("card_design_url", url)
  }

  const confirmStatusChange = () => {
    if (newStatus !== null) {
      form.setValue("is_active", newStatus)
      setDialogOpen(false)

      // บันทึกหมายเหตุลงในฐานข้อมูล (ถ้าต้องการ)
      // สามารถเพิ่มโค้ดสำหรับบันทึกหมายเหตุลงในฐานข้อมูลที่นี่

      toast.success(`Package status ${newStatus ? "activated" : "deactivated"}: ${statusNote || "No reason provided"}`)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-3xl font-bold">{isNew ? "Add New Package" : "Edit Package"}</h1>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Package Details</TabsTrigger>
              <TabsTrigger value="card">Membership Card</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>{isNew ? "Create a new membership package" : "Edit membership package details"}</CardTitle>
                  <CardDescription>
                    {isNew
                      ? "Add a new membership package with features and pricing."
                      : "Update the details of this membership package."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : error ? (
                    <div className="text-center py-8">
                      <p className="text-destructive mb-4">{error}</p>
                      <Button variant="outline" onClick={fetchPackageDetails}>
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Package Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter package name" {...field} />
                              </FormControl>
                              <FormDescription>The name of the membership package.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter package description"
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>A brief description of the package and its benefits.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5">฿</span>
                                    <Input type="number" min="0" step="0.01" className="pl-7" {...field} />
                                  </div>
                                </FormControl>
                                <FormDescription>The price of the package.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="duration_days"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (Days)</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" {...field} />
                                </FormControl>
                                <FormDescription>How long the package is valid for.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="features"
                          render={() => (
                            <FormItem>
                              <FormLabel>Features</FormLabel>
                              <div className="space-y-2">
                                {fields.map((field, index) => (
                                  <div key={field.id} className="flex gap-2">
                                    <FormControl>
                                      <Input
                                        placeholder={`Feature ${index + 1}`}
                                        {...form.register(`features.${index}`)}
                                      />
                                    </FormControl>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => remove(index)}
                                      disabled={fields.length === 1}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Add a new feature"
                                    value={newFeature}
                                    onChange={(e) => setNewFeature(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        handleAddFeature()
                                      }
                                    }}
                                  />
                                  <Button type="button" variant="outline" onClick={handleAddFeature}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                  </Button>
                                </div>
                              </div>
                              <FormDescription>List the features included in this package.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="is_active"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Active Status</FormLabel>
                                <FormDescription>
                                  Whether this package is active and can be purchased by members.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    if (inUse && field.value && !checked) {
                                      toast.error("This package is currently in use and cannot be deactivated.")
                                      return
                                    }
                                    setNewStatus(checked)
                                    setStatusNote("")
                                    setDialogOpen(true)
                                  }}
                                  disabled={inUse && field.value}
                                />
                              </FormControl>
                              {inUse && field.value && (
                                <FormMessage>This package is currently in use and cannot be deactivated.</FormMessage>
                              )}
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => router.push("/admin/packages")}>
                    Cancel
                  </Button>
                  <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading || isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : isNew ? (
                      "Create Package"
                    ) : (
                      "Update Package"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="card">
              <Card>
                <CardHeader>
                  <CardTitle>Membership Card Design</CardTitle>
                  <CardDescription>
                    Upload a background image for the membership card that will be displayed to members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid gap-8 md:grid-cols-2">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Upload Card Background</h3>
                        <ImageUpload
                          onImageUploaded={handleCardDesignUploaded}
                          currentImageUrl={cardDesignUrl}
                          bucketName="membership-cards"
                          folderPath="card-designs"
                          aspectRatio="wide"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Recommended size: 800x400 pixels. This image will be used as the background for the membership
                          card.
                        </p>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium mb-4">Preview</h3>
                        <MembershipCard
                          member={{
                            member_id: "DEMO123",
                            name: "John Doe",
                            email: "john@example.com",
                          }}
                          memberPackage={{
                            start_date: new Date().toISOString(),
                            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            payment_status: "completed",
                            package_details: {
                              name: form.watch("name") || "Sample Package",
                              card_design_url: cardDesignUrl,
                            },
                          }}
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          This is how the membership card will appear to members.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => router.push("/admin/packages")}>
                    Cancel
                  </Button>
                  <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading || isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Card Design"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Package Status</DialogTitle>
            <DialogDescription>
              Are you sure you want to {newStatus ? "activate" : "deactivate"} this package? Please provide a reason for
              this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="note">Reason for status change</Label>
              <Textarea
                id="note"
                placeholder="Enter reason for status change..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmStatusChange}>Confirm Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
