"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminSidebar } from "@/components/admin-sidebar";
import {
  ArrowLeft,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Package,
  User,
  Wallet,
  Wifi,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/header";
import { createPackageAdminNotification } from "@/lib/notification-utils";

type MemberPackage = {
  id: string;
  member_id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  payment_status: string;
  is_current: boolean;
  wifi_credential_id?: string | null;
  created_at: string;
  payment_method: string;
  slip_image?: string | null;
};

type Member = {
  id: string;
  member_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
};

type PackageDetails = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  features: string[] | string;
  is_active: boolean;
};

type WifiCredential = {
  id: string;
  username: string;
  password: string;
  is_assigned: boolean;
  is_active: boolean;
  created_at: string;
};

export default function MemberPackageDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [memberPackage, setMemberPackage] = useState<MemberPackage | null>(
    null
  );
  const [member, setMember] = useState<Member | null>(null);
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(
    null
  );
  const [wifiCredential, setWifiCredential] = useState<WifiCredential | null>(
    null
  );
  const [availableWifiCredentials, setAvailableWifiCredentials] = useState<
    WifiCredential[]
  >([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [selectedWifiCredential, setSelectedWifiCredential] =
    useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchMemberPackageDetails();
  }, [params.id]);

  async function fetchMemberPackageDetails() {
    try {
      setIsLoading(true);
      const { data: packageData, error: packageError } = await supabase
        .from("member_packages")
        .select("*")
        .eq("id", params.id)
        .single();

      if (packageError) {
        console.error("Error fetching member package:", packageError);
        toast.error("Failed to load member package details");
        return;
      }

      setMemberPackage(packageData);

      // Fetch member details
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", packageData.member_id)
        .single();

      if (memberError) {
        console.error("Error fetching member:", memberError);
      } else {
        setMember(memberData);
      }

      // Fetch package details
      const { data: pkgData, error: pkgError } = await supabase
        .from("packages")
        .select("*")
        .eq("id", packageData.package_id)
        .single();

      if (pkgError) {
        console.error("Error fetching package:", pkgError);
      } else {
        // Parse features if they are stored as a JSON string
        if (typeof pkgData.features === "string") {
          pkgData.features = JSON.parse(pkgData.features);
        }
        setPackageDetails(pkgData);
      }

      // Fetch WiFi credential if assigned
      if (packageData.wifi_credential_id) {
        const { data: wifiData, error: wifiError } = await supabase
          .from("wifi_credentials")
          .select("*")
          .eq("id", packageData.wifi_credential_id)
          .single();

        if (wifiError) {
          console.error("Error fetching WiFi credential:", wifiError);
        } else {
          setWifiCredential(wifiData);
        }
      }

      // Fetch available WiFi credentials
      try {
        // First, check if the is_assigned column exists
        const { data: columnInfo, error: columnError } = await supabase
          .from("wifi_credentials")
          .select("id")
          .limit(1);

        if (columnError) {
          console.error("Error checking wifi_credentials table:", columnError);
        }

        // Determine which query to use based on the table structure
        let query = supabase
          .from("wifi_credentials")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        // Check if the table has is_assigned column
        const { data: tableInfo, error: tableError } = await supabase.rpc(
          "check_column_exists",
          {
            table_name: "wifi_credentials",
            column_name: "is_assigned",
          }
        );

        if (tableError) {
          console.error("Error checking column existence:", tableError);
        } else {
          const hasIsAssigned = tableInfo;

          if (hasIsAssigned) {
            // If is_assigned column exists, use it in the query
            query = query.eq("is_assigned", false);
          } else {
            // Otherwise, use a different approach
            // Get all wifi credentials that are not assigned to any package
            const { data: assignedCredentials, error: assignedError } =
              await supabase
                .from("member_packages")
                .select("wifi_credential_id")
                .not("wifi_credential_id", "is", null);

            if (assignedError) {
              console.error(
                "Error fetching assigned credentials:",
                assignedError
              );
            } else {
              // Get the IDs of assigned credentials
              const assignedIds = assignedCredentials.map(
                (item) => item.wifi_credential_id
              );

              // If there are assigned credentials, exclude them from the query
              if (assignedIds.length > 0) {
                query = query.not("id", "in", assignedIds);
              }
            }
          }
        }

        // Execute the final query
        const { data: availableWifi, error: availableWifiError } = await query;

        if (availableWifiError) {
          console.error(
            "Error fetching available WiFi credentials:",
            availableWifiError
          );
        } else {
          setAvailableWifiCredentials(availableWifi || []);
        }
      } catch (error) {
        console.error("Error fetching available WiFi credentials:", error);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while loading data");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmPayment() {
    if (!selectedWifiCredential) {
      toast.error("Please select a WiFi credential to assign");
      return;
    }

    try {
      setIsProcessing(true);

      const response = await fetch("/api/packages/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageSelectionId: params.id,
          status: "completed",
          wifiCredentialId: selectedWifiCredential || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to confirm payment");
      }

      toast.success("Payment confirmed and WiFi credential assigned");
      setIsConfirmDialogOpen(false);
      fetchMemberPackageDetails(); // Refresh data
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex-1 container grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 py-8">
          <AdminSidebar />
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
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
            <h1 className="text-2xl font-bold">Member Package Details</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Member Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Member Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {member ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{member.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Member ID</p>
                      <p className="font-medium">{member.member_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{member.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{member.phone}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Member information not available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Package Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Package Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {packageDetails ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Package Name
                      </p>
                      <p className="font-medium">{packageDetails.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Description
                      </p>
                      <p className="font-medium">
                        {packageDetails.description || "No description"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">
                        ฿{packageDetails.price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {packageDetails.duration_days} days
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Package information not available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Subscription Details */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Subscription Details
                  </CardTitle>
                  <Badge
                    variant={
                      memberPackage?.payment_status === "completed"
                        ? "default"
                        : memberPackage?.payment_status === "pending"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {memberPackage?.payment_status}
                  </Badge>
                </div>
                <CardDescription>
                  {memberPackage?.is_current
                    ? "Current active subscription"
                    : "Inactive subscription"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {memberPackage ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Start Date
                      </p>
                      <p className="font-medium">
                        {format(new Date(memberPackage.start_date), "PPP")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">
                        {format(new Date(memberPackage.end_date), "PPP")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Subscription Status
                      </p>
                      <p className="font-medium">
                        {memberPackage.is_current ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Subscription details not available
                  </p>
                )}
              </CardContent>
              <CardFooter>
                {memberPackage?.payment_status === "pending" && (
                  <Button
                    onClick={() => setIsConfirmDialogOpen(true)}
                    className="w-full"
                  >
                    Confirm Payment
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          {/* WiFi Credentials Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wifi className="h-5 w-5 mr-2" />
                WiFi Credentials
              </CardTitle>
              <CardDescription>
                {wifiCredential
                  ? "WiFi credentials assigned to this package"
                  : "No WiFi credentials assigned to this package yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wifiCredential ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">{wifiCredential.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Password</p>
                    <div className="flex items-center">
                      <p className="font-medium mr-2">
                        {showPassword
                          ? wifiCredential.password
                          : "••••••••••••"}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-8 w-8"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {memberPackage?.payment_status === "pending"
                    ? "WiFi credentials will be assigned when payment is confirmed"
                    : "No WiFi credentials have been assigned"}
                </p>
              )}
            </CardContent>
          </Card>

          {/*payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Payment
              </CardTitle>
              <CardDescription>
                {memberPackage?.payment_status === "completed"
                  ? "Payment has been completed for this package"
                  : "Payment is pending for this package"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Payment Method
                  </p>
                  <p className="font-medium">
                    {memberPackage?.payment_method || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Slip Image</p>
                  {memberPackage?.slip_image ? (
                    <img
                      src={memberPackage.slip_image}
                      alt="Payment Slip"
                      className="w-full h-auto rounded-md"
                    />
                  ) : (
                    <p className="text-muted-foreground">
                      No payment slip uploaded
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Confirm Payment Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Package Payment</DialogTitle>
            <DialogDescription>
              Confirm payment for this package and assign WiFi credentials to
              the member.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">
                  Select WiFi Credentials to Assign
                </p>
                <Select
                  value={selectedWifiCredential}
                  onValueChange={setSelectedWifiCredential}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select WiFi credentials" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWifiCredentials.length > 0 ? (
                      availableWifiCredentials.map((wifi) => (
                        <SelectItem key={wifi.id} value={wifi.id}>
                          {wifi.username}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No available WiFi credentials
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  This will mark the payment as completed, assign the selected
                  WiFi credentials to the member, and send a confirmation email
                  with the WiFi details.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={isProcessing || !selectedWifiCredential}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
