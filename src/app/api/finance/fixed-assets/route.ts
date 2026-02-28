import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const categoryId = searchParams.get("categoryId")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (categoryId) {
      where.categoryId = categoryId
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { assetCode: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const assets = await prisma.fixedAsset.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            depreciationMethod: true,
          },
        },
        _count: {
          select: { depreciationEntries: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error("Failed to fetch fixed assets:", error)
    return NextResponse.json(
      { error: "Failed to fetch fixed assets" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      assetCode,
      name,
      description,
      categoryId,
      purchaseDate,
      purchaseCost,
      depreciationMethod,
      usefulLifeMonths,
      residualValue,
      accountId,
      serialNumber,
      location,
      supplierId,
      createdBy,
    } = body

    if (!assetCode || !name || !categoryId || !purchaseDate || !purchaseCost) {
      return NextResponse.json(
        { error: "Missing required fields: assetCode, name, categoryId, purchaseDate, purchaseCost" },
        { status: 400 }
      )
    }

    const asset = await prisma.fixedAsset.create({
      data: {
        assetCode,
        name,
        description: description || null,
        categoryId,
        purchaseDate: new Date(purchaseDate),
        purchaseCost: parseFloat(purchaseCost),
        residualValue: residualValue ? parseFloat(residualValue) : 0,
        netBookValue: parseFloat(purchaseCost),
        serialNumber: serialNumber || null,
        location: location || null,
        supplierId: supplierId || null,
        status: "ASSET_ACTIVE",
        createdBy: createdBy || "system",
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    console.error("Failed to create fixed asset:", error)
    return NextResponse.json(
      { error: "Failed to create fixed asset" },
      { status: 500 }
    )
  }
}
