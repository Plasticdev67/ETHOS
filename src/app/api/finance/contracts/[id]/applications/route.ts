import { prisma } from "@/lib/db"
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
      select: { id: true, contractRef: true, currentValue: true, retentionPercent: true },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    const applications = await prisma.applicationForPayment.findMany({
      where: { contractId: id },
      orderBy: { applicationNumber: "desc" },
      include: {
        lines: {
          orderBy: { id: "asc" },
        },
      },
    })

    return NextResponse.json({
      contractId: id,
      contractRef: contract.contractRef,
      applications,
    })
  } catch (error) {
    console.error("GET /api/finance/contracts/[id]/applications error:", error)
    return NextResponse.json(
      { error: "Failed to fetch applications for payment" },
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
      select: {
        id: true,
        retentionPercent: true,
        retentionLimit: true,
        cisApplicable: true,
        cisRate: true,
        currentValue: true,
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      )
    }

    const {
      applicationNumber,
      periodFrom,
      periodTo,
      grossValuation,
      materialsOnSite,
      retentionPercent,
      cumulativeVariations,
      contraCharges,
      contraDescription,
      lines,
      createdBy,
    } = body

    if (!applicationNumber || !periodFrom || !periodTo || grossValuation === undefined) {
      return NextResponse.json(
        { error: "applicationNumber, periodFrom, periodTo, and grossValuation are required" },
        { status: 400 }
      )
    }

    // Get previous application for cumulative calculations
    const previousApp = await prisma.applicationForPayment.findFirst({
      where: { contractId: id },
      orderBy: { applicationNumber: "desc" },
      select: {
        grossCumulativeValue: true,
        cumulativeWorksComplete: true,
        cumulativeMaterialsOnSite: true,
        cumulativeVariations: true,
        retentionHeld: true,
      },
    })

    const prevGross = previousApp ? Number(previousApp.grossCumulativeValue) : 0
    const prevRetention = previousApp ? Number(previousApp.retentionHeld) : 0

    const grossVal = parseFloat(grossValuation)
    const matOnSite = parseFloat(materialsOnSite || "0")
    const cumVariations = parseFloat(cumulativeVariations || "0")
    const cumulativeWorksComplete = grossVal
    const cumulativeMaterialsOnSiteVal = matOnSite
    const grossCumulativeValue = grossVal + matOnSite + cumVariations
    const thisApplicationGross = grossCumulativeValue - prevGross

    // Retention calculation
    const retPct = retentionPercent !== undefined
      ? parseFloat(retentionPercent)
      : Number(contract.retentionPercent)
    let retentionHeld = grossCumulativeValue * (retPct / 100)

    // Apply retention limit if set
    if (contract.retentionLimit && retentionHeld > Number(contract.retentionLimit)) {
      retentionHeld = Number(contract.retentionLimit)
    }

    const retentionRelease = 0

    // CIS deduction
    let cisDeduction = 0
    if (contract.cisApplicable && contract.cisRate) {
      cisDeduction = thisApplicationGross * (Number(contract.cisRate) / 100)
    }

    const contraChargesVal = parseFloat(contraCharges || "0")

    // Applied amount
    const appliedAmount = thisApplicationGross - (retentionHeld - prevRetention) - cisDeduction - contraChargesVal

    const application = await prisma.applicationForPayment.create({
      data: {
        contractId: id,
        applicationNumber: parseInt(applicationNumber, 10),
        periodStart: new Date(periodFrom),
        periodEnd: new Date(periodTo),
        cumulativeWorksComplete,
        cumulativeMaterialsOnSite: cumulativeMaterialsOnSiteVal,
        cumulativeVariations: cumVariations,
        grossCumulativeValue,
        thisApplicationGross,
        retentionHeld: Math.round(retentionHeld * 100) / 100,
        retentionRelease,
        cisDeduction: Math.round(cisDeduction * 100) / 100,
        contraCharges: contraChargesVal,
        contraDescription: contraDescription || null,
        appliedAmount: Math.round(appliedAmount * 100) / 100,
        status: "APP_DRAFT",
        createdBy: createdBy || "system",
        lines: lines?.length
          ? {
              create: lines.map((line: {
                description: string
                contractLineRef?: string
                cumulativeValue: number
                previousValue: number
                thisPeriodValue: number
                percentComplete?: number
              }) => ({
                description: line.description,
                contractLineRef: line.contractLineRef || null,
                cumulativeValue: line.cumulativeValue,
                previousValue: line.previousValue,
                thisPeriodValue: line.thisPeriodValue,
                percentComplete: line.percentComplete || null,
              })),
            }
          : undefined,
      },
      include: {
        lines: true,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/contracts/[id]/applications error:", error)
    return NextResponse.json(
      { error: "Failed to create application for payment" },
      { status: 500 }
    )
  }
}
