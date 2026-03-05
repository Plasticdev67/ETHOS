/**
 * Wipes all business/seed data from the database.
 * Preserves: Users, Chart of Accounts, VAT codes, Accounting Periods, Sequence Counters.
 * Run: npx tsx scripts/wipe-seed-data.ts
 */
import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  console.log("\n=== ETHOS — Wipe Seed Data ===\n")

  // Count before
  const counts: Record<string, number> = {}
  const tables: [string, () => Promise<number>][] = [
    ["DesignBomLines", () => prisma.designBomLine.count()],
    ["DesignJobCards", () => prisma.designJobCard.count()],
    ["DesignCards", () => prisma.productDesignCard.count()],
    ["DesignHandovers", () => prisma.designHandover.count()],
    ["ProductionTasks", () => prisma.productionTask.count()],
    ["Workers", () => prisma.worker.count()],
    ["Documents", () => prisma.document.count()],
    ["PurchaseOrderLines", () => prisma.purchaseOrderLine.count()],
    ["PurchaseOrders", () => prisma.purchaseOrder.count()],
    ["QuoteLines", () => prisma.quoteLine.count()],
    ["Quotes", () => prisma.quote.count()],
    ["NCRs", () => prisma.nonConformanceReport.count()],
    ["SubContracts", () => prisma.subContractorWork.count()],
    ["Retentions", () => prisma.retentionHoldback.count()],
    ["PlantHires", () => prisma.plantHire.count()],
    ["CostCategories", () => prisma.projectCostCategory.count()],
    ["SalesInvoices", () => prisma.salesInvoice.count()],
    ["Variations", () => prisma.variation.count()],
    ["ResourceEstimates", () => prisma.projectResourceEstimate.count()],
    ["OpportunityQuoteLines", () => prisma.opportunityQuoteLine.count()],
    ["Opportunities", () => prisma.opportunity.count()],
    ["Prospects", () => prisma.prospect.count()],
    ["SpecBomModifiers", () => prisma.specBomModifier.count()],
    ["SpecDependencies", () => prisma.specDependency.count()],
    ["BaseBomItems", () => prisma.baseBomItem.count()],
    ["SpecChoices", () => prisma.specChoice.count()],
    ["SpecFields", () => prisma.specField.count()],
    ["ProductVariants", () => prisma.productVariant.count()],
    ["ProductTypes", () => prisma.productType.count()],
    ["ProductFamilies", () => prisma.productFamily.count()],
    ["FeatureTags", () => prisma.featureTag.count()],
    ["LockOptions", () => prisma.lockOption.count()],
    ["CoatingOptions", () => prisma.coatingOption.count()],
    ["Products", () => prisma.product.count()],
    ["ProductCatalogue", () => prisma.productCatalogue.count()],
    ["Projects", () => prisma.project.count()],
    ["CustomerContacts", () => prisma.customerContact.count()],
    ["Customers", () => prisma.customer.count()],
    ["SupplierContacts", () => prisma.supplierContact.count()],
    ["Suppliers", () => prisma.supplier.count()],
    ["ProjectNotes", () => prisma.projectNote.count()],
    ["AuditLogs", () => prisma.auditLog.count()],
  ]

  for (const [name, fn] of tables) {
    counts[name] = await fn()
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log(`Found ${total} records to delete:\n`)
  for (const [name, count] of Object.entries(counts)) {
    if (count > 0) console.log(`  ${name}: ${count}`)
  }

  console.log("\nDeleting in FK-safe order...")

  // 1. Design workflow
  await prisma.designBomLine.deleteMany()
  await prisma.designJobCard.deleteMany()
  await prisma.productDesignCard.deleteMany()
  await prisma.designHandover.deleteMany()
  // 2. Production
  await prisma.productionTask.deleteMany()
  await prisma.worker.deleteMany()
  // 3. Financial
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

  console.log("\nDone. Preserved: Users, Chart of Accounts, VAT codes, Accounting Periods, Sequence Counters.")
  console.log(`Deleted ${total} records.\n`)

  // Verify
  const remaining = {
    Users: await prisma.user.count(),
    SageStockItems: await prisma.sageStockItem.count(),
    SageBomHeaders: await prisma.sageBomHeader.count(),
    SageBomComponents: await prisma.sageBomComponent.count(),
  }
  console.log("Remaining (preserved):")
  for (const [name, count] of Object.entries(remaining)) {
    console.log(`  ${name}: ${count}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})
