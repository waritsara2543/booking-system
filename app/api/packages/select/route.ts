import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendPackageSelectedEmail, sendPackageUpgradeRequestEmail } from "@/lib/email-utils"

// Create Supabase client for server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: Request) {
  try {
    const { memberId, packageId, memberName, packageName, isUpgrade } = await request.json()

    if (!memberId || !packageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Package selection request:", { memberId, packageId, memberName, packageName, isUpgrade })

    // Calculate start and end dates
    const today = new Date()

    // Get package duration
    const { data: packageData, error: packageError } = await supabase
      .from("packages")
      .select("*")
      .eq("id", packageId)
      .single()

    if (packageError) {
      console.error("Error fetching package:", packageError)
      return NextResponse.json({ error: "Failed to fetch package details" }, { status: 500 })
    }

    const endDate = new Date(today)
    endDate.setDate(today.getDate() + packageData.duration_days)

    // Check if this is an upgrade and get current package details
    let currentPackage = null
    if (isUpgrade) {
      try {
        const { data: currentPackageData, error: currentPackageError } = await supabase
          .from("member_packages")
          .select(`
            *,
            packages(name, description, price, duration_days, features)
          `)
          .eq("member_id", memberId)
          .eq("is_current", true)
          .eq("payment_status", "completed")
          .single()

        if (currentPackageError) {
          console.error("Error fetching current package:", currentPackageError)
          // Don't fail the request, just log the error
          console.log("Continuing without current package data")
        } else {
          currentPackage = currentPackageData
          console.log("Found current package for upgrade:", currentPackage)
        }
      } catch (error) {
        console.error("Exception fetching current package:", error)
        // Continue without current package data
      }
    }

    // Prepare insert data - only include fields that exist in the table
    const insertData: any = {
      member_id: memberId,
      package_id: packageId,
      start_date: today.toISOString(),
      end_date: endDate.toISOString(),
      payment_status: "pending",
      is_current: false, // Don't set as current until confirmed, especially for upgrades
    }

    // Only add upgrade-related fields if they exist in the table schema
    if (isUpgrade) {
      // Check if these columns exist before adding them
      try {
        // Add upgrade fields only if this is an upgrade
        insertData.is_upgrade = true
        if (currentPackage) {
          insertData.previous_package_id = currentPackage.package_id
        }
      } catch (error) {
        console.log("Upgrade fields not available in schema, continuing without them")
      }
    }

    console.log("Inserting package selection with data:", insertData)

    // Insert new package selection
    const { data, error } = await supabase.from("member_packages").insert([insertData]).select()

    if (error) {
      console.error("Error selecting package:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      return NextResponse.json({ error: "Failed to select package" }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error("No data returned from package selection")
      return NextResponse.json({ error: "Failed to select package" }, { status: 500 })
    }

    const packageSelectionId = data[0].id
    console.log("Package selection created successfully:", packageSelectionId)

    // Create admin notification
    const notificationTitle = isUpgrade ? "Package Upgrade Request" : "New Package Selection"
    const notificationMessage = isUpgrade
      ? `${memberName} has requested to upgrade to the ${packageName} package.`
      : `${memberName} has selected the ${packageName} package.`

    console.log("Creating admin notification for package selection:", {
      packageSelectionId,
      memberName,
      packageName,
      isUpgrade,
    })

    try {
      const { error: adminNotificationError } = await supabase.from("admin_notifications").insert([
        {
          booking_id: packageSelectionId,
          title: notificationTitle,
          message: notificationMessage,
          is_read: false,
        },
      ])

      if (adminNotificationError) {
        console.error("Error creating admin notification:", adminNotificationError)
      } else {
        console.log("Admin notification created successfully for package selection")
      }
    } catch (adminNotificationError) {
      console.error("Exception creating admin notification:", adminNotificationError)
    }

    // Create user notification
    const userNotificationTitle = isUpgrade ? "Package Upgrade Request" : "Package Selected"
    const userNotificationMessage = isUpgrade
      ? `You have requested to upgrade to the ${packageName} package. Please visit the counter to complete payment.`
      : `You have selected the ${packageName} package. Please visit the counter to complete payment.`

    console.log("Creating user notification for package selection for member:", memberId)

    try {
      const { error: userNotificationError } = await supabase.from("user_notifications").insert([
        {
          user_id: memberId,
          title: userNotificationTitle,
          message: userNotificationMessage,
          type: "package",
          is_read: false,
        },
      ])

      if (userNotificationError) {
        console.error("Error creating user notification:", userNotificationError)
      } else {
        console.log("User notification created successfully for package selection")
      }
    } catch (userNotificationError) {
      console.error("Exception creating user notification:", userNotificationError)
    }

    // Send email notifications
    try {
      // Get member details for email
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("name, email")
        .eq("member_id", memberId)
        .single()

      if (memberError) {
        console.error("Error fetching member for email:", memberError)
      } else if (memberData) {
        if (isUpgrade && currentPackage && currentPackage.packages) {
          // Send upgrade request email
          console.log("Sending upgrade request email")
          await sendPackageUpgradeRequestEmail(
            memberData.email,
            {
              name: memberData.name,
              memberId: memberId,
            },
            currentPackage.packages, // Old package details
            packageData, // New package details
          )
          console.log("Package upgrade request email sent successfully")
        } else {
          // Send regular package selection email
          console.log("Sending regular package selection email")
          await sendPackageSelectedEmail(
            memberData.email,
            {
              name: memberData.name,
              memberId: memberId,
            },
            packageData,
          )
          console.log("Package selection email sent successfully")
        }
      }
    } catch (emailError) {
      console.error("Error sending package selection email:", emailError)
      // Don't fail the API call if email fails
    }

    return NextResponse.json({
      success: true,
      packageSelection: data[0],
      isUpgrade: isUpgrade || false,
    })
  } catch (error) {
    console.error("Error selecting package:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
