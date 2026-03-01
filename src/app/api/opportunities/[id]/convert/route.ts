import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch opportunity with prospect and quote lines
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      prospect: true,
      quoteLines: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 })
  }

  if (opportunity.status === "WON" && opportunity.convertedProjectId) {
    return NextResponse.json(
      { error: "Opportunity already converted" },
      { status: 400 }
    )
  }

  try {
  // Step 1: Create or reuse Customer from Prospect
  let customerId = opportunity.prospect.convertedCustomerId

  if (!customerId) {
    const customer = await prisma.customer.create({
      data: {
        name: opportunity.prospect.companyName,
        customerType: "OTHER",
        email: opportunity.prospect.contactEmail,
        phone: opportunity.prospect.contactPhone,
        address: opportunity.prospect.address,
        notes: `Converted from CRM prospect. Sector: ${opportunity.prospect.sector || "N/A"}`,
      },
    })
    customerId = customer.id

    // Update prospect with converted customer ID and status
    await prisma.prospect.update({
      where: { id: opportunity.prospectId },
      data: {
        convertedCustomerId: customerId,
        status: "CONVERTED",
      },
    })

    await logAudit({
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
      metadata: `Converted from prospect: ${opportunity.prospect.companyName}`,
    })
  }

  // Step 2: Auto-generate project number (same pattern as /api/projects)
  const lastProject = await prisma.project.findFirst({
    orderBy: { projectNumber: "desc" },
    select: { projectNumber: true },
  })

  let nextNumber = 100001
  if (lastProject) {
    const lastNum = parseInt(lastProject.projectNumber, 10)
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1
    }
  }

  // Step 3: Create Project at P0 / OPPORTUNITY stage
  const project = await prisma.project.create({
    data: {
      projectNumber: String(nextNumber),
      name: opportunity.name,
      customerId: customerId,
      projectType: "STANDARD",
      workStream: "BESPOKE",
      salesStage: "ORDER",
      projectStatus: "DESIGN",
      contractType: "STANDARD",
      lifecycleStage: "P2",
      priority: "NORMAL",
      estimatedValue: opportunity.estimatedValue,
      contractValue: opportunity.quotedPrice ?? opportunity.estimatedValue,
      enquiryReceived: new Date(),
      orderReceived: new Date(),
    },
  })

  // Step 4: Migrate quote lines into a formal Quote
  if (opportunity.quoteLines.length > 0) {
    // Auto-generate quote number (same pattern as /api/quotes)
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { quoteNumber: "desc" },
      select: { quoteNumber: true },
    })

    let nextQuoteNum = 1001
    if (lastQuote) {
      const match = lastQuote.quoteNumber.match(/Q-(\d+)/)
      if (match) nextQuoteNum = parseInt(match[1], 10) + 1
    }

    // Calculate totals from opportunity
    const totalCost = opportunity.quoteLines.reduce(
      (sum, l) => sum + Number(l.totalCost),
      0
    )
    const quotedPrice = opportunity.quotedPrice
      ? Number(opportunity.quotedPrice)
      : totalCost
    const marginPercent = opportunity.marginPercent
      ? Number(opportunity.marginPercent)
      : null

    const quote = await prisma.quote.create({
      data: {
        customerId: customerId,
        projectId: project.id,
        quoteNumber: `Q-${String(nextQuoteNum).padStart(4, "0")}`,
        status: "ACCEPTED",
        subject: opportunity.name,
        dateCreated: new Date(),
        dateSubmitted: new Date(),
        totalCost: totalCost,
        totalSell: quotedPrice,
        overallMargin: marginPercent,
        notes: `Converted from CRM opportunity. ${
          opportunity.quoteLines.some(
            (l) => l.classification === "ENGINEER_TO_ORDER"
          )
            ? "Contains Engineer to Order items."
            : ""
        }`.trim(),
      },
    })

    // Create QuoteLines from each OpportunityQuoteLine
    for (const oppLine of opportunity.quoteLines) {
      const quoteLine = await prisma.quoteLine.create({
        data: {
          quoteId: quote.id,
          description: oppLine.description,
          quantity: oppLine.quantity,
          unitCost: oppLine.unitCost,
          costTotal: oppLine.totalCost,
          sellPrice: oppLine.totalCost,
          sortOrder: oppLine.sortOrder,
          dimensions:
            oppLine.width && oppLine.height
              ? `${oppLine.width} x ${oppLine.height}`
              : null,
        },
      })

      // If this line has catalogue/spec data, create a QuoteLineSpec
      if (oppLine.variantId) {
        await prisma.quoteLineSpec.create({
          data: {
            quoteLineId: quoteLine.id,
            variantId: oppLine.variantId,
            width: oppLine.width,
            height: oppLine.height,
            specSelections: oppLine.specSelections ?? {},
            computedBom: oppLine.computedBom ?? [],
            computedCost: oppLine.computedCost ?? 0,
          },
        })
      }
    }

    await logAudit({
      action: "CREATE",
      entity: "Quote",
      entityId: quote.id,
      metadata: `Auto-created from CRM opportunity: ${opportunity.name} (${quote.quoteNumber})`,
    })
  }

  // Step 4b: Create Product records on the project from quote lines
  for (let i = 0; i < opportunity.quoteLines.length; i++) {
    const oppLine = opportunity.quoteLines[i]
    const jobNum = `${String(nextNumber)}-${String(i + 1).padStart(2, "0")}`

    // Look up variant's Sage stock code for the partCode and catalogue link
    let partCode = `ITEM-${i + 1}`
    let catalogueItemId: string | null = null
    if (oppLine.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: oppLine.variantId },
        select: { sageStockCode: true, code: true, catalogueItemId: true },
      })
      if (variant) {
        partCode = variant.sageStockCode || variant.code
        // Link to ProductCatalogue (either via the variant's link or by matching partCode)
        if (variant.catalogueItemId) {
          catalogueItemId = variant.catalogueItemId
        } else {
          const catItem = await prisma.productCatalogue.findUnique({
            where: { partCode },
            select: { id: true },
          })
          if (catItem) catalogueItemId = catItem.id
        }
      }
    }

    await prisma.product.create({
      data: {
        projectId: project.id,
        partCode,
        description: oppLine.description,
        quantity: oppLine.quantity,
        productJobNumber: jobNum,
        catalogueItemId,
        additionalDetails:
          oppLine.width && oppLine.height
            ? `${oppLine.width}mm x ${oppLine.height}mm`
            : null,
      },
    })
  }

  // Step 5: Update Opportunity as WON with link to project
  await prisma.opportunity.update({
    where: { id },
    data: {
      status: "WON",
      convertedProjectId: project.id,
      convertedAt: new Date(),
    },
  })

  await logAudit({
    action: "CREATE",
    entity: "Project",
    entityId: project.id,
    metadata: `Converted from CRM opportunity: ${opportunity.name}`,
  })

  revalidatePath("/design")
  revalidatePath("/projects")
  revalidatePath("/crm")

  return NextResponse.json({
    success: true,
    customerId,
    projectId: project.id,
    projectNumber: project.projectNumber,
  })
  } catch (error) {
    console.error("Failed to convert opportunity:", error)
    return NextResponse.json(
      { error: "Failed to convert opportunity. Some records may have been partially created." },
      { status: 500 }
    )
  }
}
