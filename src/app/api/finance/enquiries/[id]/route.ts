import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  const { id } = await params

  const enquiry = await prisma.procurementEnquiry.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      lines: {
        orderBy: { sortOrder: "asc" },
        include: {
          bomLine: {
            select: { id: true, description: true, partNumber: true, category: true },
          },
        },
      },
      responses: {
        include: {
          supplier: { select: { id: true, name: true, email: true } },
          lines: {
            include: {
              enquiryLine: { select: { id: true, description: true, partNumber: true } },
            },
          },
        },
      },
    },
  })

  if (!enquiry) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
  }

  return NextResponse.json(enquiry)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("finance:edit")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const { subject, notes, status } = body as {
    subject?: string
    notes?: string
    status?: string
  }

  const updateData: Record<string, unknown> = {}
  if (subject !== undefined) updateData.subject = subject
  if (notes !== undefined) updateData.notes = notes
  if (status !== undefined) updateData.status = status

  const enquiry = await prisma.procurementEnquiry.update({
    where: { id },
    data: updateData,
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      responses: {
        include: {
          supplier: { select: { id: true, name: true } },
        },
      },
    },
  })

  revalidatePath("/purchasing/enquiries")
  return NextResponse.json(enquiry)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("finance:edit")
  if (denied) return denied

  const { id } = await params

  // Only allow deleting DRAFT enquiries
  const enquiry = await prisma.procurementEnquiry.findUnique({
    where: { id },
    select: { status: true },
  })

  if (!enquiry) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
  }

  if (enquiry.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only DRAFT enquiries can be deleted" },
      { status: 400 }
    )
  }

  await prisma.procurementEnquiry.delete({ where: { id } })

  revalidatePath("/purchasing/enquiries")
  return NextResponse.json({ success: true })
}
