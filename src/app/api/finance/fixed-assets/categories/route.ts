import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const categories = await prisma.fixedAssetCategory.findMany({
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Failed to fetch asset categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch asset categories" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      depreciationMethod,
      depreciationRate,
      defaultUsefulLifeMonths,
      assetAccountId,
      depreciationAccountId,
      accumulatedDepAccountId,
    } = body

    if (!name || !depreciationAccountId || !accumulatedDepAccountId) {
      return NextResponse.json(
        { error: "Missing required fields: name, depreciationAccountId, accumulatedDepAccountId" },
        { status: 400 }
      )
    }

    const category = await prisma.fixedAssetCategory.create({
      data: {
        name,
        depreciationMethod: depreciationMethod || "STRAIGHT_LINE",
        depreciationRate: depreciationRate ? parseFloat(depreciationRate) : 0,
        usefulLifeMonths: defaultUsefulLifeMonths ? parseInt(defaultUsefulLifeMonths) : null,
        assetAccountId: assetAccountId || "",
        depreciationAccountId,
        accumulatedDepAccountId,
      },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("Failed to create asset category:", error)
    return NextResponse.json(
      { error: "Failed to create asset category" },
      { status: 500 }
    )
  }
}
