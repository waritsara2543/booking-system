import { NextResponse } from "next/server"

// This endpoint provides instructions for setting up cron jobs
export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return NextResponse.json({
    success: true,
    cronJobs: [
      {
        name: "Check Package Expirations",
        schedule: "0 0 * * *", // Run daily at midnight
        endpoint: `${baseUrl}/api/cron/check-expirations`,
        description: "Checks for expired packages and sends notifications to users and admins",
      },
    ],
    setupInstructions: {
      vercel: "Use Vercel Cron Jobs in your project settings",
      external: "Set up external cron job service to call the endpoints at the specified schedules",
    },
  })
}
