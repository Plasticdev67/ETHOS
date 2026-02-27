import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const fullPath = path.join(process.cwd(), doc.filePath)
    const fileBuffer = await readFile(fullPath)

    const headers = new Headers()
    headers.set("Content-Disposition", `attachment; filename="${doc.filename}"`)
    headers.set("Content-Type", "application/octet-stream")
    headers.set("Content-Length", String(fileBuffer.length))

    return new NextResponse(fileBuffer, { headers })
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }
}
