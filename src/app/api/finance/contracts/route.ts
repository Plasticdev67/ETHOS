import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1", 10)
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10)

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { contractRef: { contains: search, mode: "insensitive" } },
        { clientName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [contracts, total] = await Promise.all([
      prisma.constructionContract.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              variations: true,
              applications: true,
            },
          },
          applications: {
            orderBy: { applicationNumber: "desc" },
            take: 1,
            select: {
              applicationNumber: true,
              status: true,
              appliedAmount: true,
              certifiedAmount: true,
              paymentReceivedAmount: true,
            },
          },
        },
      }),
      prisma.constructionContract.count({ where }),
    ])

    // Add summary data for each contract
    const contractsWithSummary = contracts.map((contract) => {
      const latestApp = contract.applications[0] || null
      return {
        ...contract,
        applications: undefined,
        latestApplication: latestApp,
        summary: {
          variationCount: contract._count.variations,
          applicationCount: contract._count.applications,
          contractValue: Number(contract.currentValue),
          originalValue: Number(contract.originalValue),
          variationValue: Number(contract.currentValue) - Number(contract.originalValue),
        },
      }
    })

    return NextResponse.json({
      data: contractsWithSummary,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("GET /api/finance/contracts error:", error)
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      contractRef,
      projectId,
      customerId,
      contractType,
      originalValue,
      retentionPercent,
      defectsLiabilityMonths,
      description,
      cisApplicable,
      cisRate,
      retentionLimit,
      createdBy,
    } = body

    if (!contractRef || !projectId || !customerId || !contractType || originalValue === undefined) {
      return NextResponse.json(
        { error: "contractRef, projectId, customerId, contractType, and originalValue are required" },
        { status: 400 }
      )
    }

    // Fetch customer name for denormalized storage
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true },
    })

    const contract = await prisma.constructionContract.create({
      data: {
        contractRef,
        projectId,
        clientId: customerId,
        clientName: customer?.name || null,
        contractType,
        originalValue: parseFloat(originalValue),
        currentValue: parseFloat(originalValue),
        retentionPercent: parseFloat(retentionPercent || "0"),
        retentionLimit: retentionLimit ? parseFloat(retentionLimit) : null,
        defectsLiabilityMonths: defectsLiabilityMonths || 12,
        cisApplicable: cisApplicable || false,
        cisRate: cisRate ? parseFloat(cisRate) : null,
        status: "CONTRACT_DRAFT",
        description: description || null,
        createdBy: createdBy || "system",
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error("POST /api/finance/contracts error:", error)
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    )
  }
}
