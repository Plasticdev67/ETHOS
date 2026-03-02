import { prisma } from "@/lib/db"
import { BomLibraryClient } from "@/components/bom/bom-library-client"

export const dynamic = 'force-dynamic'

async function getData() {
  const [stockItems, bomHeaders, operationSummary, familyCounts] = await Promise.all([
    prisma.sageStockItem.findMany({
      orderBy: { stockCode: "asc" },
      select: {
        id: true,
        stockCode: true,
        name: true,
        description: true,
        productGroup: true,
        productFamily: true,
        itemSetType: true,
        operationType: true,
        materialComposition: true,
        bomItemType: true,
        defaultMake: true,
        supplierRef: true,
        supplierLeadTime: true,
        supplierLeadTimeUnit: true,
      },
    }),
    prisma.sageBomHeader.findMany({
      orderBy: { headerRef: "asc" },
      include: {
        components: {
          orderBy: { sequenceNo: "asc" },
          select: {
            id: true,
            stockCode: true,
            description: true,
            sequenceNo: true,
            quantity: true,
            unitOfMeasure: true,
          },
        },
        operations: {
          orderBy: { sequenceNo: "asc" },
          select: {
            id: true,
            sequenceNo: true,
            operationRef: true,
            operationDescription: true,
            labourRef: true,
            totalRunTimeMinutes: true,
            totalLabourMinutes: true,
          },
        },
        _count: {
          select: { components: true, operations: true },
        },
      },
    }),
    prisma.sageBomOperation.groupBy({
      by: ["operationRef"],
      _count: { id: true },
      _sum: { totalLabourMinutes: true },
    }),
    prisma.sageStockItem.groupBy({
      by: ["productFamily"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ])

  return {
    stockItems: stockItems.map((s) => ({
      ...s,
      supplierLeadTime: s.supplierLeadTime ?? null,
    })),
    bomHeaders: bomHeaders.map((h) => ({
      ...h,
      components: h.components.map((c) => ({
        ...c,
        quantity: Number(c.quantity),
      })),
      operations: h.operations.map((o) => ({
        ...o,
        totalRunTimeMinutes: o.totalRunTimeMinutes ? Number(o.totalRunTimeMinutes) : 0,
        totalLabourMinutes: o.totalLabourMinutes ? Number(o.totalLabourMinutes) : 0,
      })),
    })),
    operationSummary: operationSummary.map((o) => ({
      operationRef: o.operationRef,
      count: o._count.id,
      totalHours: o._sum.totalLabourMinutes
        ? Math.round(Number(o._sum.totalLabourMinutes) / 60 * 10) / 10
        : 0,
    })),
    familyCounts: familyCounts
      .filter((f) => f.productFamily !== null)
      .map((f) => ({
        family: f.productFamily!,
        count: f._count.id,
      })),
  }
}

export default async function BomLibraryPage() {
  const data = await getData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">BOM Library</h1>
        <p className="text-sm text-gray-500">
          {data.stockItems.length} stock items &middot; {data.bomHeaders.length} bills of
          materials &middot; {data.operationSummary.reduce((s, o) => s + o.count, 0)} operations
        </p>
      </div>
      <BomLibraryClient
        stockItems={data.stockItems}
        bomHeaders={data.bomHeaders}
        operationSummary={data.operationSummary}
        familyCounts={data.familyCounts}
      />
    </div>
  )
}
