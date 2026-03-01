import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  const { id, responseId } = await params

  const response = await prisma.enquiryResponse.findFirst({
    where: { id: responseId, enquiryId: id },
    include: {
      supplier: { select: { id: true, name: true, email: true } },
      enquiry: {
        select: {
          id: true,
          enquiryNumber: true,
          subject: true,
          project: { select: { projectNumber: true, name: true } },
        },
      },
      lines: {
        include: {
          enquiryLine: {
            select: {
              id: true,
              description: true,
              partNumber: true,
              quantity: true,
              unit: true,
            },
          },
        },
      },
    },
  })

  if (!response) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 })
  }

  return NextResponse.json(response)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; responseId: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("finance:edit")
  if (denied) return denied

  const { id, responseId } = await params
  const body = await request.json()

  const { status, totalQuoted, leadTimeDays, validUntil, notes, lines } = body as {
    status?: string
    totalQuoted?: number
    leadTimeDays?: number
    validUntil?: string
    notes?: string
    lines?: {
      enquiryLineId: string
      unitPrice?: number
      leadTimeDays?: number
      available?: boolean
      notes?: string
    }[]
  }

  // Verify the response belongs to this enquiry
  const existing = await prisma.enquiryResponse.findFirst({
    where: { id: responseId, enquiryId: id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Response not found" }, { status: 404 })
  }

  // Build update data
  const updateData: Record<string, unknown> = {}
  if (status !== undefined) updateData.status = status
  if (totalQuoted !== undefined) updateData.totalQuoted = totalQuoted
  if (leadTimeDays !== undefined) updateData.leadTimeDays = leadTimeDays
  if (validUntil !== undefined) updateData.validUntil = new Date(validUntil)
  if (notes !== undefined) updateData.notes = notes

  // If entering quotes, set respondedAt and status to QUOTED
  if (lines && lines.length > 0) {
    updateData.respondedAt = new Date()
    if (!status) updateData.status = "QUOTED"
  }

  // Update the response
  await prisma.enquiryResponse.update({
    where: { id: responseId },
    data: updateData,
  })

  // Upsert response lines if provided
  if (lines && lines.length > 0) {
    for (const line of lines) {
      const totalPrice =
        line.unitPrice !== undefined
          ? line.unitPrice *
            Number(
              (
                await prisma.enquiryLine.findUnique({
                  where: { id: line.enquiryLineId },
                  select: { quantity: true },
                })
              )?.quantity || 0
            )
          : undefined

      // Check if response line already exists
      const existingLine = await prisma.enquiryResponseLine.findFirst({
        where: { responseId, enquiryLineId: line.enquiryLineId },
      })

      if (existingLine) {
        await prisma.enquiryResponseLine.update({
          where: { id: existingLine.id },
          data: {
            unitPrice: line.unitPrice ?? null,
            totalPrice: totalPrice ?? null,
            leadTimeDays: line.leadTimeDays ?? null,
            available: line.available ?? true,
            notes: line.notes ?? null,
          },
        })
      } else {
        await prisma.enquiryResponseLine.create({
          data: {
            responseId,
            enquiryLineId: line.enquiryLineId,
            unitPrice: line.unitPrice ?? null,
            totalPrice: totalPrice ?? null,
            leadTimeDays: line.leadTimeDays ?? null,
            available: line.available ?? true,
            notes: line.notes ?? null,
          },
        })
      }
    }
  }

  // Check if all responses are now quoted to update enquiry status
  const allResponses = await prisma.enquiryResponse.findMany({
    where: { enquiryId: id },
    select: { status: true },
  })

  const allQuoted = allResponses.every(
    (r) => r.status === "QUOTED" || r.status === "DECLINED"
  )
  const someQuoted = allResponses.some(
    (r) => r.status === "QUOTED" || r.status === "DECLINED"
  )

  if (allQuoted) {
    await prisma.procurementEnquiry.update({
      where: { id },
      data: { status: "ALL_RESPONDED" },
    })
  } else if (someQuoted) {
    await prisma.procurementEnquiry.update({
      where: { id },
      data: { status: "PARTIALLY_RESPONDED" },
    })
  }

  // Fetch and return the updated response
  const result = await prisma.enquiryResponse.findUnique({
    where: { id: responseId },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: {
        include: {
          enquiryLine: {
            select: { id: true, description: true, partNumber: true, quantity: true, unit: true },
          },
        },
      },
    },
  })

  revalidatePath("/purchasing/enquiries")
  return NextResponse.json(result)
}
