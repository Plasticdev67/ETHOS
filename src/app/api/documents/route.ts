import { prisma } from "@/lib/db"
import { DocumentType } from "@/generated/prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId

  const documents = await prisma.document.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      product: { select: { id: true, partCode: true, description: true } },
    },
  })
  return NextResponse.json(documents)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const projectId = formData.get("projectId") as string
  const productId = (formData.get("productId") as string) || null
  const documentType = ((formData.get("documentType") as string) || "OTHER") as DocumentType
  const description = (formData.get("description") as string) || null

  if (!file || !projectId) {
    return NextResponse.json({ error: "File and projectId are required" }, { status: 400 })
  }

  try {
    // Create upload directory structure: uploads/{projectId}/
    const uploadDir = path.join(process.cwd(), "uploads", projectId)
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename to avoid collisions
    const timestamp = Date.now()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storedFilename = `${timestamp}_${safeFilename}`
    const filePath = path.join(uploadDir, storedFilename)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Create database record
    const document = await prisma.document.create({
      data: {
        projectId,
        productId,
        filename: file.name,
        filePath: `uploads/${projectId}/${storedFilename}`,
        fileSize: file.size,
        documentType,
        description,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("POST /api/documents error:", error)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
