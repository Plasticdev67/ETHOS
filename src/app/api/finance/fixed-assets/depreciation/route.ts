import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { periodId, date } = body

    if (!periodId || !date) {
      return NextResponse.json(
        { error: "Missing required fields: periodId, date" },
        { status: 400 }
      )
    }

    const depreciationDate = new Date(date)

    // Fetch all active assets with their categories
    const activeAssets = await prisma.fixedAsset.findMany({
      where: { status: "ASSET_ACTIVE" },
      include: { category: true },
    })

    const results: Array<{
      assetId: string
      assetCode: string
      assetName: string
      depreciationAmount: number
      newNBV: number
    }> = []
    const errors: Array<{ assetId: string; assetCode: string; error: string }> = []

    for (const asset of activeAssets) {
      try {
        const purchaseCost = Number(asset.purchaseCost)
        const residualValue = Number(asset.residualValue)
        const currentNBV = Number(asset.netBookValue)
        const accumulatedDep = Number(asset.accumulatedDepreciation)

        // Skip if already fully depreciated
        if (currentNBV <= residualValue) {
          continue
        }

        let monthlyDepreciation = 0
        const method = asset.category.depreciationMethod

        if (method === "STRAIGHT_LINE") {
          const usefulLifeMonths = asset.category.usefulLifeMonths
          if (usefulLifeMonths && usefulLifeMonths > 0) {
            monthlyDepreciation = (purchaseCost - residualValue) / usefulLifeMonths
          } else {
            // Use depreciation rate as annual percentage
            const annualRate = Number(asset.category.depreciationRate) / 100
            monthlyDepreciation = ((purchaseCost - residualValue) * annualRate) / 12
          }
        } else if (method === "REDUCING_BALANCE") {
          const annualRate = Number(asset.category.depreciationRate) / 100
          monthlyDepreciation = (currentNBV * annualRate) / 12
        } else {
          // DEP_NONE - skip
          continue
        }

        // Round to 2 decimal places
        monthlyDepreciation = Math.round(monthlyDepreciation * 100) / 100

        // Don't depreciate below residual value
        if (currentNBV - monthlyDepreciation < residualValue) {
          monthlyDepreciation = Math.round((currentNBV - residualValue) * 100) / 100
        }

        if (monthlyDepreciation <= 0) {
          continue
        }

        const newNBV = Math.round((currentNBV - monthlyDepreciation) * 100) / 100
        const newAccumulatedDep = Math.round((accumulatedDep + monthlyDepreciation) * 100) / 100

        // Create depreciation entry and update asset in a transaction
        await prisma.$transaction([
          prisma.depreciationEntry.create({
            data: {
              assetId: asset.id,
              date: depreciationDate,
              amount: monthlyDepreciation,
              periodId,
            },
          }),
          prisma.fixedAsset.update({
            where: { id: asset.id },
            data: {
              netBookValue: newNBV,
              accumulatedDepreciation: newAccumulatedDep,
              status: newNBV <= residualValue ? "FULLY_DEPRECIATED" : "ASSET_ACTIVE",
            },
          }),
        ])

        results.push({
          assetId: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.name,
          depreciationAmount: monthlyDepreciation,
          newNBV,
        })
      } catch (assetError) {
        errors.push({
          assetId: asset.id,
          assetCode: asset.assetCode,
          error: assetError instanceof Error ? assetError.message : "Unknown error",
        })
      }
    }

    const totalDepreciation = results.reduce((sum, r) => sum + r.depreciationAmount, 0)

    return NextResponse.json({
      summary: {
        assetsProcessed: results.length,
        totalDepreciation: Math.round(totalDepreciation * 100) / 100,
        errors: errors.length,
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Failed to run depreciation:", error)
    return NextResponse.json(
      { error: "Failed to run depreciation" },
      { status: 500 }
    )
  }
}
