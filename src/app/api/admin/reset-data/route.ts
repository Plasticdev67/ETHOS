import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { logAudit } from "@/lib/audit"

/**
 * POST /api/admin/reset-data
 *
 * Wipes all business data from the database, keeping only:
 *   - Users (MME staff logins)
 *   - Chart of Accounts, VAT codes, Accounting Periods
 *   - Sequence counters
 *
 * Pass { confirm: "WIPE ALL DATA" } in the body to execute.
 * Pass { dryRun: true } to preview what would be deleted.
 *
 * DIRECTOR role required.
 */
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("admin:manage")
  if (denied) return denied

  const body = await request.json()
  const dryRun = body.dryRun === true
  const confirmed = body.confirm === "WIPE ALL DATA"

  if (!dryRun && !confirmed) {
    return NextResponse.json({
      error: "Safety check failed. Pass { confirm: \"WIPE ALL DATA\" } to execute, or { dryRun: true } to preview.",
    }, { status: 400 })
  }

  // Count records before deletion
  const counts = {
    designBomLines: await prisma.designBomLine.count(),
    designJobCards: await prisma.designJobCard.count(),
    designCards: await prisma.productDesignCard.count(),
    designHandovers: await prisma.designHandover.count(),
    productionTasks: await prisma.productionTask.count(),
    workers: await prisma.worker.count(),
    documents: await prisma.document.count(),
    purchaseOrderLines: await prisma.purchaseOrderLine.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    quoteLines: await prisma.quoteLine.count(),
    quotes: await prisma.quote.count(),
    ncrs: await prisma.nonConformanceReport.count(),
    subContracts: await prisma.subContractorWork.count(),
    retentions: await prisma.retentionHoldback.count(),
    plantHires: await prisma.plantHire.count(),
    costCategories: await prisma.projectCostCategory.count(),
    salesInvoices: await prisma.salesInvoice.count(),
    variations: await prisma.variation.count(),
    resourceEstimates: await prisma.projectResourceEstimate.count(),
    opportunityQuoteLines: await prisma.opportunityQuoteLine.count(),
    opportunities: await prisma.opportunity.count(),
    prospects: await prisma.prospect.count(),
    specBomModifiers: await prisma.specBomModifier.count(),
    specDependencies: await prisma.specDependency.count(),
    baseBomItems: await prisma.baseBomItem.count(),
    specChoices: await prisma.specChoice.count(),
    specFields: await prisma.specField.count(),
    productVariants: await prisma.productVariant.count(),
    productTypes: await prisma.productType.count(),
    productFamilies: await prisma.productFamily.count(),
    featureTags: await prisma.featureTag.count(),
    lockOptions: await prisma.lockOption.count(),
    coatingOptions: await prisma.coatingOption.count(),
    products: await prisma.product.count(),
    productCatalogue: await prisma.productCatalogue.count(),
    projects: await prisma.project.count(),
    customerContacts: await prisma.customerContact.count(),
    customers: await prisma.customer.count(),
    supplierContacts: await prisma.supplierContact.count(),
    suppliers: await prisma.supplier.count(),
    projectNotes: await prisma.projectNote.count(),
    auditLogs: await prisma.auditLog.count(),
  }

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0)

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      message: `Would delete ${totalRecords} records across ${Object.keys(counts).length} tables`,
      counts,
      preserved: ["users", "accounts", "vatCodes", "accountingPeriods", "sequenceCounters", "nominalCodes"],
    })
  }

  // Execute deletion in FK-safe order
  // 1. Design workflow leaves
  await prisma.designBomLine.deleteMany()
  await prisma.designJobCard.deleteMany()
  await prisma.productDesignCard.deleteMany()
  await prisma.designHandover.deleteMany()
  // 2. Production
  await prisma.productionTask.deleteMany()
  await prisma.worker.deleteMany()
  // 3. Financial leaves
  await prisma.document.deleteMany()
  await prisma.purchaseOrderLine.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.quoteLine.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.nonConformanceReport.deleteMany()
  await prisma.subContractorWork.deleteMany()
  await prisma.retentionHoldback.deleteMany()
  await prisma.plantHire.deleteMany()
  await prisma.projectCostCategory.deleteMany()
  await prisma.salesInvoice.deleteMany()
  await prisma.variation.deleteMany()
  await prisma.projectResourceEstimate.deleteMany()
  await prisma.projectNote.deleteMany()
  // 4. CRM
  await prisma.opportunityQuoteLine.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.prospect.deleteMany()
  // 5. Catalogue hierarchy
  await prisma.specBomModifier.deleteMany()
  await prisma.specDependency.deleteMany()
  await prisma.baseBomItem.deleteMany()
  await prisma.specChoice.deleteMany()
  await prisma.specField.deleteMany()
  await prisma.quoteLineSpec.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.productType.deleteMany()
  await prisma.productFamily.deleteMany()
  // 6. Config tables
  await prisma.featureTag.deleteMany()
  await prisma.lockOption.deleteMany()
  await prisma.coatingOption.deleteMany()
  // 7. Audit
  await prisma.auditLog.deleteMany()
  // 8. Core entities
  await prisma.product.deleteMany()
  await prisma.productCatalogue.deleteMany()
  await prisma.project.deleteMany()
  await prisma.customerContact.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.supplierContact.deleteMany()
  await prisma.supplier.deleteMany()

  await logAudit({
    userId: typeof user === "object" && "id" in user ? (user as { id: string }).id : undefined,
    action: "RESET_DATA",
    entity: "system",
    entityId: "all",
    changes: { deletedRecords: totalRecords, counts },
  })

  return NextResponse.json({
    success: true,
    message: `Deleted ${totalRecords} records. Users, accounts, VAT codes, and sequence counters preserved.`,
    deleted: counts,
    preserved: ["users", "accounts", "vatCodes", "accountingPeriods", "sequenceCounters", "nominalCodes"],
  })
}
