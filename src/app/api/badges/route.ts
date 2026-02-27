import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

// GET /api/badges — returns badge counts for sidebar navigation
export async function GET() {
  try {
    const [returnedHandovers, pendingHandovers] = await Promise.all([
      // Returned handovers (for Design section badge)
      prisma.designHandover.count({ where: { status: "REJECTED" } }),
      // Pending handovers awaiting review (for Production section badge)
      prisma.designHandover.count({ where: { status: "SUBMITTED" } }),
    ])

    return NextResponse.json({
      designHandovers: returnedHandovers,
      productionIncoming: pendingHandovers,
    })
  } catch (error) {
    console.error("Failed to fetch badge counts:", error)
    return NextResponse.json(
      { designHandovers: 0, productionIncoming: 0 },
      { status: 200 }
    )
  }
}
