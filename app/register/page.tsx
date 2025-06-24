"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase, generateMemberId } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(5, {
    message: "Please enter a valid phone number.",
  }),
});

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Define the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const copyToClipboard = () => {
    if (memberId) {
      navigator.clipboard
        .writeText(memberId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
        });
    }
  };

  // Handle form submission
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Check if email already exists
      const { data: existingMember, error: checkError } = await supabase
        .from("members")
        .select("id")
        .eq("email", values.email)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing member:", checkError);
        throw new Error(
          `Error checking existing member: ${checkError.message}`
        );
      }

      if (existingMember) {
        setError("This email is already registered. Please sign in instead.");
        setIsSubmitting(false);
        return;
      }

      // Generate a unique member ID (exactly 7 characters)
      let uniqueMemberId = generateMemberId();

      // Ensure it's exactly 7 characters
      if (uniqueMemberId.length > 7) {
        uniqueMemberId = uniqueMemberId.substring(0, 7);
      } else if (uniqueMemberId.length < 7) {
        // Pad with additional characters if somehow less than 7
        while (uniqueMemberId.length < 7) {
          uniqueMemberId += "0";
        }
      }

      // Insert new member
      const { data, error: insertError } = await supabase
        .from("members")
        .insert([
          {
            name: values.name,
            email: values.email,
            phone: values.phone,
            member_id: uniqueMemberId,
            verified: false,
          },
        ])
        .select();

      if (insertError) {
        console.error("Error inserting new member:", insertError);
        throw new Error(`Registration failed: ${insertError.message}`);
      }

      // Store the member ID to display to the user
      setMemberId(uniqueMemberId);

      // For this demo, we'll simulate email verification
      // In a real app, you would use Supabase Auth or another service
      setTimeout(() => {
        // Update the member's verified status (simulating email verification)
        supabase
          .from("members")
          .update({ verified: true })
          .eq("email", values.email)
          .then(() => {
            console.log("Member verified (simulated)");
          })
          .catch((err) => {
            console.error("Error in simulated verification:", err);
          });
      }, 5000);

      // แจ้งเตือนการลงทะเบียน (ไม่ส่งอีเมลแล้ว)
      try {
        await fetch("/api/send-registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: values.email,
            subject: "Welcome to Booking System - Your Member ID",
            memberDetails: {
              name: values.name,
              email: values.email,
              memberId: uniqueMemberId,
              phone: values.phone,
            },
          }),
        });
      } catch (notificationError) {
        console.error(
          "Failed to process registration notification:",
          notificationError
        );
      }

      // Send notification to admin about new registration
      try {
        await fetch("/api/send-admin-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "new_registration",
            title: "New Member Registration",
            message: `${values.name} (${values.email}) has registered as a new member.`,
            memberId: uniqueMemberId,
          }),
        });
      } catch (notificationError) {
        console.error("Error sending admin notification:", notificationError);
      }

      setSuccess(true);
      toast.success("Registration successful!");
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during registration. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view
  const SuccessView = () => (
    <div className="space-y-4 sm:space-y-6">
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">
          Registration successful!
        </AlertTitle>
        <AlertDescription className="text-green-700">
          Your account has been created successfully.
          <br />
          <br />
          <strong>Note:</strong> verification is simulated automatically after a
          few seconds.
        </AlertDescription>
      </Alert>

      {memberId && (
        <div className="mt-6 p-4 border rounded-md">
          <h3 className="font-medium text-lg mb-2">Your Member ID</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please save this ID. You will need it to log in to your account.
          </p>
          <div className="flex items-center gap-2">
            <div className="bg-muted p-3 rounded-md font-mono text-lg flex-1 text-center">
              {memberId}
            </div>
            <Button size="sm" variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-center mt-6">
        <Link href="/login">
          <Button>Go to Login</Button>
        </Link>
      </div>
    </div>
  );

  // Registration form view
  const RegistrationForm = () => (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Full Name
          </label>
          <Input id="name" placeholder="John Doe" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <Input
            id="email"
            placeholder="john@example.com"
            type="email"
            {...form.register("email")}
          />
          <p className="text-xs text-muted-foreground">
            We'll send a verification email to this address.
          </p>
          {form.formState.errors.email && (
            <p className="text-sm text-red-500">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone Number
          </label>
          <Input
            id="phone"
            placeholder="Your phone number"
            {...form.register("phone")}
          />
          {form.formState.errors.phone && (
            <p className="text-sm text-red-500">
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={isSubmitting}
          onClick={form.handleSubmit(handleSubmit)}
        >
          {isSubmitting ? "Registering..." : "Register"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Membership Registration</h1>
        </div>

        <Card className="max-w-2xl mx-auto w-full">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">
              Create a membership account
            </CardTitle>
            <CardDescription>
              Register to become a member and enjoy benefits when booking
              meeting rooms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? <SuccessView /> : <RegistrationForm />}
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4 sm:pt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
      <footer className="border-t py-6">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
            <p className="text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Booking System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
