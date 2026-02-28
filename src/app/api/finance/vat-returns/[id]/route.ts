import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const vatReturn = await prisma.vatReturn.findUnique({
      where: { id },
      include: {
        period: true,
      },
    })

    if (!vatReturn) {
      return NextResponse.json(
        { error: "VAT return not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(vatReturn)
  } catch (error) {
    console.error("VatReturn GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch VAT return" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.vatReturn.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "VAT return not found" },
        { status: 404 }
      )
    }

    const {
      status,
      box1,
      box2,
      box3,
      box4,
      box5,
      box6,
      box7,
      box8,
      box9,
      hmrcCorrelationId,
      hmrcReceiptId,
      submittedBy,
    } = body

    const data: Record<string, unknown> = {}

    // Allow box adjustments only in draft or calculated state
    if (existing.status === "VAT_DRAFT" || existing.status === "CALCULATED") {
      if (box1 !== undefined) data.box1 = box1
      if (box2 !== undefined) data.box2 = box2
      if (box3 !== undefined) data.box3 = box3
      if (box4 !== undefined) data.box4 = box4
      if (box5 !== undefined) data.box5 = box5
      if (box6 !== undefined) data.box6 = box6
      if (box7 !== undefined) data.box7 = box7
      if (box8 !== undefined) data.box8 = box8
      if (box9 !== undefined) data.box9 = box9
    }

    // Status transitions
    if (status) {
      const validTransitions: Record<string, string[]> = {
        VAT_DRAFT: ["CALCULATED"],
        CALCULATED: ["VAT_APPROVED", "VAT_DRAFT"],
        VAT_APPROVED: ["VAT_SUBMITTED", "CALCULATED"],
        VAT_SUBMITTED: ["ACCEPTED", "REJECTED"],
      }

      const allowed = validTransitions[existing.status] || []
      if (!allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${status}`,
          },
          { status: 400 }
        )
      }

      data.status = status

      // Record submission details when submitting to HMRC
      if (status === "VAT_SUBMITTED") {
        data.submittedAt = new Date()
        if (submittedBy) data.submittedBy = submittedBy
      }
    }

    // HMRC response fields
    if (hmrcCorrelationId !== undefined) data.hmrcCorrelationId = hmrcCorrelationId
    if (hmrcReceiptId !== undefined) data.hmrcReceiptId = hmrcReceiptId

    const updated = await prisma.vatReturn.update({
      where: { id },
      data,
      include: {
        period: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("VatReturn PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update VAT return" },
      { status: 500 }
    )
  }
}
