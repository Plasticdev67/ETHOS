import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId } = body

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 })
  }

  // Fetch all purchasable BOM lines for the project (exclude LABOUR)
  const bomLines = await prisma.designBomLine.findMany({
    where: {
      designCard: { projectId },
      category: { not: "LABOUR" },
    },
    include: {
      purchaseOrderLines: { select: { id: true } },
    },
  })

  if (bomLines.length === 0) {
    return NextResponse.json({ created: [], message: "No BOM lines found for this project" })
  }

  // Check make/buy status from Sage stock items
  const partNumbers = bomLines
    .map((l) => l.partNumber)
    .filter((pn): pn is string => !!pn)

  const makeItems = new Set<string>()
  if (partNumbers.length > 0) {
    const sageItems = await prisma.sageStockItem.findMany({
      where: {
        stockCode: { in: partNumbers },
        defaultMake: true,
      },
      select: { stockCode: true },
    })
    for (const item of sageItems) {
      makeItems.add(item.stockCode)
    }
  }

  // Filter out "make" items and already-purchased items (those with linked PO lines)
  const unpurchasedLines = bomLines.filter((line) => {
    if (line.partNumber && makeItems.has(line.partNumber)) return false
    if (line.purchaseOrderLines.length > 0) return false
    return true
  })

  if (unpurchasedLines.length === 0) {
    return NextResponse.json({ created: [], message: "All purchasable BOM items already have POs" })
  }

  // Group by supplier name
  const supplierGroups = new Map<string, typeof unpurchasedLines>()
  for (const line of unpurchasedLines) {
    const supplierName = line.supplier?.trim() || "Unassigned"
    if (!supplierGroups.has(supplierName)) {
      supplierGroups.set(supplierName, [])
    }
    supplierGroups.get(supplierName)!.push(line)
  }

  // Get the last PO number to auto-increment
  const lastPo = await prisma.purchaseOrder.findFirst({
    orderBy: { poNumber: "desc" },
    select: { poNumber: true },
  })

  let nextNum = 1001
  if (lastPo) {
    const match = lastPo.poNumber.match(/\d+/)
    if (match) nextNum = parseInt(match[0], 10) + 1
  }

  // Look up existing suppliers by name for linking
  const supplierNames = [...supplierGroups.keys()].filter((n) => n !== "Unassigned")
  const existingSuppliers = supplierNames.length > 0
    ? await prisma.supplier.findMany({
        where: { name: { in: supplierNames, mode: "insensitive" } },
        select: { id: true, name: true },
      })
    : []

  const supplierLookup = new Map<string, string>()
  for (const s of existingSuppliers) {
    supplierLookup.set(s.name.toLowerCase(), s.id)
  }

  // Create a PO for each supplier group
  const created: { poId: string; poNumber: string; supplier: string; lineCount: number; totalValue: number }[] = []

  for (const [supplierName, lines] of supplierGroups) {
    const poNumber = `PO-${String(nextNum).padStart(4, "0")}`
    nextNum++

    const supplierId = supplierLookup.get(supplierName.toLowerCase()) || null

    const poLines = lines.map((line) => ({
      bomLineId: line.id,
      description: line.description,
      quantity: Number(line.quantity),
      unitCost: line.unitCost,
      totalCost: Number(line.quantity) * Number(line.unitCost),
    }))

    const totalValue = poLines.reduce((sum, l) => sum + Number(l.totalCost), 0)

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId,
        supplierId,
        status: "DRAFT",
        totalValue,
        notes: `Auto-generated Quick PO for ${supplierName}`,
        poLines: {
          create: poLines.map((l) => ({
            bomLineId: l.bomLineId,
            description: l.description,
            quantity: l.quantity,
            unitCost: l.unitCost,
            totalCost: l.totalCost,
          })),
        },
      },
    })

    created.push({
      poId: po.id,
      poNumber: po.poNumber,
      supplier: supplierName,
      lineCount: poLines.length,
      totalValue,
    })
  }

  revalidatePath("/purchasing")
  revalidatePath("/finance")

  return NextResponse.json({ created }, { status: 201 })
}
