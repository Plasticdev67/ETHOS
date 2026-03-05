import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = prisma as any

  const tables = [
    ["Projects", () => p.project.count()],
    ["Opportunities", () => p.opportunity.count()],
    ["Quotes", () => p.quote.count()],
    ["Customers", () => p.customer.count()],
    ["Suppliers", () => p.supplier.count()],
    ["PurchaseOrders", () => p.purchaseOrder.count()],
    ["SageStockItems", () => p.sageStockItem.count()],
    ["SageBomHeaders", () => p.sageBomHeader.count()],
    ["SageBomComponents", () => p.sageBomComponent.count()],
    ["Users", () => p.user.count()],
    ["DesignCards", () => p.designCard.count()],
    ["ProductionTasks", () => p.productionTask.count()],
    ["NCRs", () => p.nCR?.count?.() ?? p.ncr?.count?.()],
    ["SalesInvoices", () => p.salesInvoice.count()],
    ["ProductFamilies", () => p.productFamily.count()],
    ["ProductTypes", () => p.productType.count()],
    ["ProductVariants", () => p.productVariant.count()],
  ] as const

  console.log("\n=== DATABASE CONTENTS ===\n")
  for (const [name, fn] of tables) {
    try {
      const count = await fn()
      console.log(`${name}: ${count}`)
    } catch {
      console.log(`${name}: (model not found)`)
    }
  }

  // Sample projects
  const projects = await p.project.findMany({
    select: { projectNumber: true, name: true, projectStatus: true, lifecycleStage: true },
    orderBy: { projectNumber: "asc" },
    take: 20,
  })
  console.log("\n--- ALL PROJECTS ---")
  for (const proj of projects) console.log(`${proj.projectNumber} | ${proj.name} | ${proj.projectStatus} | ${proj.lifecycleStage}`)

  // Sample customers
  const custs = await p.customer.findMany({
    select: { name: true, accountCode: true },
    orderBy: { name: "asc" },
  })
  console.log("\n--- ALL CUSTOMERS ---")
  for (const c of custs) console.log(`${c.accountCode || "none"} | ${c.name}`)

  // Sample suppliers
  const supps = await p.supplier.findMany({
    select: { name: true, accountCode: true },
    orderBy: { name: "asc" },
  })
  console.log("\n--- ALL SUPPLIERS ---")
  for (const s of supps) console.log(`${s.accountCode || "none"} | ${s.name}`)

  // Users
  const users = await p.user.findMany({
    select: { name: true, email: true, role: true },
    orderBy: { name: "asc" },
  })
  console.log("\n--- ALL USERS ---")
  for (const u of users) console.log(`${u.role} | ${u.name} | ${u.email}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})
