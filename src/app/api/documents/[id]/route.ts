import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { unlink } from "fs/promises"
import path from "path"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      product: { select: { id: true, partCode: true, description: true } },
    },
  })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(doc)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete the physical file
  try {
    const fullPath = path.join(process.cwd(), doc.filePath)
    await unlink(fullPath)
  } catch {
    // File may already be deleted, continue
  }

  // Delete database record
  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
