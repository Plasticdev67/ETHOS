import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

// GET /api/projects/:id/notes — Fetch all notes for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const notes = await prisma.projectNote.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(notes)
}

// POST /api/projects/:id/notes — Add a note to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  const { id } = await params

  try {
    const body = await request.json()
    const { message, category, userName, userId } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Get user from session if not provided
    let resolvedUserName = userName || "Unknown"
    let resolvedUserId = userId || null

    if (!userName) {
      try {
        const sessionRes = await fetch(new URL("/api/auth/session", request.url))
        if (sessionRes.ok) {
          const session = await sessionRes.json()
          if (session?.user) {
            resolvedUserName = session.user.name || "Unknown"
            resolvedUserId = session.user.id || null
          }
        }
      } catch {
        // Fall through with defaults
      }
    }

    const note = await prisma.projectNote.create({
      data: {
        projectId: id,
        userId: resolvedUserId,
        userName: resolvedUserName,
        message: message.trim(),
        category: category || "NOTE",
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error("Failed to create project note:", error)
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    )
  }
}
