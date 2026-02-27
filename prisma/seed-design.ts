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
  console.log("Seeding design data...")

  // Clean existing design data (order matters for FK constraints)
  await prisma.designJobCard.deleteMany()
  await prisma.productDesignCard.deleteMany()
  await prisma.designHandover.deleteMany()
  console.log("Cleared existing design data.")

  // ========================================
  // LOOK UP EXISTING USERS (designers)
  // ========================================
  const allUsers = await prisma.user.findMany()
  const u = Object.fromEntries(allUsers.map((u: any) => [u.name, u]))

  // Designer mapping (7 designers the user requested)
  const designers = {
    shaun: u["Shaun Griffiths"],
    gregg: u["Gregg Hughes"],
    kelan: u["Kelan Taylor"],
    david: u["Dave Howells"],
    sam: u["Samuel Roberts"],
    andy: u["Andrew Robinson"],
    reece: u["Reece Hobson"],
  }

  // Check all designers exist
  for (const [name, user] of Object.entries(designers)) {
    if (!user) {
      console.error(`Designer "${name}" not found in database! Run main seed first.`)
      process.exit(1)
    }
  }
  console.log("Found all 7 designers.")

  // ========================================
  // LOOK UP EXISTING PROJECTS
  // ========================================
  const projects = await prisma.project.findMany({
    include: { products: true },
  })
  const pMap = Object.fromEntries(projects.map((p: any) => [p.projectNumber, p]))

  // ========================================
  // ADD PRODUCTS TO PROJECTS THAT NEED THEM
  // ========================================

  // Weir Mill (200598) - DESIGN status but no products in seed
  if (pMap["200598"] && pMap["200598"].products.length === 0) {
    console.log("Adding products to Weir Mill (200598)...")
    const weirMillProducts = [
      { partCode: "SFD-0001", description: "Single Flood Door", details: "Weir Mill - Ground Floor Door 1", jobNo: "200598-1-1", dept: "DESIGN" as const, designer: designers.andy.id },
      { partCode: "SFD-0001", description: "Single Flood Door", details: "Weir Mill - Ground Floor Door 2", jobNo: "200598-1-2", dept: "DESIGN" as const, designer: designers.andy.id },
      { partCode: "DFD-0001", description: "Double Flood Door", details: "Weir Mill - Loading Bay Double Door", jobNo: "200598-2-1", dept: "DESIGN" as const, designer: designers.reece.id },
      { partCode: "TRANS-0001", description: "Transom above doorset", details: "Weir Mill - Transom for Door 1", jobNo: "200598-1-3", dept: "DESIGN" as const, designer: designers.reece.id },
      { partCode: "SFD-0001", description: "Single Flood Door", details: "Weir Mill - Basement Door", jobNo: "200598-3-1", dept: "PLANNING" as const, designer: designers.andy.id },
    ]
    for (const p of weirMillProducts) {
      await prisma.product.create({
        data: {
          projectId: pMap["200598"].id,
          partCode: p.partCode,
          description: p.description,
          additionalDetails: p.details,
          productJobNumber: p.jobNo,
          quantity: 1,
          currentDepartment: p.dept,
          allocatedDesignerId: p.designer,
          coordinatorId: u["Richard Guest"]?.id,
          requiredCompletionDate: new Date("2026-08-31"),
        },
      })
    }
  }

  // Barmouth (200615) - DESIGN status but no products
  if (pMap["200615"] && pMap["200615"].products.length === 0) {
    console.log("Adding products to Barmouth Viaduct (200615)...")
    const barmouthProducts = [
      { partCode: "SFGEXC3-0001", description: "Single Flood Gate - EXC3", details: "Barmouth Seafront - SFG 1", jobNo: "200615-1-1", dept: "DESIGN" as const, designer: designers.reece.id },
      { partCode: "SFGEXC3-0001", description: "Single Flood Gate - EXC3", details: "Barmouth Seafront - SFG 2", jobNo: "200615-1-2", dept: "DESIGN" as const, designer: designers.reece.id },
      { partCode: "DFGEXC3-0001", description: "Double Flood Gate - EXC3", details: "Barmouth Harbour - DFG", jobNo: "200615-2-1", dept: "DESIGN" as const, designer: designers.andy.id },
      { partCode: "FLOODWALL", description: "Steel Flood Wall", details: "Barmouth Promenade - Wall Section A", jobNo: "200615-3-1", dept: "PLANNING" as const, designer: designers.reece.id },
      { partCode: "PFG-0001", description: "Pedestrian Flood Gate", details: "Barmouth Pedestrian Access", jobNo: "200615-4-1", dept: "DESIGN" as const, designer: designers.andy.id },
    ]
    for (const p of barmouthProducts) {
      await prisma.product.create({
        data: {
          projectId: pMap["200615"].id,
          partCode: p.partCode,
          description: p.description,
          additionalDetails: p.details,
          productJobNumber: p.jobNo,
          quantity: 1,
          currentDepartment: p.dept,
          allocatedDesignerId: p.designer,
          coordinatorId: u["Stephen McDermid"]?.id,
          requiredCompletionDate: new Date("2026-07-31"),
        },
      })
    }
  }

  // Re-fetch projects with products after adding new ones
  const refreshedProjects = await prisma.project.findMany({
    include: { products: true },
  })
  const pm = Object.fromEntries(refreshedProjects.map((p: any) => [p.projectNumber, p]))

  // ========================================
  // CREATE DESIGN CARDS & JOB CARDS
  // ========================================
  // We'll activate design for several projects and set various stages

  type DesignSpec = {
    projectNumber: string
    products: {
      jobNo: string // match by productJobNumber
      designerId: string
      cardStatus: string // DesignCardStatus
      jobs: {
        type: string // DesignJobType
        status: string // DesignJobStatus
        startedAt?: Date
        submittedAt?: Date
        approvedAt?: Date
        signedOffAt?: Date
        rejectedAt?: Date
        rejectionReason?: string
      }[]
      estimatedHours?: number
      actualHours?: number
      targetStart?: Date
      targetEnd?: Date
    }[]
  }

  const designSpecs: DesignSpec[] = [
    // =============================================
    // Project 200670 - Paignton (Shaun's project)
    // 3 products in various design stages
    // =============================================
    {
      projectNumber: "200670",
      products: [
        {
          jobNo: "200670-1-1", // Preston SFG 1
          designerId: designers.shaun.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 24,
          actualHours: 18,
          targetStart: new Date("2026-01-15"),
          targetEnd: new Date("2026-04-01"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-15"), submittedAt: new Date("2026-01-22"), approvedAt: new Date("2026-01-23"), signedOffAt: new Date("2026-01-24") },
            { type: "PRODUCTION_DRAWINGS", status: "SIGNED_OFF", startedAt: new Date("2026-01-25"), submittedAt: new Date("2026-02-01"), approvedAt: new Date("2026-02-02"), signedOffAt: new Date("2026-02-03") },
            { type: "BOM_FINALISATION", status: "IN_PROGRESS", startedAt: new Date("2026-02-04") },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200670-1-2", // Preston SFG 2
          designerId: designers.shaun.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 20,
          actualHours: 8,
          targetStart: new Date("2026-02-01"),
          targetEnd: new Date("2026-04-15"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-02-01"), submittedAt: new Date("2026-02-07"), approvedAt: new Date("2026-02-08"), signedOffAt: new Date("2026-02-09") },
            { type: "PRODUCTION_DRAWINGS", status: "IN_PROGRESS", startedAt: new Date("2026-02-10") },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200670-2-1", // Paignton DFG
          designerId: designers.shaun.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 32,
          actualHours: 4,
          targetStart: new Date("2026-02-15"),
          targetEnd: new Date("2026-05-01"),
          jobs: [
            { type: "GA_DRAWING", status: "IN_PROGRESS", startedAt: new Date("2026-02-12") },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200670-3-1", // HDFG
          designerId: designers.shaun.id,
          cardStatus: "QUEUED",
          estimatedHours: 40,
          targetStart: new Date("2026-04-01"),
          targetEnd: new Date("2026-06-01"),
          jobs: [
            { type: "GA_DRAWING", status: "READY" },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200670-4-1", // Flood Wall
          designerId: designers.shaun.id,
          cardStatus: "QUEUED",
          estimatedHours: 48,
          targetStart: new Date("2026-05-01"),
          targetEnd: new Date("2026-07-01"),
          jobs: [
            { type: "GA_DRAWING", status: "READY" },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200670-5-1", // Demountable
          designerId: designers.shaun.id,
          cardStatus: "QUEUED",
          estimatedHours: 16,
          targetStart: new Date("2026-06-01"),
          targetEnd: new Date("2026-08-01"),
          jobs: [
            { type: "GA_DRAWING", status: "READY" },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
      ],
    },

    // =============================================
    // Project 200710 - Essex (Gregg's products in DESIGN)
    // =============================================
    {
      projectNumber: "200710",
      products: [
        {
          jobNo: "200710-6-1", // Springfield HDFG
          designerId: designers.gregg.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 36,
          actualHours: 20,
          targetStart: new Date("2026-01-10"),
          targetEnd: new Date("2026-05-01"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-10"), submittedAt: new Date("2026-01-18"), approvedAt: new Date("2026-01-19"), signedOffAt: new Date("2026-01-20") },
            { type: "PRODUCTION_DRAWINGS", status: "SUBMITTED", startedAt: new Date("2026-01-21"), submittedAt: new Date("2026-02-10") },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200710-7-1", // Heybridge SFG
          designerId: designers.gregg.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 24,
          actualHours: 12,
          targetStart: new Date("2026-01-20"),
          targetEnd: new Date("2026-05-15"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-20"), submittedAt: new Date("2026-01-28"), approvedAt: new Date("2026-01-29"), signedOffAt: new Date("2026-01-30") },
            { type: "PRODUCTION_DRAWINGS", status: "IN_PROGRESS", startedAt: new Date("2026-02-01") },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200710-6-2", // Springfield PFG
          designerId: designers.gregg.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 16,
          actualHours: 6,
          targetStart: new Date("2026-02-01"),
          targetEnd: new Date("2026-05-20"),
          jobs: [
            { type: "GA_DRAWING", status: "IN_PROGRESS", startedAt: new Date("2026-02-05") },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200710-8-1", // Chelmsford Flood Wall
          designerId: designers.gregg.id,
          cardStatus: "QUEUED",
          estimatedHours: 40,
          targetStart: new Date("2026-03-01"),
          targetEnd: new Date("2026-06-01"),
          jobs: [
            { type: "GA_DRAWING", status: "READY" },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
      ],
    },

    // =============================================
    // Project 101485 - NEGED (Kelan's products in DESIGN)
    // =============================================
    {
      projectNumber: "101485",
      products: [
        {
          jobNo: "101485-5-1", // Consett
          designerId: designers.kelan.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 20,
          actualHours: 15,
          targetStart: new Date("2026-01-05"),
          targetEnd: new Date("2026-03-15"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-05"), submittedAt: new Date("2026-01-12"), approvedAt: new Date("2026-01-13"), signedOffAt: new Date("2026-01-14") },
            { type: "PRODUCTION_DRAWINGS", status: "SIGNED_OFF", startedAt: new Date("2026-01-15"), submittedAt: new Date("2026-01-25"), approvedAt: new Date("2026-01-26"), signedOffAt: new Date("2026-01-27") },
            { type: "BOM_FINALISATION", status: "SIGNED_OFF", startedAt: new Date("2026-01-28"), submittedAt: new Date("2026-02-02"), approvedAt: new Date("2026-02-03"), signedOffAt: new Date("2026-02-04") },
            { type: "DESIGN_REVIEW", status: "SUBMITTED", startedAt: new Date("2026-02-05"), submittedAt: new Date("2026-02-12") },
          ],
        },
        {
          jobNo: "101485-6-1", // Bishop Auckland
          designerId: designers.kelan.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 20,
          actualHours: 10,
          targetStart: new Date("2026-01-15"),
          targetEnd: new Date("2026-03-20"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-15"), submittedAt: new Date("2026-01-22"), approvedAt: new Date("2026-01-23"), signedOffAt: new Date("2026-01-24") },
            { type: "PRODUCTION_DRAWINGS", status: "REJECTED", startedAt: new Date("2026-01-25"), submittedAt: new Date("2026-02-04"), rejectedAt: new Date("2026-02-06"), rejectionReason: "Hinge detail doesn't match site survey dimensions - please revise clearance for 100mm offset" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "101485-7-1", // Hexham
          designerId: designers.kelan.id,
          cardStatus: "QUEUED",
          estimatedHours: 18,
          targetStart: new Date("2026-03-01"),
          targetEnd: new Date("2026-04-01"),
          jobs: [
            { type: "GA_DRAWING", status: "READY" },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
      ],
    },

    // =============================================
    // Project 200672 - Bustleholme (Sam's product in DESIGN)
    // =============================================
    {
      projectNumber: "200672",
      products: [
        {
          jobNo: "200672-5-1", // Access Gate North
          designerId: designers.sam.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 20,
          actualHours: 14,
          targetStart: new Date("2026-02-01"),
          targetEnd: new Date("2026-04-01"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-02-01"), submittedAt: new Date("2026-02-06"), approvedAt: new Date("2026-02-07"), signedOffAt: new Date("2026-02-08") },
            { type: "PRODUCTION_DRAWINGS", status: "SIGNED_OFF", startedAt: new Date("2026-02-09"), submittedAt: new Date("2026-02-14"), approvedAt: new Date("2026-02-15"), signedOffAt: new Date("2026-02-16") },
            { type: "BOM_FINALISATION", status: "IN_PROGRESS", startedAt: new Date("2026-02-16") },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
      ],
    },

    // =============================================
    // Project 101328 - Rudninkai Blast (David's products in DESIGN)
    // =============================================
    {
      projectNumber: "101328",
      products: [
        {
          jobNo: "101328-4-1", // Building D - DBD
          designerId: designers.david.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 30,
          actualHours: 22,
          targetStart: new Date("2026-01-08"),
          targetEnd: new Date("2026-04-15"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-08"), submittedAt: new Date("2026-01-16"), approvedAt: new Date("2026-01-17"), signedOffAt: new Date("2026-01-18") },
            { type: "PRODUCTION_DRAWINGS", status: "SIGNED_OFF", startedAt: new Date("2026-01-19"), submittedAt: new Date("2026-01-30"), approvedAt: new Date("2026-01-31"), signedOffAt: new Date("2026-02-01") },
            { type: "BOM_FINALISATION", status: "SUBMITTED", startedAt: new Date("2026-02-02"), submittedAt: new Date("2026-02-10") },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "101328-5-1", // Building E - SBD HRL
          designerId: designers.david.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 28,
          actualHours: 6,
          targetStart: new Date("2026-01-20"),
          targetEnd: new Date("2026-05-01"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-20"), submittedAt: new Date("2026-01-28"), approvedAt: new Date("2026-01-29"), signedOffAt: new Date("2026-01-30") },
            { type: "PRODUCTION_DRAWINGS", status: "IN_PROGRESS", startedAt: new Date("2026-02-01") },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
      ],
    },

    // =============================================
    // Project 200598 - Weir Mill (Andy & Reece)
    // =============================================
    {
      projectNumber: "200598",
      products: [
        {
          jobNo: "200598-1-1", // Ground Floor Door 1 (Andy)
          designerId: designers.andy.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 16,
          actualHours: 12,
          targetStart: new Date("2026-02-01"),
          targetEnd: new Date("2026-04-15"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-02-01"), submittedAt: new Date("2026-02-05"), approvedAt: new Date("2026-02-06"), signedOffAt: new Date("2026-02-07") },
            { type: "PRODUCTION_DRAWINGS", status: "SIGNED_OFF", startedAt: new Date("2026-02-08"), submittedAt: new Date("2026-02-12"), approvedAt: new Date("2026-02-13"), signedOffAt: new Date("2026-02-14") },
            { type: "BOM_FINALISATION", status: "APPROVED", startedAt: new Date("2026-02-14"), submittedAt: new Date("2026-02-15"), approvedAt: new Date("2026-02-16") },
            { type: "DESIGN_REVIEW", status: "READY" },
          ],
        },
        {
          jobNo: "200598-1-2", // Ground Floor Door 2 (Andy)
          designerId: designers.andy.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 16,
          actualHours: 8,
          targetStart: new Date("2026-02-05"),
          targetEnd: new Date("2026-05-01"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-02-05"), submittedAt: new Date("2026-02-09"), approvedAt: new Date("2026-02-10"), signedOffAt: new Date("2026-02-11") },
            { type: "PRODUCTION_DRAWINGS", status: "IN_PROGRESS", startedAt: new Date("2026-02-12") },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200598-2-1", // Loading Bay Door (Reece)
          designerId: designers.reece.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 24,
          actualHours: 10,
          targetStart: new Date("2026-02-01"),
          targetEnd: new Date("2026-05-15"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-02-01"), submittedAt: new Date("2026-02-07"), approvedAt: new Date("2026-02-08"), signedOffAt: new Date("2026-02-09") },
            { type: "PRODUCTION_DRAWINGS", status: "IN_PROGRESS", startedAt: new Date("2026-02-10") },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200598-1-3", // Transom (Reece)
          designerId: designers.reece.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 8,
          actualHours: 3,
          targetStart: new Date("2026-02-10"),
          targetEnd: new Date("2026-04-30"),
          jobs: [
            { type: "GA_DRAWING", status: "IN_PROGRESS", startedAt: new Date("2026-02-12") },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200598-3-1", // Basement Door (Andy)
          designerId: designers.andy.id,
          cardStatus: "QUEUED",
          estimatedHours: 16,
          targetStart: new Date("2026-04-01"),
          targetEnd: new Date("2026-06-30"),
          jobs: [
            { type: "GA_DRAWING", status: "READY" },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
      ],
    },

    // =============================================
    // Project 200615 - Barmouth (Reece & Andy)
    // =============================================
    {
      projectNumber: "200615",
      products: [
        {
          jobNo: "200615-1-1", // Seafront SFG 1 (Reece)
          designerId: designers.reece.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 24,
          actualHours: 18,
          targetStart: new Date("2026-01-10"),
          targetEnd: new Date("2026-04-01"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-10"), submittedAt: new Date("2026-01-17"), approvedAt: new Date("2026-01-18"), signedOffAt: new Date("2026-01-19") },
            { type: "PRODUCTION_DRAWINGS", status: "SIGNED_OFF", startedAt: new Date("2026-01-20"), submittedAt: new Date("2026-01-30"), approvedAt: new Date("2026-01-31"), signedOffAt: new Date("2026-02-01") },
            { type: "BOM_FINALISATION", status: "SUBMITTED", startedAt: new Date("2026-02-02"), submittedAt: new Date("2026-02-08") },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200615-1-2", // Seafront SFG 2 (Reece)
          designerId: designers.reece.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 24,
          actualHours: 6,
          targetStart: new Date("2026-01-20"),
          targetEnd: new Date("2026-04-15"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2026-01-20"), submittedAt: new Date("2026-01-27"), approvedAt: new Date("2026-01-28"), signedOffAt: new Date("2026-01-29") },
            { type: "PRODUCTION_DRAWINGS", status: "IN_PROGRESS", startedAt: new Date("2026-02-01") },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200615-2-1", // Harbour DFG (Andy)
          designerId: designers.andy.id,
          cardStatus: "IN_PROGRESS",
          estimatedHours: 32,
          actualHours: 4,
          targetStart: new Date("2026-02-01"),
          targetEnd: new Date("2026-05-01"),
          jobs: [
            { type: "GA_DRAWING", status: "IN_PROGRESS", startedAt: new Date("2026-02-10") },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200615-3-1", // Flood Wall (Reece)
          designerId: designers.reece.id,
          cardStatus: "QUEUED",
          estimatedHours: 48,
          targetStart: new Date("2026-04-01"),
          targetEnd: new Date("2026-06-15"),
          jobs: [
            { type: "GA_DRAWING", status: "READY" },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
        {
          jobNo: "200615-4-1", // Pedestrian Gate (Andy)
          designerId: designers.andy.id,
          cardStatus: "QUEUED",
          estimatedHours: 16,
          targetStart: new Date("2026-04-15"),
          targetEnd: new Date("2026-06-01"),
          jobs: [
            { type: "GA_DRAWING", status: "READY" },
            { type: "PRODUCTION_DRAWINGS", status: "BLOCKED" },
            { type: "BOM_FINALISATION", status: "BLOCKED" },
            { type: "DESIGN_REVIEW", status: "BLOCKED" },
          ],
        },
      ],
    },

    // =============================================
    // A completed project for Sam (200672 already done products)
    // Let's add completed design cards for products already in PRODUCTION
    // =============================================
    {
      projectNumber: "200672",
      products: [
        {
          jobNo: "200672-1-1", // Transformer Bay 1 - DBG (already in PRODUCTION)
          designerId: designers.sam.id,
          cardStatus: "COMPLETE",
          estimatedHours: 24,
          actualHours: 22,
          targetStart: new Date("2025-10-01"),
          targetEnd: new Date("2025-12-15"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2025-10-01"), submittedAt: new Date("2025-10-08"), approvedAt: new Date("2025-10-09"), signedOffAt: new Date("2025-10-10") },
            { type: "PRODUCTION_DRAWINGS", status: "SIGNED_OFF", startedAt: new Date("2025-10-11"), submittedAt: new Date("2025-10-22"), approvedAt: new Date("2025-10-23"), signedOffAt: new Date("2025-10-24") },
            { type: "BOM_FINALISATION", status: "SIGNED_OFF", startedAt: new Date("2025-10-25"), submittedAt: new Date("2025-10-30"), approvedAt: new Date("2025-10-31"), signedOffAt: new Date("2025-11-01") },
            { type: "DESIGN_REVIEW", status: "SIGNED_OFF", startedAt: new Date("2025-11-02"), submittedAt: new Date("2025-11-08"), approvedAt: new Date("2025-11-09"), signedOffAt: new Date("2025-11-10") },
          ],
        },
        {
          jobNo: "200672-2-1", // Transformer Bay 2 - SBG (already in PRODUCTION)
          designerId: designers.sam.id,
          cardStatus: "COMPLETE",
          estimatedHours: 18,
          actualHours: 16,
          targetStart: new Date("2025-10-15"),
          targetEnd: new Date("2025-12-20"),
          jobs: [
            { type: "GA_DRAWING", status: "SIGNED_OFF", startedAt: new Date("2025-10-15"), submittedAt: new Date("2025-10-20"), approvedAt: new Date("2025-10-21"), signedOffAt: new Date("2025-10-22") },
            { type: "PRODUCTION_DRAWINGS", status: "SIGNED_OFF", startedAt: new Date("2025-10-23"), submittedAt: new Date("2025-11-01"), approvedAt: new Date("2025-11-02"), signedOffAt: new Date("2025-11-03") },
            { type: "BOM_FINALISATION", status: "SIGNED_OFF", startedAt: new Date("2025-11-04"), submittedAt: new Date("2025-11-08"), approvedAt: new Date("2025-11-09"), signedOffAt: new Date("2025-11-10") },
            { type: "DESIGN_REVIEW", status: "SIGNED_OFF", startedAt: new Date("2025-11-11"), submittedAt: new Date("2025-11-15"), approvedAt: new Date("2025-11-16"), signedOffAt: new Date("2025-11-17") },
          ],
        },
      ],
    },
  ]

  // ========================================
  // CREATE ALL DESIGN CARDS & JOB CARDS
  // ========================================
  let totalCards = 0
  let totalJobs = 0

  for (const spec of designSpecs) {
    const project = pm[spec.projectNumber]
    if (!project) {
      console.warn(`Project ${spec.projectNumber} not found, skipping.`)
      continue
    }

    for (const prodSpec of spec.products) {
      // Find the product by job number
      const product = project.products.find((p: any) => p.productJobNumber === prodSpec.jobNo)
      if (!product) {
        console.warn(`Product ${prodSpec.jobNo} not found in project ${spec.projectNumber}, skipping.`)
        continue
      }

      // Check if design card already exists
      const existing = await prisma.productDesignCard.findUnique({
        where: { productId: product.id },
      })
      if (existing) {
        console.log(`Design card already exists for ${prodSpec.jobNo}, skipping.`)
        continue
      }

      // Create design card
      const designCard = await prisma.productDesignCard.create({
        data: {
          productId: product.id,
          projectId: project.id,
          assignedDesignerId: prodSpec.designerId,
          status: prodSpec.cardStatus,
          estimatedHours: prodSpec.estimatedHours || null,
          actualHours: prodSpec.actualHours || null,
          targetStartDate: prodSpec.targetStart || null,
          targetEndDate: prodSpec.targetEnd || null,
          actualStartDate: prodSpec.jobs[0]?.startedAt || null,
          actualEndDate: prodSpec.cardStatus === "COMPLETE"
            ? prodSpec.jobs[3]?.signedOffAt || null
            : null,
        },
      })
      totalCards++

      // Create job cards
      for (let i = 0; i < prodSpec.jobs.length; i++) {
        const jobSpec = prodSpec.jobs[i]
        await prisma.designJobCard.create({
          data: {
            designCardId: designCard.id,
            jobType: jobSpec.type,
            status: jobSpec.status,
            sortOrder: i,
            assignedToId: prodSpec.designerId,
            startedAt: jobSpec.startedAt || null,
            submittedAt: jobSpec.submittedAt || null,
            approvedAt: jobSpec.approvedAt || null,
            signedOffAt: jobSpec.signedOffAt || null,
            rejectedAt: jobSpec.rejectedAt || null,
            rejectionReason: jobSpec.rejectionReason || null,
          },
        })
        totalJobs++
      }
    }
  }

  // ========================================
  // SUMMARY
  // ========================================
  const cardCount = await prisma.productDesignCard.count()
  const jobCount = await prisma.designJobCard.count()

  console.log("\n=== Design Seed Complete ===")
  console.log(`Created ${totalCards} design cards (total in DB: ${cardCount})`)
  console.log(`Created ${totalJobs} job cards (total in DB: ${jobCount})`)

  // Print per-designer breakdown
  const designerWorkload = await prisma.productDesignCard.groupBy({
    by: ["assignedDesignerId"],
    _count: true,
    where: { status: { not: "COMPLETE" } },
  })

  console.log("\nDesigner Workload (non-complete cards):")
  for (const dw of designerWorkload) {
    const designer = allUsers.find((u: any) => u.id === dw.assignedDesignerId)
    console.log(`  ${designer?.name || "Unknown"}: ${dw._count} cards`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
