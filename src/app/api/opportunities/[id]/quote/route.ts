import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Update quoting fields (rdCost, riskCost, marginPercent) and recalculate quotedPrice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}

  if (body.rdCost !== undefined) {
    data.rdCost = body.rdCost !== "" && body.rdCost !== null ? parseFloat(body.rdCost) : null
  }
  if (body.riskCost !== undefined) {
    data.riskCost = body.riskCost !== "" && body.riskCost !== null ? parseFloat(body.riskCost) : null
  }
  if (body.marginPercent !== undefined) {
    data.marginPercent = body.marginPercent !== "" && body.marginPercent !== null ? parseFloat(body.marginPercent) : null
  }

  // Recalculate quotedPrice: (lineItemsTotal + rdCost + riskCost) * (1 + margin/100)
  const lines = await prisma.opportunityQuoteLine.findMany({
    where: { opportunityId: id },
  })
  const lineItemsTotal = lines.reduce((sum, l) => sum + Number(l.totalCost), 0)

  // Get current opportunity for existing values
  const opp = await prisma.opportunity.findUnique({ where: { id } })
  if (!opp) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
  }

  const rdCost = data.rdCost !== undefined ? (data.rdCost as number | null) ?? 0 : Number(opp.rdCost ?? 0)
  const riskCost = data.riskCost !== undefined ? (data.riskCost as number | null) ?? 0 : Number(opp.riskCost ?? 0)
  const marginPercent = data.marginPercent !== undefined ? (data.marginPercent as number | null) ?? 0 : Number(opp.marginPercent ?? 0)

  const baseCost = lineItemsTotal + rdCost + riskCost
  const quotedPrice = baseCost * (1 + marginPercent / 100)

  data.quotedPrice = Math.round(quotedPrice * 100) / 100

  const updated = await prisma.opportunity.update({
    where: { id },
    data,
  })

  return NextResponse.json(updated)
}

// POST: Submit for approval or approve/reject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const action = body.action // "submit" | "approve" | "reject"

  const opp = await prisma.opportunity.findUnique({
    where: { id },
    include: { quoteLines: true },
  })

  if (!opp) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
  }

  if (action === "submit") {
    // Validate there are line items
    if (opp.quoteLines.length === 0) {
      return NextResponse.json({ error: "Add at least one line item before submitting" }, { status: 400 })
    }

    // Auto-generate quote number if not already set
    let quoteNumber = opp.quoteNumber
    if (!quoteNumber) {
      const year = new Date().getFullYear()
      const prefix = `QUO-${year}-`
      const lastOpp = await prisma.opportunity.findFirst({
        where: { quoteNumber: { startsWith: prefix } },
        orderBy: { quoteNumber: "desc" },
        select: { quoteNumber: true },
      })
      let nextSeq = 1
      if (lastOpp?.quoteNumber) {
        const match = lastOpp.quoteNumber.match(/QUO-\d{4}-(\d+)/)
        if (match) nextSeq = parseInt(match[1], 10) + 1
      }
      quoteNumber = `${prefix}${String(nextSeq).padStart(4, "0")}`
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        quoteNumber,
        quoteApproval: "PENDING_APPROVAL",
        status: "PENDING_APPROVAL",
      },
    })
    return NextResponse.json(updated)
  }

  if (action === "mark_sent") {
    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        quoteSentAt: new Date(),
        quoteSentTo: body.sentTo || null,
      },
    })
    return NextResponse.json(updated)
  }

  if (action === "approve") {
    // Check if any line is ETO — requires Director-level or ADMIN approval
    const hasEto = opp.quoteLines.some(
      (l: { classification?: string }) => l.classification === "ENGINEER_TO_ORDER"
    )

    if (hasEto) {
      const session = await auth()
      const userRole = (session?.user as { role?: string })?.role
      const approvalRoles = ["MANAGING_DIRECTOR", "TECHNICAL_DIRECTOR", "SALES_DIRECTOR", "ADMIN"]
      if (!userRole || !approvalRoles.includes(userRole)) {
        return NextResponse.json(
          { error: "Quotes containing Innovate to Order items require Director approval" },
          { status: 403 }
        )
      }
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        quoteApproval: "APPROVED",
        status: "QUOTED",
        estimatedValue: opp.quotedPrice,
      },
    })
    return NextResponse.json(updated)
  }

  if (action === "reject") {
    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        quoteApproval: "REJECTED",
        status: "PENDING_APPROVAL",
      },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
