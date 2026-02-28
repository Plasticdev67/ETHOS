import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get("projectId")
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (status && status !== "ALL") where.status = status
  if (search) {
    where.OR = [
      { enquiryNumber: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ]
  }

  const enquiries = await prisma.procurementEnquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { lines: true, responses: true } },
      responses: {
        select: {
          id: true,
          status: true,
          supplier: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json(enquiries)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId, subject, notes, bomLineIds, supplierIds } = body as {
    projectId: string
    subject: string
    notes?: string
    bomLineIds: string[]
    supplierIds: string[]
  }

  if (!projectId || !subject || !bomLineIds?.length || !supplierIds?.length) {
    return NextResponse.json(
      { error: "projectId, subject, bomLineIds, and supplierIds are required" },
      { status: 400 }
    )
  }

  // Auto-generate enquiry number using sequence counter
  const sequence = await prisma.sequenceCounter.upsert({
    where: { name: "enquiry" },
    create: { name: "enquiry", current: 1, prefix: "ENQ-", padding: 6 },
    update: { current: { increment: 1 } },
  })

  const nextNum = sequence.current
  const enquiryNumber = `ENQ-${String(nextNum).padStart(6, "0")}`

  // Fetch BOM lines
  const bomLines = await prisma.designBomLine.findMany({
    where: { id: { in: bomLineIds } },
    orderBy: { sortOrder: "asc" },
  })

  // Create enquiry with lines and responses
  const enquiry = await prisma.procurementEnquiry.create({
    data: {
      enquiryNumber,
      projectId,
      subject,
      notes: notes || null,
      status: "DRAFT",
      lines: {
        create: bomLines.map((bl, idx) => ({
          bomLineId: bl.id,
          description: bl.description,
          partNumber: bl.partNumber || null,
          quantity: bl.quantity,
          unit: bl.unit,
          notes: bl.notes || null,
          sortOrder: idx,
        })),
      },
      responses: {
        create: supplierIds.map((supplierId: string) => ({
          supplierId,
          status: "PENDING",
        })),
      },
    },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      lines: true,
      responses: {
        include: { supplier: { select: { id: true, name: true } } },
      },
    },
  })

  revalidatePath("/purchasing/enquiries")
  return NextResponse.json(enquiry, { status: 201 })
}
