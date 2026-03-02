import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

// GET /api/opportunities/:id/activities — Fetch all activities for an opportunity
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const activities = await prisma.opportunityActivity.findMany({
    where: { opportunityId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(activities)
}

// POST /api/opportunities/:id/activities — Add an activity to an opportunity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("crm:edit")
  if (denied) return denied

  const { id } = await params

  try {
    const body = await request.json()
    const { message, type, subject, userName, userId } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Resolve user identity from session if not provided
    let resolvedUserName = userName || "Unknown"
    let resolvedUserId = userId || null

    if (!userName && !(user instanceof NextResponse)) {
      resolvedUserName = user.name || "Unknown"
      resolvedUserId = user.id || null
    }

    const activity = await prisma.opportunityActivity.create({
      data: {
        opportunityId: id,
        userId: resolvedUserId,
        userName: resolvedUserName,
        message: message.trim(),
        type: type || "NOTE",
        subject: subject?.trim() || null,
      },
    })

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    console.error("Failed to create opportunity activity:", error)
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    )
  }
}
