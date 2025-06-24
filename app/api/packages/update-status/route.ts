import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendPackageConfirmedEmail, sendPackageCancelledEmail, sendPackageUpgradedEmail } from "@/lib/email-utils"

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const { packageSelectionId, status, wifiCredentialId } = await request.json()

    console.log("Processing package status update:", { packageSelectionId, status, wifiCredentialId })

    if (!packageSelectionId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the package selection details first
    const { data: packageSelection, error: packageSelectionError } = await supabase
      .from("member_packages")
      .select(`
        *,
        members!inner(name, email, member_id),
        packages!inner(name, description, price, duration_days, features)
      `)
      .eq("id", packageSelectionId)
      .single()

    if (packageSelectionError) {
      console.error("Error fetching package selection:", packageSelectionError)
      return NextResponse.json({ error: "Package selection not found" }, { status: 404 })
    }

    console.log("Package selection found:", packageSelection)

    const isUpgrade = packageSelection.is_upgrade || false
    let oldPackageDetails = null

    // If this is an upgrade, get the old package details and handle the upgrade process
    if (isUpgrade) {
      console.log("Processing upgrade package")

      // Get current active package for this member
      const { data: currentPackage, error: currentPackageError } = await supabase
        .from("member_packages")
        .select(`
          *,
          packages!inner(name, description, price, duration_days, features)
        `)
        .eq("member_id", packageSelection.member_id)
        .eq("is_current", true)
        .eq("payment_status", "completed")
        .single()

      if (currentPackageError) {
        console.error("Error fetching current package:", currentPackageError)
      } else if (currentPackage) {
        oldPackageDetails = currentPackage.packages
        console.log("Current package found:", oldPackageDetails)
      }
    }

    // Update package selection status
    const updateData: any = {
      payment_status: status,
      updated_at: new Date().toISOString(),
    }

    // If WiFi credential is provided and status is completed, assign it
    if (wifiCredentialId && status === "completed") {
      updateData.wifi_credential_id = wifiCredentialId
      console.log("Assigning WiFi credential:", wifiCredentialId)

      // Mark WiFi credential as assigned (do this only once)
      const { error: wifiError } = await supabase
        .from("wifi_credentials")
        .update({
          is_assigned: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wifiCredentialId)

      if (wifiError) {
        console.error("Error updating WiFi credential:", wifiError)
        return NextResponse.json({ error: "Failed to assign WiFi credential" }, { status: 500 })
      }
    } else if (status === "completed") {
      console.log("No WiFi credential provided, proceeding without assignment")
    }

    // If status is completed, set payment date and make it current
    if (status === "completed") {
      updateData.payment_date = new Date().toISOString()
      updateData.is_current = true

      console.log("Setting package as completed and current")

      // If this is an upgrade, deactivate the old package
      if (isUpgrade) {
        console.log("Deactivating old packages for upgrade")

        // Deactivate all current packages for this member
        const { error: deactivateError } = await supabase
          .from("member_packages")
          .update({
            is_current: false,
            updated_at: new Date().toISOString(),
          })
          .eq("member_id", packageSelection.member_id)
          .eq("is_current", true)
          .eq("payment_status", "completed")

        if (deactivateError) {
          console.error("Error deactivating old packages:", deactivateError)
        } else {
          console.log("Successfully deactivated old packages")
        }
      } else {
        // For new packages (not upgrades), also deactivate any existing current packages
        console.log("Deactivating existing packages for new package")

        const { error: deactivateError } = await supabase
          .from("member_packages")
          .update({
            is_current: false,
            updated_at: new Date().toISOString(),
          })
          .eq("member_id", packageSelection.member_id)
          .eq("is_current", true)
          .neq("id", packageSelectionId) // Don't deactivate the current one we're updating

        if (deactivateError) {
          console.error("Error deactivating existing packages:", deactivateError)
        }
      }

      // Calculate start and end dates for the new package
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(startDate.getDate() + packageSelection.packages.duration_days)

      updateData.start_date = startDate.toISOString()
      updateData.end_date = endDate.toISOString()

      console.log("Setting package dates:", { start_date: updateData.start_date, end_date: updateData.end_date })
    }

    // Update the package selection
    const { data: updatedPackage, error } = await supabase
      .from("member_packages")
      .update(updateData)
      .eq("id", packageSelectionId)
      .select(`
        *,
        members!inner(name, email, member_id),
        packages!inner(name, description, price, duration_days, features),
        wifi_credentials:wifi_credential_id (username, password)
      `)
      .single()

    if (error) {
      console.error("Error updating package status:", error)
      return NextResponse.json({ error: "Failed to update package status" }, { status: 500 })
    }

    console.log("Package updated successfully:", updatedPackage)

    const member = updatedPackage.members
    const packageDetails = updatedPackage.packages

    // Send email notifications based on status
    try {
      if (status === "completed") {
        if (isUpgrade && oldPackageDetails) {
          // Send upgrade confirmation email
          console.log("Sending upgrade confirmation email")
          await sendPackageUpgradedEmail(
            member.email,
            {
              name: member.name,
              memberId: member.member_id,
            },
            oldPackageDetails,
            {
              name: packageDetails.name,
              start_date: updatedPackage.start_date,
              end_date: updatedPackage.end_date,
            },
          )
          console.log("Package upgrade confirmation email sent successfully")
        } else {
          // Send regular package confirmation email
          console.log("Sending package confirmation email")
          await sendPackageConfirmedEmail(
            member.email,
            {
              name: member.name,
              memberId: member.member_id,
            },
            {
              name: packageDetails.name,
              description: packageDetails.description,
              price: packageDetails.price,
              duration_days: packageDetails.duration_days,
              features:
                typeof packageDetails.features === "string"
                  ? JSON.parse(packageDetails.features)
                  : packageDetails.features,
              start_date: updatedPackage.start_date,
              end_date: updatedPackage.end_date,
            },
            updatedPackage.wifi_credentials
              ? {
                  username: updatedPackage.wifi_credentials.username,
                  password: updatedPackage.wifi_credentials.password,
                }
              : null,
          )
          console.log("Package confirmation email sent successfully")
        }
      } else if (status === "cancelled") {
        // Package cancelled - send cancellation email
        console.log("Sending package cancellation email")
        await sendPackageCancelledEmail(
          member.email,
          {
            name: member.name,
            memberId: member.member_id,
          },
          {
            name: packageDetails.name,
            description: packageDetails.description,
            price: packageDetails.price,
          },
        )
        console.log("Package cancellation email sent successfully")
      }
    } catch (emailError) {
      console.error("Error sending package status email:", emailError)
      // Don't fail the API call if email fails
    }

    // Create admin notification
    try {
      const notificationTitle = isUpgrade
        ? `Package ${status === "completed" ? "Upgrade Confirmed" : "Upgrade Cancelled"}`
        : `Package ${status === "completed" ? "Confirmed" : "Cancelled"}`

      const notificationMessage = isUpgrade
        ? `${member.name}'s upgrade to ${packageDetails.name} package has been ${status === "completed" ? "confirmed" : "cancelled"}.`
        : `${member.name}'s ${packageDetails.name} package has been ${status === "completed" ? "confirmed" : "cancelled"}.`

      const { error: adminNotificationError } = await supabase.from("admin_notifications").insert([
        {
          entity_id: packageSelectionId,
          title: notificationTitle,
          message: notificationMessage,
          type: "package",
          read: false,
        },
      ])

      if (adminNotificationError) {
        console.error("Error creating admin notification:", adminNotificationError)
      }
    } catch (adminNotificationError) {
      console.error("Exception creating admin notification:", adminNotificationError)
    }

    // Create user notification
    try {
      const userNotificationTitle = isUpgrade
        ? `Package ${status === "completed" ? "Upgrade Confirmed" : "Upgrade Cancelled"}`
        : `Package ${status === "completed" ? "Confirmed" : "Cancelled"}`

      const userNotificationMessage = isUpgrade
        ? `Your upgrade to ${packageDetails.name} package has been ${status === "completed" ? "confirmed and is now active" : "cancelled"}.`
        : `Your ${packageDetails.name} package has been ${status === "completed" ? "confirmed and is now active" : "cancelled"}.`

      const { error: userNotificationError } = await supabase.from("user_notifications").insert([
        {
          user_id: member.member_id,
          title: userNotificationTitle,
          message: userNotificationMessage,
          type: "package",
          read: false,
        },
      ])

      if (userNotificationError) {
        console.error("Error creating user notification:", userNotificationError)
      }
    } catch (userNotificationError) {
      console.error("Exception creating user notification:", userNotificationError)
    }

    console.log("Package status update completed successfully")

    return NextResponse.json({
      success: true,
      packageSelection: updatedPackage,
      isUpgrade: isUpgrade,
    })
  } catch (error) {
    console.error("Error updating package status:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
