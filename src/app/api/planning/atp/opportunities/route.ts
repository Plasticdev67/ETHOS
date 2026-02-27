import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  // Fetch all opportunities that could be used for ATP calculation
  // Include: ACTIVE_LEAD, PENDING_APPROVAL, QUOTED, WON (regardless of conversion status)
  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: { in: ["ACTIVE_LEAD", "PENDING_APPROVAL", "QUOTED", "WON"] },
    },
    include: {
      prospect: { select: { companyName: true } },
      quoteLines: {
        include: {
          variant: {
            select: { id: true, name: true, code: true, sageStockCode: true },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  })

  // For each quote line with a variant that has a sageStockCode, look up BOM operations
  const stockCodes = opportunities
    .flatMap(o => o.quoteLines)
    .map(ql => ql.variant?.sageStockCode)
    .filter((sc): sc is string => !!sc)

  const uniqueStockCodes = [...new Set(stockCodes)]

  // Fetch BOM operation run times for these stock codes
  const bomOps = uniqueStockCodes.length > 0
    ? await prisma.sageBomOperation.groupBy({
        by: ["stockCode"],
        _sum: { totalRunTimeMinutes: true, totalLabourMinutes: true },
        where: { stockCode: { in: uniqueStockCodes } },
      })
    : []

  const bomHoursMap: Record<string, number> = {}
  for (const op of bomOps) {
    const runMins = Number(op._sum.totalRunTimeMinutes || 0)
    const labourMins = Number(op._sum.totalLabourMinutes || 0)
    bomHoursMap[op.stockCode] = Math.max(runMins, labourMins) / 60
  }

  // Filter to only opportunities that have at least one quote line with data
  const result = opportunities
    .filter(opp => opp.quoteLines.length > 0)
    .map(opp => ({
      id: opp.id,
      name: opp.name,
      customerName: opp.prospect.companyName,
      status: opp.status,
      estimatedValue: opp.estimatedValue ? Number(opp.estimatedValue) : null,
      expectedCloseDate: opp.expectedCloseDate?.toISOString() || null,
      lines: opp.quoteLines.map(ql => {
        const stockCode = ql.variant?.sageStockCode
        const bomHours = stockCode ? bomHoursMap[stockCode] : null

        return {
          id: ql.id,
          description: ql.description,
          quantity: ql.quantity,
          classification: ql.classification,
          variantName: ql.variant?.name || null,
          variantCode: ql.variant?.code || null,
          stockCode: stockCode || null,
          bomHours: bomHours ? Math.round(bomHours * 10) / 10 : null,
          width: ql.width,
          height: ql.height,
        }
      }),
    }))

  return NextResponse.json({ opportunities: result })
}
