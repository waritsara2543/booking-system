"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Header } from "@/components/header"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  Check,
  Download,
} from "lucide-react"
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
import { generateWifiCredentialsExcel, downloadExcel } from "@/lib/excel-utils"
import { format } from "date-fns"
import * as XLSX from "xlsx"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

type WiFiCredential = {
  id: string
  username: string
  password: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  in_use: boolean
}

export default function WiFiCredentialsPage() {
  const router = useRouter()
  const [credentials, setCredentials] = useState<WiFiCredential[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [isExporting, setIsExporting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importValidation, setImportValidation] = useState<{
    valid: boolean
    message: string
    data: any[]
  }>({ valid: false, message: "", data: [] })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check if user is admin
    const adminCookie = Cookies.get("isAdmin")
    if (adminCookie !== "true") {
      router.push("/admin-login")
      return
    }

    fetchCredentials()
  }, [router])

  async function fetchCredentials() {
    try {
      setIsLoading(true)
      setError(null)

      // Get all WiFi credentials
      const { data: credentialsData, error: credentialsError } = await supabase
        .from("wifi_credentials")
        .select("*")
        .order("created_at", { ascending: false })

      if (credentialsError) throw credentialsError

      // Check which credentials are in use
      const { data: memberPackagesData, error: memberPackagesError } = await supabase
        .from("member_packages")
        .select("wifi_credential_id")
        .eq("is_current", true)

      if (memberPackagesError) throw memberPackagesError

      // Create a set of credential IDs that are in use
      const inUseCredentialIds = new Set(
        memberPackagesData?.map((memberPackage) => memberPackage.wifi_credential_id) || [],
      )

      // Add the in_use property to each credential
      const credentialsWithUsage =
        credentialsData?.map((credential) => ({
          ...credential,
          in_use: inUseCredentialIds.has(credential.id),
        })) || []

      setCredentials(credentialsWithUsage)
    } catch (err) {
      console.error("Error fetching WiFi credentials:", err)
      setError("Failed to load WiFi credentials")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteCredential(id: string) {
    try {
      setIsDeleting(id)

      // Check if credential is in use
      const credential = credentials.find((c) => c.id === id)
      if (credential?.in_use) {
        toast.error("Cannot delete a WiFi credential that is currently in use")
        return
      }

      // Delete the credential
      const { error: deleteError } = await supabase.from("wifi_credentials").delete().eq("id", id)

      if (deleteError) throw deleteError

      toast.success("WiFi credential deleted successfully")

      // Update the credentials list
      setCredentials(credentials.filter((credential) => credential.id !== id))
    } catch (err) {
      console.error("Error deleting WiFi credential:", err)
      toast.error("Failed to delete WiFi credential")
    } finally {
      setIsDeleting(null)
    }
  }

  function togglePasswordVisibility(id: string) {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${type} copied to clipboard`)
  }

  async function handleExportExcel() {
    try {
      setIsExporting(true)

      // Prepare data for export (mask passwords for security)
      const exportData = credentials.map((credential) => ({
        ...credential,
        password: "••••••••••••", // Mask passwords in the export
      }))

      // Generate Excel file
      const title = `WiFi Credentials Report - ${format(new Date(), "yyyy-MM-dd")}`
      const wb = generateWifiCredentialsExcel(exportData, title)

      // Download the file
      downloadExcel(wb, `wifi-credentials-${format(new Date(), "yyyy-MM-dd")}.xlsx`)

      toast.success("WiFi credentials exported successfully as Excel")
    } catch (error) {
      console.error("Error exporting WiFi credentials:", error)
      toast.error("Failed to export WiFi credentials")
    } finally {
      setIsExporting(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) {
      setImportFile(null)
      setImportData([])
      setImportValidation({ valid: false, message: "", data: [] })
      return
    }

    const file = e.target.files[0]
    setImportFile(file)

    // Read the file
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "binary" })

        // Get the first sheet
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet)
        setImportData(jsonData)

        // Validate the data
        validateImportData(jsonData)
      } catch (error) {
        console.error("Error reading Excel file:", error)
        setImportValidation({
          valid: false,
          message: "Error reading Excel file. Please make sure it's a valid Excel file.",
          data: [],
        })
      }
    }

    reader.onerror = () => {
      setImportValidation({
        valid: false,
        message: "Error reading the file. Please try again.",
        data: [],
      })
    }

    // Read as binary string
    reader.readAsBinaryString(file)
  }

  function validateImportData(data: any[]) {
    // Check if data is empty
    if (!data || data.length === 0) {
      setImportValidation({
        valid: false,
        message: "The file doesn't contain any data.",
        data: [],
      })
      return
    }

    // Check required columns
    const requiredColumns = ["Username", "Password"]
    const firstRow = data[0]

    const missingColumns = requiredColumns.filter((col) => !(col in firstRow))
    if (missingColumns.length > 0) {
      setImportValidation({
        valid: false,
        message: `Missing required columns: ${missingColumns.join(", ")}`,
        data: [],
      })
      return
    }

    // Format data for validation
    const formattedData = data.map((row, index) => {
      // Validate required fields
      if (!row.Username || !row.Password) {
        return {
          ...row,
          valid: false,
          error: "Username and Password are required",
        }
      }

      // Check for username length
      if (row.Username.length < 3 || row.Username.length > 50) {
        return {
          ...row,
          valid: false,
          error: "Username must be between 3 and 50 characters",
        }
      }

      // Check for password strength
      if (row.Password.length < 6) {
        return {
          ...row,
          valid: false,
          error: "Password must be at least 6 characters",
        }
      }

      return {
        ...row,
        valid: true,
        error: "",
      }
    })

    // Check if any rows have validation errors
    const invalidRows = formattedData.filter((row) => !row.valid)

    if (invalidRows.length > 0) {
      setImportValidation({
        valid: false,
        message: `${invalidRows.length} row(s) have validation errors. Please fix them before importing.`,
        data: formattedData,
      })
    } else {
      setImportValidation({
        valid: true,
        message: `${formattedData.length} WiFi credentials are ready to import.`,
        data: formattedData,
      })
    }
  }

  async function handleImport() {
    if (!importValidation.valid || importValidation.data.length === 0) {
      return
    }

    try {
      setIsImporting(true)
      setImportProgress(0)

      const totalRows = importValidation.data.length
      let processedRows = 0
      let successfulImports = 0
      let failedImports = 0

      for (const row of importValidation.data) {
        try {
          // Check if a credential with the same username already exists
          const { data: existingData, error: existingError } = await supabase
            .from("wifi_credentials")
            .select("id")
            .eq("username", row.Username)
            .limit(1)

          if (existingError) throw existingError

          if (existingData && existingData.length > 0) {
            failedImports++
            console.warn(`Credential with username ${row.Username} already exists.`)
          } else {
            // Insert new credential
            const { error: insertError } = await supabase.from("wifi_credentials").insert([
              {
                username: row.Username,
                password: row.Password,
                is_active: row.Status === "Active" || row.Status === undefined ? true : false,
                notes: row.Notes || null,
              },
            ])

            if (insertError) throw insertError
            successfulImports++
          }
        } catch (error) {
          console.error("Error importing credential:", error)
          failedImports++
        }

        // Update progress
        processedRows++
        setImportProgress(Math.round((processedRows / totalRows) * 100))
      }

      // Show results
      toast.success(`Import completed: ${successfulImports} credentials imported, ${failedImports} failed`)

      // Refresh the credentials list
      await fetchCredentials()

      // Close dialog and reset state
      setImportDialogOpen(false)
      setImportFile(null)
      setImportData([])
      setImportValidation({ valid: false, message: "", data: [] })

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error importing credentials:", error)
      toast.error("Failed to import WiFi credentials")
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }

  function handleDownloadTemplate() {
    // Create sample data
    const sampleData = [
      {
        Username: "sample_user1",
        Password: "password123",
        Status: "Active",
        Notes: "Sample credential 1",
      },
      {
        Username: "sample_user2",
        Password: "secure456",
        Status: "Inactive",
        Notes: "Sample credential 2",
      },
    ]

    // Create a new workbook
    const wb = XLSX.utils.book_new()

    // Create a worksheet from the sample data
    const ws = XLSX.utils.json_to_sheet(sampleData)

    // Set column widths
    ws["!cols"] = [
      { wch: 20 }, // Username
      { wch: 20 }, // Password
      { wch: 10 }, // Status
      { wch: 30 }, // Notes
    ]

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Template")

    // Create a worksheet for instructions
    const instructionsData = [
      ["WiFi Credentials Import Template Instructions"],
      [""],
      ["Required Columns:"],
      ["Username", "Username for the WiFi credential (Required)"],
      ["Password", "Password for the WiFi credential (Required)"],
      [""],
      ["Optional Columns:"],
      ["Status", "Active or Inactive (Defaults to Active if empty)"],
      ["Notes", "Additional notes about the credential"],
    ]

    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData)

    // Set column widths for instructions
    instructionsWs["!cols"] = [{ wch: 25 }, { wch: 50 }]

    // Add the instructions worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions")

    // Download the file
    downloadExcel(wb, "wifi-credentials-import-template.xlsx")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
        <AdminSidebar />
        <main className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">WiFi Credentials</h1>
              <p className="text-muted-foreground">Manage WiFi credentials for members.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadTemplate} size="sm" className="hidden sm:flex">
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
              <Button variant="outline" onClick={() => setImportDialogOpen(true)} disabled={isExporting}>
                <Upload className="mr-2 h-4 w-4" />
                Import Excel
              </Button>
              <Button variant="outline" onClick={handleExportExcel} disabled={isExporting || credentials.length === 0}>
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Excel
                  </>
                )}
              </Button>
              <Link href="/admin/wifi/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Credential
                </Button>
              </Link>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>WiFi Credentials</CardTitle>
              <CardDescription>View and manage all WiFi credentials in your system.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchCredentials}>
                    Try Again
                  </Button>
                </div>
              ) : credentials.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No WiFi credentials found</p>
                  <Link href="/admin/wifi/new">
                    <Button>Add Your First Credential</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {credentials.map((credential) => (
                          <TableRow key={credential.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {credential.username}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(credential.username, "Username")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {showPasswords[credential.id] ? credential.password : <span>••••••••••••</span>}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => togglePasswordVisibility(credential.id)}
                                >
                                  {showPasswords[credential.id] ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(credential.password, "Password")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={credential.is_active ? "default" : "secondary"}>
                                {credential.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{credential.notes || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={credential.in_use ? "outline" : "secondary"}>
                                {credential.in_use ? "In Use" : "Available"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/admin/wifi/${credential.id}`}>
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
                                      disabled={credential.in_use}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the WiFi credential "{credential.username}". This
                                        action cannot be undone.
                                        {credential.in_use && (
                                          <p className="text-destructive mt-2">
                                            Warning: This credential is currently in use. You cannot delete a credential
                                            that is assigned to members.
                                          </p>
                                        )}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteCredential(credential.id)}
                                        disabled={isDeleting === credential.id || credential.in_use}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {isDeleting === credential.id ? (
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

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import WiFi Credentials</DialogTitle>
            <DialogDescription>
              Upload an Excel file with WiFi credentials to import them into the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isImporting && (
              <>
                <div className="flex flex-col gap-2">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      id="import-file"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById("import-file")?.click()}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {importFile ? "Change File" : "Select Excel File"}
                      </Button>
                      <Button variant="outline" onClick={handleDownloadTemplate} size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    {importFile && <p className="text-sm text-muted-foreground">Selected: {importFile.name}</p>}
                  </div>
                </div>

                {importFile && importValidation.message && (
                  <div
                    className={`p-4 rounded-md ${importValidation.valid ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                  >
                    <div className="flex">
                      <div className="flex-shrink-0">
                        {importValidation.valid ? (
                          <Check className="h-5 w-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm ${importValidation.valid ? "text-green-700" : "text-red-700"}`}>
                          {importValidation.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {importValidation.data.length > 0 && !importValidation.valid && (
                  <div className="mt-4 border rounded-md max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importValidation.data
                          .filter((row) => !row.valid)
                          .map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{row.Username}</TableCell>
                              <TableCell className="text-red-500">{row.error}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {importValidation.data.length > 0 && importValidation.valid && (
                  <div className="mt-4 border rounded-md max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importValidation.data.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.Username}</TableCell>
                            <TableCell>••••••••</TableCell>
                            <TableCell>{row.Status || "Active"}</TableCell>
                          </TableRow>
                        ))}
                        {importValidation.data.length > 5 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              And {importValidation.data.length - 5} more...
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {isImporting && (
              <div className="space-y-4 py-4">
                <Progress value={importProgress} />
                <p className="text-center text-sm text-muted-foreground">Importing credentials... {importProgress}%</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importValidation.valid || isImporting || importValidation.data.length === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Credentials"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
