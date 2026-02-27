import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role

  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can delete suggestions" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.suggestion.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 })
  }

  await prisma.suggestion.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
