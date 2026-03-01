import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("settings:admin")
  if (denied) return denied

  const { id } = await params

  const existing = await prisma.suggestion.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 })
  }

  await prisma.suggestion.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
