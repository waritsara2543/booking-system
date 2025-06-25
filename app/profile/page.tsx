"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
  User,
  Mail,
  Phone,
  Save,
  Package,
  Wifi,
  CheckCircle2,
  Calendar,
  Clock,
  CreditCard,
  Award,
  ChevronRight,
  Edit,
  Shield,
  UserCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { isAfter, parseISO, format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { InteractiveMembershipCard } from "@/components/interactive-membership-card";
import { TestUserNotificationButton } from "@/components/test-user-notification-button";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional(),
  phone: z.string().min(5, {
    message: "Please enter a valid phone number.",
  }),
  position: z.string().optional(),
  bio: z.string().optional(),
});

type Member = {
  id: string;
  member_id: string;
  name: string;
  email: string;
  phone: string;
  position?: string;
  bio?: string;
  verified: boolean;
  created_at: string;
  profile_picture_url?: string;
};

type MemberPackage = {
  id: string;
  package_id: string;
  start_date: string;
  end_date: string;
  payment_status: string;
  payment_method?: string;
  payment_amount?: number;
  payment_date?: string;
  wifi_credential_id?: string;
  is_current: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_upgrade?: boolean;
  package_details: {
    id: string;
    name: string;
    description?: string;
    price: number;
    duration_days: number;
    features: string[];
    is_active: boolean;
    card_design_url?: string;
  };
  wifi_credentials?: {
    id: string;
    username: string;
    password: string;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberPackage, setMemberPackage] = useState<MemberPackage | null>(
    null
  );
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("");
  const [membershipProgress, setMembershipProgress] = useState(0);
  const [pendingPackage, setPendingPackage] = useState<MemberPackage | null>(
    null
  );
  const [upgradePackage, setUpgradePackage] = useState<MemberPackage | null>(
    null
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      position: "",
      bio: "",
    },
  });

  useEffect(() => {
    // Check if user is logged in
    try {
      const storedMemberId = localStorage.getItem("memberId");
      const memberEmail = localStorage.getItem("memberEmail");

      if (!storedMemberId || !memberEmail) {
        router.push("/login");
        return;
      }

      setMemberId(storedMemberId);
      fetchMemberDetails(storedMemberId);
      fetchAllPackages(storedMemberId);
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (memberPackage) {
      // Calculate membership progress
      const startDate = new Date(memberPackage.start_date).getTime();
      const endDate = new Date(memberPackage.end_date).getTime();
      const currentDate = new Date().getTime();

      const totalDuration = endDate - startDate;
      const elapsed = currentDate - startDate;

      const progress = Math.max(
        0,
        Math.min(100, (elapsed / totalDuration) * 100)
      );
      setMembershipProgress(progress);
    }
  }, [memberPackage]);

  async function fetchMemberDetails(memberId: string) {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", memberId)
        .single();

      if (error) {
        console.error("Error fetching member details:", error);
        throw new Error("Failed to load your profile. Please try again.");
      }

      if (!data) {
        throw new Error("Member not found");
      }

      setMember(data);

      // Validate profile picture URL before setting it
      const pictureUrl = data.profile_picture_url;
      if (
        pictureUrl &&
        typeof pictureUrl === "string" &&
        pictureUrl.trim() !== ""
      ) {
        setProfilePictureUrl(pictureUrl);
      } else {
        setProfilePictureUrl("");
      }

      // Set form values
      form.reset({
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        position: data.position || "",
        bio: data.bio || "",
      });
    } catch (err) {
      console.error("Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAllPackages(memberId: string) {
    try {
      console.log("Fetching all packages for member:", memberId);

      // Reset states
      setMemberPackage(null);
      setPendingPackage(null);
      setUpgradePackage(null);

      // Get all packages for this member
      const { data: allPackages, error } = await supabase
        .from("member_packages")
        .select(
          `
        *,
        package_details:package_id (
          id, name, description, price, duration_days, features, is_active, card_design_url
        ),
        wifi_credentials:wifi_credential_id (
          id, username, password
        )
      `
        )
        .eq("member_id", memberId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching packages:", error);
        return;
      }

      console.log("All packages found:", allPackages);

      if (allPackages && allPackages.length > 0) {
        // Parse features for all packages
        allPackages.forEach((pkg) => {
          if (
            pkg.package_details &&
            typeof pkg.package_details.features === "string"
          ) {
            pkg.package_details.features = JSON.parse(
              pkg.package_details.features
            );
          }
        });

        // Find current active package
        const currentPackage = allPackages.find(
          (pkg) => pkg.is_current === true && pkg.payment_status === "completed"
        );

        // Find pending upgrade package
        const pendingUpgrade = allPackages.find(
          (pkg) => pkg.payment_status === "pending" && pkg.is_upgrade === true
        );

        // Find regular pending package (not upgrade)
        const pendingRegular = allPackages.find(
          (pkg) =>
            pkg.payment_status === "pending" &&
            (pkg.is_upgrade === false || pkg.is_upgrade === null)
        );

        console.log("Package categorization:", {
          currentPackage: currentPackage?.id,
          pendingUpgrade: pendingUpgrade?.id,
          pendingRegular: pendingRegular?.id,
        });

        if (currentPackage) {
          setMemberPackage(currentPackage);
        }

        if (pendingUpgrade) {
          setUpgradePackage(pendingUpgrade);
        }

        if (pendingRegular && !currentPackage) {
          setPendingPackage(pendingRegular);
        }
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  }

  async function refreshPackages() {
    if (!memberId) return;

    setIsRefreshing(true);
    try {
      await fetchAllPackages(memberId);
      toast.success("Package information refreshed");
    } catch (error) {
      console.error("Error refreshing packages:", error);
      toast.error("Failed to refresh package information");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!member) return;

    try {
      setIsSaving(true);
      setError(null);

      // Update member details
      const { error } = await supabase
        .from("members")
        .update({
          name: values.name,
          phone: values.phone,
          position: values.position,
          bio: values.bio,
          profile_picture_url: profilePictureUrl,
        })
        .eq("id", member.id);

      if (error) throw error;

      // Update local storage
      localStorage.setItem("memberName", values.name);

      // Update state
      setMember({
        ...member,
        name: values.name,
        phone: values.phone,
        position: values.position,
        bio: values.bio,
        profile_picture_url: profilePictureUrl,
      });

      toast.success("Profile updated successfully");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update profile. Please try again."
      );
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  const handleProfilePictureUploaded = (url: string) => {
    setProfilePictureUrl(url);
  };

  const isPackageActive =
    memberPackage && isAfter(parseISO(memberPackage.end_date), new Date());
  const isPackageConfirmed =
    memberPackage && memberPackage.payment_status === "completed";

  // Get feature icon based on feature text
  const getFeatureIcon = (feature: string) => {
    const lowerFeature = feature.toLowerCase();

    if (lowerFeature.includes("wifi") || lowerFeature.includes("internet"))
      return <Wifi className="h-4 w-4 text-primary mr-2 flex-shrink-0" />;
    if (lowerFeature.includes("print") || lowerFeature.includes("scan"))
      return <Wifi className="h-4 w-4 text-primary mr-2 flex-shrink-0" />;
    if (lowerFeature.includes("hour") || lowerFeature.includes("time"))
      return <Clock className="h-4 w-4 text-primary mr-2 flex-shrink-0" />;
    if (lowerFeature.includes("access") || lowerFeature.includes("entry"))
      return <Shield className="h-4 w-4 text-primary mr-2 flex-shrink-0" />;
    if (lowerFeature.includes("discount") || lowerFeature.includes("off"))
      return <CreditCard className="h-4 w-4 text-primary mr-2 flex-shrink-0" />;
    if (lowerFeature.includes("event") || lowerFeature.includes("workshop"))
      return <Calendar className="h-4 w-4 text-primary mr-2 flex-shrink-0" />;

    // Default icon
    return <CheckCircle2 className="h-4 w-4 text-primary mr-2 flex-shrink-0" />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <Header />
      <main className="flex-1 container py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-6 max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="relative">
              {/* Background Header */}
              <div className="absolute inset-0 h-40 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl -z-10" />

              <div className="pt-6 px-6 flex justify-between items-center">
                <div></div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshPackages}
                  disabled={isRefreshing}
                  className="bg-white/80 backdrop-blur-sm"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Pending Package Section */}
                {pendingPackage && !memberPackage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-amber-600" />
                            <CardTitle>Pending Package</CardTitle>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-amber-500 text-amber-700 bg-amber-100"
                          >
                            Awaiting Payment
                          </Badge>
                        </div>
                        <CardDescription>
                          Your selected package is waiting for payment
                          confirmation
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-2">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                          <h3 className="font-semibold text-lg mb-2">
                            {pendingPackage.package_details?.name}
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {pendingPackage.package_details?.description}
                          </p>

                          <div className="flex justify-between items-center mb-4">
                            <span className="text-2xl font-bold text-primary">
                              ฿
                              {pendingPackage.package_details?.price.toFixed(2)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {pendingPackage.package_details?.duration_days}{" "}
                              days
                            </span>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-medium">Package Features:</h4>
                            <ul className="space-y-1">
                              {pendingPackage.package_details?.features.map(
                                (feature, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start text-sm"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>

                          {pendingPackage.payment_method === "cash" ? (
                            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                              <div className="flex items-start">
                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Payment Required
                                  </p>
                                  <p className="text-xs text-amber-700 dark:text-amber-400">
                                    Please visit the counter to complete your
                                    payment and activate this package.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                              <div className="flex items-start">
                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Payment Pending
                                  </p>
                                  <p className="text-xs text-amber-700 dark:text-amber-400">
                                    Waiting for payment confirmation. Please
                                    wait admin will be check your payment slip.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Membership Card Section */}
                {memberPackage && member && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-background to-background/80">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            <CardTitle>Membership</CardTitle>
                          </div>
                          <Badge
                            variant={isPackageConfirmed ? "default" : "outline"}
                            className={
                              isPackageConfirmed
                                ? ""
                                : "border-amber-500 text-amber-500"
                            }
                          >
                            {isPackageConfirmed ? "Active" : "Pending Payment"}
                          </Badge>
                        </div>
                        <CardDescription>
                          Your digital membership details
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-2">
                        <div className="rounded-xl overflow-hidden shadow-md">
                          <InteractiveMembershipCard
                            member={{
                              member_id: member.member_id,
                              name: member.name,
                              email: member.email,
                              profile_picture_url:
                                profilePictureUrl &&
                                profilePictureUrl.trim() !== ""
                                  ? profilePictureUrl
                                  : undefined,
                            }}
                            memberPackage={memberPackage}
                            showDetails={false}
                            isEdit={true}
                            handleProfilePictureUploaded={
                              handleProfilePictureUploaded
                            }
                            profilePictureUrl={
                              profilePictureUrl &&
                              profilePictureUrl.trim() !== ""
                                ? profilePictureUrl
                                : ""
                            }
                          />
                        </div>

                        {/* Package Progress */}
                        {isPackageConfirmed && (
                          <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Package Period
                              </span>
                              <span className="font-medium">
                                {Math.round(100 - membershipProgress)}%
                                remaining
                              </span>
                            </div>
                            <Progress
                              value={membershipProgress}
                              className="h-2"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                {format(
                                  new Date(memberPackage.start_date),
                                  "MMM d, yyyy"
                                )}
                              </span>
                              <span>
                                {format(
                                  new Date(memberPackage.end_date),
                                  "MMM d, yyyy"
                                )}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Package Details */}
                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                          <div className="bg-muted/50 rounded-lg p-4 transition-colors hover:bg-muted/70">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-primary" />
                              <h3 className="font-medium">
                                {memberPackage.package_details.name}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {memberPackage.package_details.description ||
                                "Standard membership package"}
                            </p>
                          </div>

                          <div className="bg-muted/50 rounded-lg p-4 transition-colors hover:bg-muted/70">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-4 w-4 text-primary" />
                              <h3 className="font-medium">Payment Details</h3>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Amount:
                              </span>
                              <span className="text-sm font-medium">
                                ฿
                                {memberPackage.package_details.price.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">
                                Status:
                              </span>
                              <span
                                className={`text-sm font-medium ${
                                  isPackageConfirmed
                                    ? "text-green-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {isPackageConfirmed ? "Paid" : "Pending"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="mt-6">
                          <h3 className="font-medium mb-3 flex items-center">
                            <Sparkles className="h-4 w-4 text-primary mr-2" />
                            Package Features
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {memberPackage.package_details.features.map(
                              (feature, index) => (
                                <div
                                  key={index}
                                  className="flex items-start p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                  {getFeatureIcon(feature)}
                                  <span className="text-sm">{feature}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex justify-end">
                          {isPackageConfirmed ? (
                            <Link href="/packages">
                              <Button variant="outline" className="group">
                                <Package className="mr-2 h-4 w-4" />
                                Upgrade Package
                                <ChevronRight className="ml-1 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                              </Button>
                            </Link>
                          ) : (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 w-full">
                              <div className="flex items-start">
                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Payment Pending
                                  </p>
                                  <p className="text-xs text-amber-700 dark:text-amber-400">
                                    Please visit the counter to complete your
                                    payment and activate your membership.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Upgrade Package Section */}
                {upgradePackage && memberPackage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <CardTitle>Package Upgrade Request</CardTitle>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-700 bg-blue-100"
                          >
                            Pending Admin Approval
                          </Badge>
                        </div>
                        <CardDescription>
                          Your package upgrade is waiting for admin confirmation
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-2">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Current Package */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                              <Award className="h-4 w-4 text-gray-600" />
                              <h3 className="font-medium text-gray-700 dark:text-gray-300">
                                Current Package
                              </h3>
                            </div>
                            <h4 className="font-semibold text-lg mb-2">
                              {memberPackage.package_details?.name}
                            </h4>
                            <div className="text-xl font-bold text-gray-600 mb-3">
                              ฿{memberPackage.package_details?.price.toFixed(2)}
                            </div>
                            <div className="space-y-1">
                              {memberPackage.package_details?.features
                                .slice(0, 3)
                                .map((feature, index) => (
                                  <div
                                    key={index}
                                    className="flex items-start text-sm text-gray-600"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </div>
                                ))}
                              {memberPackage.package_details?.features.length >
                                3 && (
                                <div className="text-xs text-gray-500">
                                  +
                                  {memberPackage.package_details.features
                                    .length - 3}{" "}
                                  more features
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Upgrade Package */}
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/50 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700 relative">
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-blue-600 text-white">
                                Upgrade
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <Sparkles className="h-4 w-4 text-blue-600" />
                              <h3 className="font-medium text-blue-700 dark:text-blue-300">
                                New Package
                              </h3>
                            </div>
                            <h4 className="font-semibold text-lg mb-2">
                              {upgradePackage.package_details?.name}
                            </h4>
                            <div className="text-xl font-bold text-blue-600 mb-3">
                              ฿
                              {upgradePackage.package_details?.price.toFixed(2)}
                            </div>
                            <div className="space-y-1">
                              {upgradePackage.package_details?.features
                                .slice(0, 3)
                                .map((feature, index) => (
                                  <div
                                    key={index}
                                    className="flex items-start text-sm text-blue-700 dark:text-blue-300"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </div>
                                ))}
                              {upgradePackage.package_details?.features.length >
                                3 && (
                                <div className="text-xs text-blue-600">
                                  +
                                  {upgradePackage.package_details.features
                                    .length - 3}{" "}
                                  more features
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Upgrade Details */}
                        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                          <h4 className="font-medium mb-3 flex items-center">
                            <CreditCard className="h-4 w-4 text-blue-600 mr-2" />
                            Upgrade Details
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Price Difference:
                              </span>
                              <div className="font-semibold text-blue-600">
                                +฿
                                {(
                                  upgradePackage.package_details?.price -
                                  memberPackage.package_details?.price
                                ).toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Duration:
                              </span>
                              <div className="font-semibold">
                                {upgradePackage.package_details?.duration_days}{" "}
                                days
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Requested:
                              </span>
                              <div className="font-semibold">
                                {format(
                                  new Date(upgradePackage.created_at),
                                  "MMM d, yyyy"
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Status:
                              </span>
                              <div className="font-semibold text-amber-600">
                                Pending Approval
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <div className="flex items-start">
                            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                Upgrade Request Submitted
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-400">
                                Your upgrade request has been submitted to admin
                                for review. You will be notified once it's
                                approved and ready for payment.
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* WiFi Credentials Section */}
                {isPackageConfirmed && memberPackage?.wifi_credentials && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <Card className="overflow-hidden border-0 shadow-lg">
                      <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-5 w-5 text-primary" />
                          <CardTitle>WiFi Access</CardTitle>
                        </div>
                        <CardDescription>
                          Your WiFi credentials for internet access
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <p className="text-sm font-medium mb-1">Username</p>
                            <div className="font-mono bg-muted/50 p-3 rounded-lg border border-border/50 text-sm group-hover:border-primary/30 transition-colors">
                              {memberPackage.wifi_credentials.username}
                            </div>
                          </div>
                          <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <p className="text-sm font-medium mb-1">Password</p>
                            <div className="relative font-mono bg-muted/50 p-3 rounded-lg border border-border/50 text-sm group-hover:border-primary/30 transition-colors">
                              {showWifiPassword
                                ? memberPackage.wifi_credentials.password
                                : "••••••••••••"}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                onClick={() =>
                                  setShowWifiPassword(!showWifiPassword)
                                }
                              >
                                {showWifiPassword ? "Hide" : "Show"}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 flex items-center">
                          <Shield className="h-3 w-3 mr-1 text-muted-foreground/70" />
                          Please keep your WiFi credentials secure and do not
                          share them with others.
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                {/* No Membership Package Section */}
                {!memberPackage && !pendingPackage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="border-0 shadow-lg overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background -z-10" />
                      <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl">
                          Discover Our Membership Packages
                        </CardTitle>
                        <CardDescription>
                          Select a package to access exclusive benefits and
                          services
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="text-center py-8">
                        <div className="relative w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-primary" />
                          <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                        </div>

                        <div className="max-w-md mx-auto mb-8">
                          <h3 className="text-xl font-medium mb-2">
                            Benefits of Membership
                          </h3>
                          <ul className="space-y-2 text-left">
                            <li className="flex items-center">
                              <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                              <span>Access to all workspace facilities</span>
                            </li>
                            <li className="flex items-center">
                              <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                              <span>High-speed WiFi connectivity</span>
                            </li>
                            <li className="flex items-center">
                              <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                              <span>Exclusive member events and workshops</span>
                            </li>
                            <li className="flex items-center">
                              <CheckCircle2 className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
                              <span>Discounts on additional services</span>
                            </li>
                          </ul>
                        </div>

                        <Link href="/packages">
                          <Button size="lg" className="group">
                            <Package className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                            Browse Packages
                            <ChevronRight className="ml-1 h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Right Column - Same as before */}
              <div className="space-y-8">
                {/* Account Information Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-gradient-to-r from-muted/50 to-transparent">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-primary" />
                        <CardTitle>Account Information</CardTitle>
                      </div>
                      <CardDescription>Your membership details</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {member && (
                        <>
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Member ID</div>
                            <div className="font-mono bg-muted/50 p-3 rounded-lg border border-border/50 text-center text-sm">
                              {member.member_id}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              Email Address
                            </div>
                            <div className="flex items-center gap-2 p-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <div className="font-medium text-sm">
                                {member.email}
                              </div>
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              Account Status
                            </div>
                            <div className="flex items-center gap-2 p-2">
                              {member.verified ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-green-600 font-medium text-sm">
                                    Verified
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                  <span className="text-amber-600 font-medium text-sm">
                                    Pending Verification
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              Member Since
                            </div>
                            <div className="flex items-center gap-2 p-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div className="font-medium text-sm">
                                {format(
                                  new Date(member.created_at),
                                  "MMMM d, yyyy"
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Edit Profile Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  id="edit-profile-form"
                >
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-gradient-to-r from-muted/50 to-transparent">
                      <div className="flex items-center gap-2">
                        <Edit className="h-5 w-5 text-primary" />
                        <CardTitle>Edit Profile</CardTitle>
                      </div>
                      <CardDescription>
                        Update your personal information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      className="pl-10 bg-muted/50 border-border/50 focus:border-primary/50"
                                      placeholder="Your full name"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      className="pl-10 bg-muted/50 border-border/50"
                                      placeholder="Your email"
                                      {...field}
                                      disabled
                                      title="Email cannot be changed"
                                    />
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  Email address cannot be changed
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      className="pl-10 bg-muted/50 border-border/50 focus:border-primary/50"
                                      placeholder="Your phone number"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            disabled={isSaving}
                            className="w-full group"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                                Save Changes
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Test Notification Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="pb-2 bg-gradient-to-r from-muted/50 to-transparent">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-primary" />
                        <CardTitle>Test Notifications</CardTitle>
                      </div>
                      <CardDescription>
                        Test the notification system
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <TestUserNotificationButton />
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
