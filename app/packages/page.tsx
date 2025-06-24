"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Crown,
  Star,
  Zap,
  Shield,
  Clock,
  Calendar,
  Users,
  Coffee,
  Wifi,
  Printer,
  Monitor,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PackageConfirmationDialog } from "@/components/package-confirmation-dialog"
import { MembershipCard } from "@/components/membership-card"
import { AuthDialog } from "@/components/auth-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client for client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

type PackageType = {
  id: string
  name: string
  description?: string
  price: number
  duration_days: number
  features: string[]
  is_active: boolean
  card_design_url?: string
}

type MemberPackage = {
  id: string
  package_id: string
  member_id: string
  start_date: string
  end_date: string
  payment_status: string
  is_current: boolean
  is_upgrade?: boolean
  previous_package_id?: string
  package_details?: PackageType
}

type Member = {
  id: string
  member_id: string
  name: string
  email: string
  profile_picture_url?: string
}

export default function PackagesPage() {
  const router = useRouter()
  const [packages, setPackages] = useState<PackageType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [memberEmail, setMemberEmail] = useState<string | null>(null)
  const [memberName, setMemberName] = useState<string | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [currentPackage, setCurrentPackage] = useState<MemberPackage | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasPendingPackage, setHasPendingPackage] = useState(false)

  async function checkPendingPackages(memberId: string) {
    try {
      const { data, error } = await supabase
        .from("member_packages")
        .select("id")
        .eq("member_id", memberId)
        .eq("payment_status", "pending")
        .limit(1)

      if (error) {
        console.error("Error checking pending packages:", error)
        return false
      }

      return data && data.length > 0
    } catch (error) {
      console.error("Error checking pending packages:", error)
      return false
    }
  }

  useEffect(() => {
    // Check if user is logged in but don't redirect
    try {
      const storedMemberId = localStorage.getItem("memberId")
      const storedMemberEmail = localStorage.getItem("memberEmail")
      const storedMemberName = localStorage.getItem("memberName")

      if (storedMemberId && storedMemberEmail) {
        setMemberId(storedMemberId)
        setMemberEmail(storedMemberEmail)
        setMemberName(storedMemberName)
        setIsLoggedIn(true)

        fetchMemberDetails(storedMemberId)
        fetchCurrentPackage(storedMemberId)

        // Check if user has pending packages
        checkPendingPackages(storedMemberId).then((hasPending) => {
          setHasPendingPackage(hasPending)
        })
      }

      // Always fetch packages regardless of login status
      fetchPackages()
    } catch (error) {
      console.error("Error accessing localStorage:", error)
      // Continue showing packages even if there's an error with localStorage
      fetchPackages()
    }
  }, [])

  async function fetchMemberDetails(memberId: string) {
    try {
      const { data, error } = await supabase.from("members").select("*").eq("member_id", memberId).single()

      if (error) {
        console.error("Error fetching member details:", error)
        return
      }

      if (data) {
        setMember(data)
      }
    } catch (error) {
      console.error("Error fetching member details:", error)
    }
  }

  async function fetchPackages() {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("packages").select("*").eq("is_active", true).order("price")

      if (error) {
        console.error("Error fetching packages:", error)
        toast.error("Failed to load packages")
        return
      }

      // Parse features if they are stored as JSON strings
      const parsedPackages = data.map((pkg) => ({
        ...pkg,
        features: typeof pkg.features === "string" ? JSON.parse(pkg.features) : pkg.features,
      }))

      setPackages(parsedPackages)
    } catch (error) {
      console.error("Error:", error)
      toast.error("An error occurred while loading packages")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchCurrentPackage(memberId: string) {
    try {
      const { data, error } = await supabase
        .from("member_packages")
        .select(
          `
          *,
          package_details:package_id (
            id, name, description, price, duration_days, features, is_active, card_design_url
          )
        `,
        )
        .eq("member_id", memberId)
        .eq("is_current", true)
        .eq("payment_status", "completed")
        .maybeSingle()

      if (error) {
        console.error("Error fetching current package:", error)
        return
      }

      if (data) {
        // Parse features if needed
        if (data.package_details && typeof data.package_details.features === "string") {
          data.package_details.features = JSON.parse(data.package_details.features)
        }
        setCurrentPackage(data)
      }
    } catch (error) {
      console.error("Error fetching current package:", error)
    }
  }

  // แก้ไขฟังก์ชัน isPackageDisabled เพื่อให้ผู้ใช้สามารถเลือกแพ็คเกจได้ทุก Tier เมื่อแพ็คเกจหมดอายุ
  const isPackageDisabled = (pkg: PackageType) => {
    // If not logged in, packages are never disabled
    if (!isLoggedIn) return false

    // Disable all packages if there's a pending package
    if (hasPendingPackage) return true

    // Check if current package is expired
    const isCurrentPackageExpired = currentPackage && new Date(currentPackage.end_date) < new Date()

    // If current package is expired, don't disable any packages
    if (isCurrentPackageExpired) return false

    // Disable if it's the current package and payment is completed
    if (currentPackage?.package_id === pkg.id && currentPackage?.payment_status === "completed") {
      return true
    }

    // Disable if it's a downgrade (lower or equal price than current package) and current package is not expired
    if (
      currentPackage?.package_details &&
      currentPackage.payment_status === "completed" &&
      pkg.price <= currentPackage.package_details.price &&
      !isCurrentPackageExpired
    ) {
      return true
    }

    return false
  }

  // แก้ไขฟังก์ชัน getButtonText เพื่อแสดงข้อความที่เหมาะสมเมื่อแพ็คเกจหมดอายุ
  const getButtonText = (pkg: PackageType) => {
    // If not logged in, always show "Select Package"
    if (!isLoggedIn) return "Select Package"

    // If there's a pending package
    if (hasPendingPackage) return "Pending Selection"

    // Check if current package is expired
    const isCurrentPackageExpired = currentPackage && new Date(currentPackage.end_date) < new Date()

    if (currentPackage?.package_id === pkg.id && currentPackage?.payment_status === "completed") {
      return isCurrentPackageExpired ? "Renew Package" : "Current Package"
    }

    if (
      currentPackage?.package_details &&
      currentPackage.payment_status === "completed" &&
      pkg.price <= currentPackage.package_details.price
    ) {
      return isCurrentPackageExpired ? "Select Package" : "Not Available (Lower Tier)"
    }

    return currentPackage?.payment_status === "completed" && !isCurrentPackageExpired
      ? "Upgrade to This Package"
      : "Select Package"
  }

  // แก้ไขฟังก์ชัน handleSelectPackage เพื่อให้ผู้ใช้สามารถเลือกแพ็คเกจได้ทุก Tier เมื่อแพ็คเกจหมดอายุ
  const handleSelectPackage = (pkg: PackageType) => {
    // Check if user is logged in
    if (!isLoggedIn) {
      setSelectedPackage(pkg)
      setIsAuthDialogOpen(true)
      return
    }

    // Check if user has a pending package
    if (hasPendingPackage) {
      toast.error(
        "You already have a pending package selection. Please wait for confirmation before selecting another package.",
      )
      return
    }

    // Check if current package is expired
    const isCurrentPackageExpired = currentPackage && new Date(currentPackage.end_date) < new Date()

    // User is logged in, proceed with package selection logic
    // Check if user is trying to select the same package they already have
    if (
      currentPackage?.package_id === pkg.id &&
      currentPackage?.payment_status === "completed" &&
      !isCurrentPackageExpired
    ) {
      toast.error("You are already subscribed to this package")
      return
    }

    // Check if user is trying to downgrade and current package is not expired
    if (
      currentPackage?.package_details &&
      currentPackage.payment_status === "completed" &&
      pkg.price <= currentPackage.package_details.price &&
      !isCurrentPackageExpired
    ) {
      toast.error("You can only upgrade to a higher-priced package until your current package expires")
      return
    }

    setSelectedPackage(pkg)
    setIsUpgrading(!!currentPackage && currentPackage.payment_status === "completed" && !isCurrentPackageExpired)
    setIsConfirmDialogOpen(true)
  }

  const handleConfirmPackage = async () => {
    if (hasPendingPackage) {
      toast.error(
        "You already have a pending package selection. Please wait for confirmation before selecting another package.",
      )
      setIsConfirmDialogOpen(false)
      return
    }

    if (!selectedPackage || !memberId || !memberEmail || !memberName) return

    try {
      setIsProcessing(true)

      console.log("Confirming package selection:", {
        memberId,
        packageId: selectedPackage.id,
        memberName,
        packageName: selectedPackage.name,
        isUpgrade: isUpgrading,
      })

      // Call the API to select a package
      const response = await fetch("/api/packages/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          packageId: selectedPackage.id,
          memberName,
          packageName: selectedPackage.name,
          isUpgrade: isUpgrading,
        }),
      })

      const responseText = await response.text()
      console.log("API Response:", responseText)

      if (!response.ok) {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { error: responseText || "Failed to select package" }
        }
        throw new Error(errorData.error || "Failed to select package")
      }

      const data = JSON.parse(responseText)
      console.log("Package selection successful:", data)

      toast.success(
        isUpgrading
          ? "Package upgrade request submitted. Please visit the counter to complete payment."
          : "Package selected. Please visit the counter to complete payment.",
      )

      setIsConfirmDialogOpen(false)
      router.push("/profile")
    } catch (error) {
      console.error("Error:", error)
      toast.error(`An error occurred: ${error instanceof Error ? error.message : "Please try again."}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusClasses = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-50 dark:bg-yellow-950/30"
      case "completed":
        return "bg-green-50 dark:bg-green-950/30"
      case "cancelled":
        return "bg-red-50 dark:bg-red-950/30"
      default:
        return ""
    }
  }

  // Get package icon based on package name or price
  const getPackageIcon = (pkg: PackageType, index: number) => {
    // Use different icons based on package tier (assuming packages are ordered by price)
    if (index === 0) return <Coffee className="h-8 w-8 text-blue-500" />
    if (index === 1) return <Zap className="h-8 w-8 text-purple-500" />
    if (index === 2) return <Star className="h-8 w-8 text-amber-500" />
    if (index >= 3) return <Crown className="h-8 w-8 text-rose-500" />

    // Fallback
    return <Shield className="h-8 w-8 text-primary" />
  }

  // Get feature icon based on feature text
  const getFeatureIcon = (feature: string) => {
    const lowerFeature = feature.toLowerCase()

    if (lowerFeature.includes("wifi") || lowerFeature.includes("internet"))
      return <Wifi className="h-4 w-4 text-primary mr-2" />
    if (lowerFeature.includes("print") || lowerFeature.includes("scan"))
      return <Printer className="h-4 w-4 text-primary mr-2" />
    if (lowerFeature.includes("computer") || lowerFeature.includes("desktop") || lowerFeature.includes("workstation"))
      return <Monitor className="h-4 w-4 text-primary mr-2" />
    if (lowerFeature.includes("hour") || lowerFeature.includes("time"))
      return <Clock className="h-4 w-4 text-primary mr-2" />
    if (lowerFeature.includes("day") || lowerFeature.includes("date") || lowerFeature.includes("month"))
      return <Calendar className="h-4 w-4 text-primary mr-2" />
    if (lowerFeature.includes("guest") || lowerFeature.includes("member") || lowerFeature.includes("person"))
      return <Users className="h-4 w-4 text-primary mr-2" />

    // Default icon
    return <CheckCircle2 className="h-4 w-4 text-primary mr-2" />
  }

  // Get gradient background based on package tier
  const getPackageGradient = (index: number) => {
    if (index === 0) return "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20"
    if (index === 1)
      return "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20"
    if (index === 2) return "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20"
    if (index >= 3) return "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20"

    // Fallback
    return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20"
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <Header />

      <div className="bg-primary/5 dark:bg-primary/10 py-12">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Membership Packages
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Choose the perfect membership package that suits your needs and budget
            </p>
            {isLoggedIn ? (
              <p className="text-sm text-muted-foreground">
                Welcome back, {memberName}!{" "}
                {currentPackage ? "Manage your current package or upgrade below." : "Select a package to get started."}
              </p>
            ) : (
              <div className="flex justify-center">
                <Button variant="outline" className="mr-2" onClick={() => router.push("/login")}>
                  Log In
                </Button>
                <Button onClick={() => router.push("/register")}>Sign Up</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 container py-12">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading membership packages...</p>
          </div>
        ) : (
          <>
            {isLoggedIn && currentPackage && member && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                  <Shield className="mr-2 h-6 w-6 text-primary" />
                  Your Current Membership
                </h2>
                <Card className="border-primary overflow-hidden">
                  <div
                    className={cn(
                      "absolute top-0 left-0 w-1 h-full",
                      currentPackage.payment_status === "completed"
                        ? "bg-green-500"
                        : currentPackage.payment_status === "pending"
                          ? "bg-yellow-500"
                          : "bg-red-500",
                    )}
                  />

                  <div className="p-1">
                    <div className={cn("rounded-md", getStatusClasses(currentPackage.payment_status))}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-2xl">
                              Your {currentPackage.package_details?.name} Package
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {currentPackage.package_details?.description ||
                                "You are currently subscribed to this package"}
                            </CardDescription>
                          </div>
                          {new Date(currentPackage.end_date) < new Date() ? (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 hover:bg-red-100 border-red-500 px-3 py-1 text-sm"
                            >
                              <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-red-500"></span>
                              Expired
                            </Badge>
                          ) : (
                            <Badge
                              variant={currentPackage.payment_status === "completed" ? "default" : "outline"}
                              className={cn("px-3 py-1 text-sm", {
                                "bg-green-100 text-green-800 hover:bg-green-100 border-green-500":
                                  currentPackage.payment_status === "completed",
                                "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-500":
                                  currentPackage.payment_status === "pending",
                                "bg-red-100 text-red-800 hover:bg-red-100 border-red-500":
                                  currentPackage.payment_status === "cancelled",
                              })}
                            >
                              <span
                                className={cn("mr-1.5 inline-block w-2 h-2 rounded-full", {
                                  "bg-green-500": currentPackage.payment_status === "completed",
                                  "bg-yellow-500": currentPackage.payment_status === "pending",
                                  "bg-red-500": currentPackage.payment_status === "cancelled",
                                })}
                              ></span>
                              {currentPackage.payment_status === "completed"
                                ? "Active"
                                : currentPackage.payment_status === "pending"
                                  ? "Pending Payment"
                                  : "Cancelled"}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="grid gap-8 md:grid-cols-2">
                          <div className="flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-4"></div>

                              <MembershipCard
                                member={{
                                  member_id: member.member_id,
                                  name: member.name,
                                  email: member.email,
                                  profile_picture_url: member.profile_picture_url,
                                }}
                                memberPackage={currentPackage}
                                className="w-full shadow-md"
                              />
                            </div>

                            {currentPackage.payment_status === "completed" ? (
                              <div className="mt-4 flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground">Started on</p>
                                  <p className="font-medium">
                                    {new Date(currentPackage.start_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Price</p>
                                  <p className="text-xl font-bold text-primary">
                                    ฿{currentPackage.package_details?.price.toFixed(2) || "0.00"}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 text-right">
                                <p className="text-sm text-muted-foreground">Price</p>
                                <p className="text-xl font-bold text-primary">
                                  ฿{currentPackage.package_details?.price.toFixed(2) || "0.00"}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col">
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold mb-1">Package Details</h3>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-background/80 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                                  <Calendar className="h-5 w-5 text-primary mb-1" />
                                  <p className="text-sm font-medium">
                                    {currentPackage.package_details?.duration_days || 0} days
                                  </p>
                                  <p className="text-xs text-muted-foreground">Duration</p>
                                </div>
                                <div className="bg-background/80 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                                  <Shield className="h-5 w-5 text-primary mb-1" />
                                  <p className="text-sm font-medium">Premium</p>
                                  <p className="text-xs text-muted-foreground">Access Level</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-2">Features</h3>
                              <div className="bg-background/80 rounded-lg p-4">
                                <ul className="space-y-2">
                                  {currentPackage.package_details?.features.map((feature, index) => (
                                    <li key={index} className="flex items-start">
                                      {getFeatureIcon(feature)}
                                      <span className="text-sm">{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {currentPackage.payment_status === "completed" && (
                              <div className="mt-4">
                                <Button variant="outline" className="w-full" onClick={() => router.push("/profile")}>
                                  Manage Membership
                                </Button>
                              </div>
                            )}

                            {currentPackage.payment_status === "pending" && (
                              <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                <div className="flex items-start">
                                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                      Payment Pending
                                    </p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                      Please visit the counter to complete your payment and activate your membership.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </div>
                </Card>
                {currentPackage.payment_status === "completed" && new Date(currentPackage.end_date) < new Date() && (
                  <CardFooter className="bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 rounded-b-lg">
                    <div className="flex items-start w-full">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Your package has expired</p>
                        <p className="text-xs text-red-700 dark:text-red-400">
                          Please select a new package below to continue enjoying our services.
                        </p>
                      </div>
                    </div>
                  </CardFooter>
                )}
              </div>
            )}

            {isLoggedIn && hasPendingPackage && !currentPackage && (
              <div className="mb-8">
                <Alert
                  variant="warning"
                  className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                >
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                  <AlertTitle className="text-amber-800 dark:text-amber-300">Pending Package</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    You have a pending package selection. Please visit the counter to complete your payment. You can
                    only select one package at a time until it's confirmed.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {!isLoggedIn && (
              <div className="mb-10">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 shadow-sm border border-blue-100 dark:border-blue-900">
                  <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl font-semibold text-blue-800 dark:text-blue-300 mb-2">
                      Browse Our Membership Packages
                    </h2>
                    <p className="text-blue-700 dark:text-blue-400">
                      Select a package below to get started. You'll need to log in or create an account to complete your
                      purchase.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Available Packages</h2>
              <p className="text-muted-foreground mb-6">
                Choose from our range of membership packages designed to suit different needs and preferences
              </p>

              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg, index) => (
                  <Card
                    key={pkg.id}
                    className={cn(
                      "flex flex-col overflow-hidden border-t-4 transition-all hover:shadow-md",
                      index === 0
                        ? "border-t-blue-500"
                        : index === 1
                          ? "border-t-purple-500"
                          : index === 2
                            ? "border-t-amber-500"
                            : "border-t-rose-500",
                    )}
                  >
                    <CardHeader className={cn("pb-2", getPackageGradient(index))}>
                      <div className="flex justify-between items-start">
                        {getPackageIcon(pkg, index)}
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium",
                            index === 0
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : index === 1
                                ? "bg-purple-100 text-purple-800 border-purple-300"
                                : index === 2
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : "bg-rose-100 text-rose-800 border-rose-300",
                          )}
                        >
                          {index === 0 ? "Basic" : index === 1 ? "Standard" : index === 2 ? "Premium" : "Ultimate"}
                        </Badge>
                      </div>
                      <CardTitle className="mt-4 text-xl">{pkg.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {pkg.description || "Perfect for your coworking needs"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4 flex-1">
                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold">฿{pkg.price.toFixed(2)}</span>
                          <span className="text-sm text-muted-foreground ml-1">for {pkg.duration_days} days</span>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div>
                        <p className="font-medium text-sm mb-3">What's included:</p>
                        <ul className="space-y-2">
                          {pkg.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start">
                              {getFeatureIcon(feature)}
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 mt-auto">
                      <Button
                        className={cn(
                          "w-full",
                          index === 0
                            ? "bg-blue-600 hover:bg-blue-700"
                            : index === 1
                              ? "bg-purple-600 hover:bg-purple-700"
                              : index === 2
                                ? "bg-amber-600 hover:bg-amber-700"
                                : "bg-rose-600 hover:bg-rose-700",
                        )}
                        onClick={() => handleSelectPackage(pkg)}
                        disabled={isPackageDisabled(pkg)}
                      >
                        {getButtonText(pkg)}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>

            <div className="mt-12 bg-muted/50 rounded-lg p-6">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl font-semibold mb-2">Need Help Choosing?</h2>
                <p className="text-muted-foreground mb-4">
                  Our team is ready to help you find the perfect membership package for your needs.
                </p>
                <Button variant="outline" onClick={() => router.push("/contact")}>
                  Contact Us
                </Button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Package confirmation dialog for logged-in users */}
      <PackageConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        packageDetails={selectedPackage}
        onConfirm={handleConfirmPackage}
        isUpgrade={isUpgrading}
        isProcessing={isProcessing}
      />

      {/* Authentication dialog for non-logged-in users */}
      <AuthDialog
        isOpen={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
        packageName={selectedPackage?.name || "selected"}
      />
    </div>
  )
}
