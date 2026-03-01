import { prisma } from "@/lib/db"
import { toDecimalOrDefault } from "@/lib/api-utils"
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
      select: { id: true, contractRef: true, originalValue: true, currentValue: true },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    const variations = await prisma.contractVariation.findMany({
      where: { contractId: id },
      orderBy: { createdAt: "desc" },
    })

    // Calculate summary
    const approved = variations.filter((v) => v.status === "CV_APPROVED")
    const pending = variations.filter((v) => v.status === "CV_SUBMITTED" || v.status === "UNDER_REVIEW")
    const totalApprovedValue = approved.reduce(
      (sum, v) => sum + Number(v.approvedValue || v.value),
      0
    )
    const totalPendingValue = pending.reduce(
      (sum, v) => sum + Number(v.value),
      0
    )

    return NextResponse.json({
      contractId: id,
      contractRef: contract.contractRef,
      variations,
      summary: {
        totalVariations: variations.length,
        approvedCount: approved.length,
        pendingCount: pending.length,
        totalApprovedValue: Math.round(totalApprovedValue * 100) / 100,
        totalPendingValue: Math.round(totalPendingValue * 100) / 100,
        originalValue: Number(contract.originalValue),
        currentValue: Number(contract.currentValue),
      },
    })
  } catch (error) {
    console.error("GET /api/finance/contracts/[id]/variations error:", error)
    return NextResponse.json(
      { error: "Failed to fetch variations" },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const contract = await prisma.constructionContract.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    const { variationRef, description, valueChange, status } = body

    if (!variationRef || !description || valueChange === undefined) {
      return NextResponse.json(
        { error: "variationRef, description, and valueChange are required" },
        { status: 400 }
      )
    }

    const variation = await prisma.contractVariation.create({
      data: {
        contractId: id,
        variationRef,
        description,
        value: toDecimalOrDefault(valueChange, 0),
        status: status || "CV_SUBMITTED",
        submittedDate: new Date(),
      },
    })

    // If status is CV_APPROVED, update contract currentValue
    if (status === "CV_APPROVED") {
      await prisma.constructionContract.update({
        where: { id },
        data: {
          currentValue: {
            increment: toDecimalOrDefault(valueChange, 0),
          },
        },
      })
    }

    revalidatePath("/finance")
    return NextResponse.json(variation, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/contracts/[id]/variations error:", error)
    return NextResponse.json(
      { error: "Failed to create variation" },
      { status: 500 }
    )
  }
}
