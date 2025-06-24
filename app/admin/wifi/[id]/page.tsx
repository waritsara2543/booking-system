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
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"

const credentialSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
})

type CredentialFormValues = z.infer<typeof credentialSchema>

export default function WiFiCredentialDetailPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === "new"
  const credentialId = isNew ? null : (params.id as string)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [inUse, setInUse] = useState(false)

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      username: "",
      password: "",
      is_active: true,
      notes: "",
    },
  })

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    if (!isNew) {
      fetchCredentialDetails()
    } else {
      setIsLoading(false)
    }
  }, [router, isNew])

  async function fetchCredentialDetails() {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase.from("wifi_credentials").select("*").eq("id", credentialId).single()

      if (error) throw error

      if (!data) {
        throw new Error("WiFi credential not found")
      }

      // Check if credential is in use
      const { count, error: countError } = await supabase
        .from("member_packages")
        .select("*", { count: "exact", head: true })
        .eq("wifi_credential_id", credentialId)
        .eq("is_current", true)

      if (countError) throw countError

      setInUse(count !== null && count > 0)

      // Set form values
      form.reset({
        username: data.username,
        password: data.password,
        is_active: data.is_active,
        notes: data.notes || "",
      })
    } catch (err) {
      console.error("Error fetching WiFi credential details:", err)
      setError("Failed to load WiFi credential details")
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(values: CredentialFormValues) {
    try {
      setIsSaving(true)
      setError(null)

      if (isNew) {
        // Create new credential
        const { data, error } = await supabase.from("wifi_credentials").insert([values]).select()

        if (error) throw error

        toast.success("WiFi credential created successfully")
        router.push("/admin/wifi")
      } else {
        // Update existing credential
        const { error } = await supabase.from("wifi_credentials").update(values).eq("id", credentialId)

        if (error) throw error

        toast.success("WiFi credential updated successfully")
        router.push("/admin/wifi")
      }
    } catch (err) {
      console.error("Error saving WiFi credential:", err)
      setError("Failed to save WiFi credential")
      toast.error("Failed to save WiFi credential")
    } finally {
      setIsSaving(false)
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
            <h1 className="text-3xl font-bold">{isNew ? "Add New WiFi Credential" : "Edit WiFi Credential"}</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{isNew ? "Create a new WiFi credential" : "Edit WiFi credential details"}</CardTitle>
              <CardDescription>
                {isNew ? "Add a new WiFi credential for members." : "Update the details of this WiFi credential."}
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
                  <Button variant="outline" onClick={fetchCredentialDetails}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter WiFi username" {...field} />
                          </FormControl>
                          <FormDescription>The username for the WiFi credential.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <div className="flex">
                            <FormControl>
                              <div className="relative w-full">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter WiFi password"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                          </div>
                          <FormDescription>The password for the WiFi credential.</FormDescription>
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
                              Whether this WiFi credential is active and can be assigned to members.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={inUse && field.value}
                            />
                          </FormControl>
                          {inUse && field.value && (
                            <FormMessage>This credential is currently in use and cannot be deactivated.</FormMessage>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any notes about this WiFi credential"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Optional notes about this WiFi credential.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/admin/wifi")}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isNew ? (
                  "Create Credential"
                ) : (
                  "Update Credential"
                )}
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </div>
  )
}
