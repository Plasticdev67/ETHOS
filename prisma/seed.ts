import { config } from "dotenv"
config()

async function loadPrisma() {
  const pg = await import("pg")
  const adapterMod = await import("@prisma/adapter-pg")
  const mod = await import("../src/generated/prisma/client.js")

  const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new adapterMod.PrismaPg(pool)
  return new mod.PrismaClient({ adapter })
}

let prisma: any

async function main() {
  prisma = await loadPrisma()
  console.log("Seeding database (users only)...")

  // Clean existing data (order matters: delete leaf tables first, then parents)
  // 1. Design workflow leaves
  await prisma.designBomLine.deleteMany()
  await prisma.designJobCard.deleteMany()
  await prisma.productDesignCard.deleteMany()
  await prisma.designHandover.deleteMany()
  // 2. Production workflow
  await prisma.productionTask.deleteMany()
  // 3. Financial / document leaves
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
  await prisma.worker.deleteMany()
  // 7. Audit / misc
  await prisma.auditLog.deleteMany()
  await prisma.suggestion.deleteMany()
  await prisma.projectNote.deleteMany()
  // 8. Core entities
  await prisma.product.deleteMany()
  await prisma.productCatalogue.deleteMany()
  await prisma.project.deleteMany()
  await prisma.customerContact.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.supplierContact.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.user.deleteMany()

  // ========================================
  // USERS — All MME staff aligned with JRD roles
  // ========================================
  console.log("Creating users...")
  const { hash } = await import("bcryptjs")
  const defaultHash = await hash("MME2026!", 10)

  const staffData = [
    // Directors
    { name: "Chris McDermid",   email: "chris.mcdermid@mme.co.uk",   role: "DIRECTOR",  department: "DIRECTORS" },
    { name: "James Morton",     email: "james.morton@mme.co.uk",     role: "DIRECTOR",  department: "DIRECTORS" },
    { name: "Martin McDermid",  email: "mm@mme.co.uk",               role: "DIRECTOR",  department: "DIRECTORS" },

    // Engineering
    { name: "Shaun Griffiths",  email: "shaun.griffiths@mme.co.uk",  role: "ENGINEERING_MANAGER", department: "ENGINEERING" },
    { name: "Gregg Hughes",     email: "gregg.hughes@mme.co.uk",     role: "DESIGN_ENGINEER",     department: "ENGINEERING" },
    { name: "Andrew Robinson",  email: "andrew.robinson@mme.co.uk",  role: "DESIGN_ENGINEER",     department: "ENGINEERING" },
    { name: "David Howells",    email: "david.howells@mme.co.uk",    role: "DESIGN_ENGINEER",     department: "ENGINEERING" },
    { name: "Samuel Roberts",   email: "samuel.roberts@mme.co.uk",   role: "DESIGN_ENGINEER",     department: "ENGINEERING" },
    { name: "Kelan Taylor",     email: "kelan.taylor@mme.co.uk",     role: "DESIGN_ENGINEER",     department: "ENGINEERING" },

    // R&D
    { name: "Reece Hobson",     email: "reece.hobson@mme.co.uk",     role: "R_AND_D_MANAGER",     department: "R_AND_D" },

    // Production
    { name: "Marc Pridmore",    email: "marc.pridmore@mme.co.uk",    role: "PRODUCTION_MANAGER",  department: "PRODUCTION" },
    { name: "Nathan Hope",      email: "nathan.hope@mme.co.uk",      role: "PRODUCTION_SUPERVISOR", department: "PRODUCTION" },

    // Projects
    { name: "Corey Thomas",     email: "corey.thomas@mme.co.uk",     role: "PROJECT_MANAGER",     department: "PROJECTS" },
    { name: "Richard Guest",    email: "richard.guest@mme.co.uk",    role: "PROJECT_COORDINATOR", department: "PROJECTS" },
    { name: "Adam Parry",       email: "adam.parry@mme.co.uk",       role: "PROJECT_ADMINISTRATOR", department: "PROJECTS" },

    // Sales / Business Development
    { name: "Stephen McDermid", email: "stephen.mcdermid@mme.co.uk", role: "BUSINESS_DEVELOPMENT", department: "SALES" },

    // Finance / IT / Procurement
    { name: "Owen Hughes",      email: "owen.hughes@mme.co.uk",      role: "HEAD_OF_FINANCE_IT_PROCUREMENT", department: "FINANCE_IT_PROCUREMENT" },
    { name: "Marc Harrison",    email: "marc.harrison@mme.co.uk",    role: "FINANCE_MANAGER",     department: "FINANCE_IT_PROCUREMENT" },

    // Accounts
    { name: "Amy Carter",       email: "amy.carter@mme.co.uk",       role: "ACCOUNTS",            department: "FINANCE_IT_PROCUREMENT" },
    { name: "Catherine Morris", email: "catherine.morris@mme.co.uk", role: "ACCOUNTS",            department: "FINANCE_IT_PROCUREMENT" },
    { name: "Teresa Millan",    email: "teresa.millan@mme.co.uk",    role: "ACCOUNTS",            department: "FINANCE_IT_PROCUREMENT" },

    // Production Planning
    { name: "Geraint Morgan",   email: "geraint.morgan@mme.co.uk",   role: "PRODUCTION_PLANNER",  department: "PRODUCTION" },

    // System Admin
    { name: "Rick Zhou",        email: "rick.zhou@mme.co.uk",        role: "ADMIN",               department: "DIRECTORS" },
  ] as const

  const users = await Promise.all(
    staffData.map((s) =>
      prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          passwordHash: defaultHash,
          role: s.role,
          department: s.department,
          mustChangePassword: true,
        },
      })
    )
  )

  console.log("Seeding complete!")
  console.log(`Created: ${users.length} users (JRD-aligned)`)
  console.log("All other data (customers, suppliers, catalogue, projects) should be imported from Sage 200.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
