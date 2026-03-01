import { prisma } from "@/lib/db"
import { toDecimal, toDecimalOrDefault } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { id } = await params

    const contract = await prisma.constructionContract.findUnique({
      where: { id },
      include: {
        variations: {
          orderBy: { createdAt: "desc" },
        },
        applications: {
          orderBy: { applicationNumber: "desc" },
          include: {
            lines: true,
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    // Calculate summary
    const approvedVariations = contract.variations
      .filter((v) => v.status === "CV_APPROVED")
      .reduce((sum, v) => sum + Number(v.approvedValue || v.value), 0)

    const totalApplied = contract.applications.reduce(
      (sum, a) => sum + Number(a.appliedAmount),
      0
    )
    const totalCertified = contract.applications.reduce(
      (sum, a) => sum + Number(a.certifiedAmount || 0),
      0
    )
    const totalPaid = contract.applications.reduce(
      (sum, a) => sum + Number(a.paymentReceivedAmount || 0),
      0
    )
    const totalRetentionHeld = contract.applications.reduce(
      (sum, a) => sum + Number(a.retentionHeld),
      0
    )

    return NextResponse.json({
      ...contract,
      summary: {
        originalValue: Number(contract.originalValue),
        currentValue: Number(contract.currentValue),
        approvedVariations,
        totalApplied: Math.round(totalApplied * 100) / 100,
        totalCertified: Math.round(totalCertified * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalRetentionHeld: Math.round(totalRetentionHeld * 100) / 100,
        outstandingAmount: Math.round((totalCertified - totalPaid) * 100) / 100,
        percentComplete: Number(contract.currentValue) > 0
          ? Math.round((totalCertified / Number(contract.currentValue)) * 10000) / 100
          : 0,
      },
    })
  } catch (error) {
    console.error("GET /api/finance/contracts/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.constructionContract.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.status) updateData.status = body.status
    if (body.contractType) updateData.contractType = body.contractType
    if (body.originalValue !== undefined) updateData.originalValue = toDecimalOrDefault(body.originalValue, 0)
    if (body.currentValue !== undefined) updateData.currentValue = toDecimalOrDefault(body.currentValue, 0)
    if (body.retentionPercent !== undefined) updateData.retentionPercent = toDecimalOrDefault(body.retentionPercent, 0)
    if (body.retentionLimit !== undefined) updateData.retentionLimit = toDecimal(body.retentionLimit)
    if (body.defectsLiabilityMonths !== undefined) updateData.defectsLiabilityMonths = body.defectsLiabilityMonths
    if (body.cisApplicable !== undefined) updateData.cisApplicable = body.cisApplicable
    if (body.cisRate !== undefined) updateData.cisRate = toDecimal(body.cisRate)
    if (body.description !== undefined) updateData.description = body.description
    if (body.practicalCompletionDate) updateData.practicalCompletionDate = new Date(body.practicalCompletionDate)
    if (body.finalAccountAgreed !== undefined) updateData.finalAccountAgreed = body.finalAccountAgreed
    if (body.clientName !== undefined) updateData.clientName = body.clientName

    const contract = await prisma.constructionContract.update({
      where: { id },
      data: updateData,
    })

    revalidatePath("/finance")
    return NextResponse.json(contract)
  } catch (error) {
    console.error("PUT /api/finance/contracts/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 }
    )
  }
}
