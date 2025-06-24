"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { Loader2, Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { downloadExcel } from "@/lib/excel-utils"
import * as XLSX from "xlsx"

type Package = {
  id: string
  name: string
  description: string | null
  price: number
  duration_days: number
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  member_count: number
}

export default function PackagesPage() {
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    fetchPackages()
  }, [router])

  async function fetchPackages() {
    try {
      setIsLoading(true)
      setError(null)

      // Get all packages
      const { data: packagesData, error: packagesError } = await supabase
        .from("packages")
        .select("*")
        .order("price", { ascending: true })

      if (packagesError) throw packagesError

      // Get member counts for each package
      const packagesWithCounts = await Promise.all(
        packagesData?.map(async (pkg) => {
          const { count, error: countError } = await supabase
            .from("member_packages")
            .select("*", { count: "exact", head: true })
            .eq("package_id", pkg.id)
            .eq("is_current", true)

          if (countError) {
            console.error(`Error getting member count for package ${pkg.id}:`, countError)
            return { ...pkg, member_count: 0, features: JSON.parse(pkg.features as unknown as string) }
          }

          return {
            ...pkg,
            member_count: count || 0,
            features: Array.isArray(pkg.features) ? pkg.features : JSON.parse(pkg.features as unknown as string),
          }
        }) || [],
      )

      setPackages(packagesWithCounts)
    } catch (err) {
      console.error("Error fetching packages:", err)
      setError("Failed to load packages")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeletePackage(id: string) {
    try {
      setIsDeleting(id)

      // Check if package is in use
      const pkg = packages.find((p) => p.id === id)
      if (pkg?.member_count && pkg.member_count > 0) {
        toast.error("Cannot delete a package that is currently assigned to members")
        return
      }

      // Delete the package
      const { error: deleteError } = await supabase.from("packages").delete().eq("id", id)

      if (deleteError) throw deleteError

      toast.success("Package deleted successfully")

      // Update the packages list
      setPackages(packages.filter((pkg) => pkg.id !== id))
    } catch (err) {
      console.error("Error deleting package:", err)
      toast.error("Failed to delete package")
    } finally {
      setIsDeleting(null)
    }
  }

  async function exportToExcel() {
    try {
      setIsLoading(true)

      // Format data for Excel
      const formattedData = packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || "",
        price: pkg.price,
        duration_days: pkg.duration_days,
        features: Array.isArray(pkg.features) ? pkg.features.join(", ") : "",
        is_active: pkg.is_active ? "Active" : "Inactive",
        member_count: pkg.member_count || 0,
        created_at: pkg.created_at,
        updated_at: pkg.updated_at,
      }))

      // Generate Excel workbook using the utility function
      const wb = XLSX.utils.book_new()

      // Create main data worksheet
      const ws = XLSX.utils.json_to_sheet(formattedData)
      XLSX.utils.book_append_sheet(wb, ws, "Packages")

      // Set column widths
      ws["!cols"] = [
        { wch: 10 }, // id
        { wch: 25 }, // name
        { wch: 40 }, // description
        { wch: 10 }, // price
        { wch: 15 }, // duration_days
        { wch: 40 }, // features
        { wch: 10 }, // is_active
        { wch: 15 }, // member_count
        { wch: 20 }, // created_at
        { wch: 20 }, // updated_at
      ]

      // Create summary worksheet
      const totalPackages = packages.length
      const activePackages = packages.filter((pkg) => pkg.is_active).length
      const totalMembers = packages.reduce((sum, pkg) => sum + (pkg.member_count || 0), 0)

      const summaryData = [
        ["Packages Summary"],
        ["Total Packages", totalPackages],
        ["Active Packages", activePackages],
        ["Inactive Packages", totalPackages - activePackages],
        ["Total Members", totalMembers],
        ["Generated On", new Date().toLocaleString()],
      ]

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary")

      // Download the Excel file
      downloadExcel(wb, `membership-packages-${new Date().toISOString().split("T")[0]}.xlsx`)

      toast.success("Excel file downloaded successfully")
    } catch (err) {
      console.error("Error exporting to Excel:", err)
      toast.error("Failed to export data to Excel")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Membership Packages</h1>
              <p className="text-muted-foreground">Manage membership packages and their features.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel} disabled={isLoading || packages.length === 0}>
                <Loader2 className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : "hidden"}`} />
                Export Excel
              </Button>
              <Link href="/admin/packages/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Package
                </Button>
              </Link>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Membership Packages</CardTitle>
              <CardDescription>View and manage all membership packages in your system.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchPackages}>
                    Try Again
                  </Button>
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No packages found</p>
                  <Link href="/admin/packages/new">
                    <Button>Add Your First Package</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Features</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {packages.map((pkg) => (
                          <TableRow key={pkg.id}>
                            <TableCell className="font-medium">{pkg.name}</TableCell>
                            <TableCell>฿{pkg.price.toFixed(2)}</TableCell>
                            <TableCell>{pkg.duration_days} days</TableCell>
                            <TableCell className="max-w-[200px]">
                              <div className="flex flex-wrap gap-1">
                                {pkg.features.slice(0, 2).map((feature, index) => (
                                  <Badge key={index} variant="outline" className="mr-1">
                                    {feature}
                                  </Badge>
                                ))}
                                {pkg.features.length > 2 && (
                                  <Badge variant="outline">+{pkg.features.length - 2} more</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {pkg.is_active ? (
                                <div className="flex items-center">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                                  <span>Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <XCircle className="h-4 w-4 text-red-500 mr-1" />
                                  <span>Inactive</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{pkg.member_count} members</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/admin/packages/${pkg.id}`}>
                                  <Button size="sm" variant="ghost">
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                </Link>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      disabled={pkg.member_count > 0}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the package "{pkg.name}". This action cannot be
                                        undone.
                                        {pkg.member_count > 0 && (
                                          <p className="text-destructive mt-2">
                                            Warning: This package is currently assigned to {pkg.member_count} members.
                                            You cannot delete a package that is in use.
                                          </p>
                                        )}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeletePackage(pkg.id)}
                                        disabled={isDeleting === pkg.id || pkg.member_count > 0}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {isDeleting === pkg.id ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Deleting...
                                          </>
                                        ) : (
                                          "Delete"
                                        )}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
