import { prisma } from "@/lib/db"
import { toDecimal, toDecimalOrDefault } from "@/lib/api-utils"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { id } = await params

    const asset = await prisma.fixedAsset.findUnique({
      where: { id },
      include: {
        category: true,
        depreciationEntries: {
          orderBy: { date: "desc" },
        },
      },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Failed to fetch fixed asset:", error)
    return NextResponse.json(
      { error: "Failed to fetch fixed asset" },
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

    const existing = await prisma.fixedAsset.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
    if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber
    if (body.location !== undefined) updateData.location = body.location
    if (body.residualValue !== undefined) updateData.residualValue = toDecimalOrDefault(body.residualValue, 0)
    if (body.supplierId !== undefined) updateData.supplierId = body.supplierId

    const asset = await prisma.fixedAsset.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    })

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Failed to update fixed asset:", error)
    return NextResponse.json(
      { error: "Failed to update fixed asset" },
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

    if (body.action !== "dispose") {
      return NextResponse.json(
        { error: "Invalid action. Use action=dispose" },
        { status: 400 }
      )
    }

    const asset = await prisma.fixedAsset.findUnique({ where: { id } })
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (asset.status === "DISPOSED") {
      return NextResponse.json(
        { error: "Asset is already disposed" },
        { status: 400 }
      )
    }

    const disposalDate = body.disposalDate ? new Date(body.disposalDate) : new Date()
    const disposalProceeds = body.disposalProceeds ? parseFloat(body.disposalProceeds) : 0
    const nbv = Number(asset.netBookValue)
    const disposalGainLoss = disposalProceeds - nbv

    const updatedAsset = await prisma.fixedAsset.update({
      where: { id },
      data: {
        status: "DISPOSED",
        disposalDate,
        disposalProceeds,
        disposalGainLoss,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(updatedAsset)
  } catch (error) {
    console.error("Failed to dispose fixed asset:", error)
    return NextResponse.json(
      { error: "Failed to dispose fixed asset" },
      { status: 500 }
    )
  }
}
