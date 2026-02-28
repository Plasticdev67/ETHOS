import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { periodId, date } = body

    if (!periodId) {
      return NextResponse.json(
        { error: "periodId is required" },
        { status: 400 }
      )
    }

    // Validate the period exists and is open
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Accounting period not found" },
        { status: 404 }
      )
    }

    if (period.status === "PERIOD_CLOSED" || period.status === "LOCKED") {
      return NextResponse.json(
        { error: "Cannot run depreciation on a closed or locked period" },
        { status: 400 }
      )
    }

    const depreciationDate = date ? new Date(date) : new Date()

    // Fetch all active fixed assets with their categories
    const assets = await prisma.fixedAsset.findMany({
      where: {
        status: "ASSET_ACTIVE",
      },
      include: {
        category: true,
      },
    })

    if (assets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active assets to depreciate",
        entriesCreated: 0,
        totalDepreciation: 0,
        details: [],
      })
    }

    const depreciationDetails: Array<{
      assetId: string
      assetCode: string
      assetName: string
      method: string
      depreciationAmount: number
      previousAccumulated: number
      newAccumulated: number
      newNetBookValue: number
    }> = []

    let totalDepreciation = 0

    for (const asset of assets) {
      const purchaseCost = Number(asset.purchaseCost)
      const residualValue = Number(asset.residualValue)
      const accumulatedDep = Number(asset.accumulatedDepreciation)
      const depreciableAmount = purchaseCost - residualValue
      const method = asset.category.depreciationMethod
      const rate = Number(asset.category.depreciationRate)
      const usefulLifeMonths = asset.category.usefulLifeMonths

      if (method === "DEP_NONE") continue

      // Skip if fully depreciated
      if (accumulatedDep >= depreciableAmount) continue

      let depAmount = 0

      if (method === "STRAIGHT_LINE") {
        if (usefulLifeMonths && usefulLifeMonths > 0) {
          // Monthly straight-line based on useful life
          depAmount = depreciableAmount / usefulLifeMonths
        } else {
          // Annual rate divided by 12 for monthly depreciation
          depAmount = (purchaseCost * rate) / 100 / 12
        }
      } else if (method === "REDUCING_BALANCE") {
        // Reducing balance: apply rate to net book value
        const currentNBV = purchaseCost - accumulatedDep
        depAmount = (currentNBV * rate) / 100 / 12
      }

      // Round to 2 decimal places
      depAmount = Math.round(depAmount * 100) / 100

      // Do not depreciate below residual value
      if (accumulatedDep + depAmount > depreciableAmount) {
        depAmount = Math.round((depreciableAmount - accumulatedDep) * 100) / 100
      }

      if (depAmount <= 0) continue

      const newAccumulated = Math.round((accumulatedDep + depAmount) * 100) / 100
      const newNBV = Math.round((purchaseCost - newAccumulated) * 100) / 100

      depreciationDetails.push({
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        method,
        depreciationAmount: depAmount,
        previousAccumulated: accumulatedDep,
        newAccumulated,
        newNetBookValue: newNBV,
      })

      totalDepreciation += depAmount
    }

    totalDepreciation = Math.round(totalDepreciation * 100) / 100

    if (depreciationDetails.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No depreciation to process — all assets are fully depreciated or excluded",
        entriesCreated: 0,
        totalDepreciation: 0,
        details: [],
      })
    }

    // Create depreciation entries and update assets in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create individual depreciation entries for each asset
      const depEntries = []
      for (const detail of depreciationDetails) {
        const entry = await tx.depreciationEntry.create({
          data: {
            assetId: detail.assetId,
            date: depreciationDate,
            amount: detail.depreciationAmount,
            periodId,
          },
        })
        depEntries.push(entry)

        // Update the asset's accumulated depreciation and net book value
        await tx.fixedAsset.update({
          where: { id: detail.assetId },
          data: {
            accumulatedDepreciation: detail.newAccumulated,
            netBookValue: detail.newNetBookValue,
            // Mark as fully depreciated if applicable
            ...(detail.newNetBookValue <= Number(
              assets.find((a) => a.id === detail.assetId)!.residualValue
            )
              ? { status: "FULLY_DEPRECIATED" }
              : {}),
          },
        })
      }

      // Create a summary journal entry for the total depreciation
      // Group by category to get the right accounts
      const categoryTotals = new Map<
        string,
        { depAccountId: string; accumAccountId: string; total: number }
      >()

      for (const detail of depreciationDetails) {
        const asset = assets.find((a) => a.id === detail.assetId)!
        const cat = asset.category
        const key = cat.id
        const existing = categoryTotals.get(key)

        if (existing) {
          existing.total += detail.depreciationAmount
        } else {
          categoryTotals.set(key, {
            depAccountId: cat.depreciationAccountId,
            accumAccountId: cat.accumulatedDepAccountId,
            total: detail.depreciationAmount,
          })
        }
      }

      // Generate journal entry number
      const last = await tx.journalEntry.findFirst({
        orderBy: { entryNumber: "desc" },
        select: { entryNumber: true },
      })
      const lastNum = last
        ? parseInt(last.entryNumber.replace("JNL-", ""))
        : 0
      const entryNumber = `JNL-${String(lastNum + 1).padStart(6, "0")}`

      const journalLines: Array<{
        accountId: string
        description: string
        debit: string
        credit: string
      }> = []

      for (const [, catTotal] of categoryTotals) {
        const amount = catTotal.total.toFixed(2)
        // DR Depreciation Expense
        journalLines.push({
          accountId: catTotal.depAccountId,
          description: "Depreciation Expense",
          debit: amount,
          credit: "0",
        })
        // CR Accumulated Depreciation
        journalLines.push({
          accountId: catTotal.accumAccountId,
          description: "Accumulated Depreciation",
          debit: "0",
          credit: amount,
        })
      }

      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: depreciationDate,
          postingDate: new Date(),
          description: `Depreciation run for period: ${period.name}`,
          reference: "DEPRECIATION",
          source: "SYSTEM",
          status: "POSTED",
          periodId,
          totalDebit: totalDepreciation.toFixed(2),
          totalCredit: totalDepreciation.toFixed(2),
          lines: {
            create: journalLines,
          },
        },
      })

      // Update depreciation entries with the journal entry ID
      for (const entry of depEntries) {
        await tx.depreciationEntry.update({
          where: { id: entry.id },
          data: { journalEntryId: journalEntry.id },
        })
      }

      return { journalEntryId: journalEntry.id }
    })

    return NextResponse.json({
      success: true,
      entriesCreated: depreciationDetails.length,
      totalDepreciation,
      journalEntryId: result.journalEntryId,
      details: depreciationDetails,
    })
  } catch (error) {
    console.error("Depreciation run error:", error)
    return NextResponse.json(
      { error: "Failed to run depreciation" },
      { status: 500 }
    )
  }
}
