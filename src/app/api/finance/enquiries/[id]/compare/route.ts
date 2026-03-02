import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  const { id } = await params

  const enquiry = await prisma.procurementEnquiry.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      responses: {
        include: {
          supplier: { select: { id: true, name: true } },
          lines: true,
        },
      },
    },
  })

  if (!enquiry) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
  }

  // Build comparison data: one row per enquiry line, columns per supplier
  const lines = enquiry.lines.map((line) => {
    const responses = enquiry.responses.map((resp) => {
      const respLine = resp.lines.find(
        (rl) => rl.enquiryLineId === line.id
      )
      return {
        responseId: resp.id,
        supplierId: resp.supplier.id,
        supplierName: resp.supplier.name,
        status: resp.status,
        unitPrice: respLine ? Number(respLine.unitPrice) : null,
        totalPrice: respLine ? Number(respLine.totalPrice) : null,
        leadTimeDays: respLine?.leadTimeDays ?? null,
        available: respLine?.available ?? null,
        notes: respLine?.notes ?? null,
      }
    })

    return {
      lineId: line.id,
      description: line.description,
      partNumber: line.partNumber,
      quantity: Number(line.quantity),
      unit: line.unit,
      responses,
    }
  })

  // Calculate totals per supplier
  const totals = enquiry.responses.map((resp) => {
    const supplierLines = resp.lines
    const total = supplierLines.reduce(
      (sum, rl) => sum + (Number(rl.totalPrice) || 0),
      0
    )
    const leadTimes = supplierLines
      .filter((rl) => rl.leadTimeDays !== null)
      .map((rl) => rl.leadTimeDays as number)
    const avgLeadTime =
      leadTimes.length > 0
        ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
        : null
    const maxLeadTime = leadTimes.length > 0 ? Math.max(...leadTimes) : null

    return {
      responseId: resp.id,
      supplierId: resp.supplier.id,
      supplierName: resp.supplier.name,
      status: resp.status,
      total,
      totalQuoted: resp.totalQuoted ? Number(resp.totalQuoted) : total,
      avgLeadTime,
      maxLeadTime,
      validUntil: resp.validUntil,
    }
  })

  return NextResponse.json({ lines, totals })
}
