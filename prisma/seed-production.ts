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
  console.log("Seeding production data...")

  // Clean existing production data
  await prisma.productionTask.deleteMany()
  await prisma.worker.deleteMany()
  console.log("Cleared existing production data.")

  // ========================================
  // CREATE WORKERS
  // ========================================
  const workers = await Promise.all([
    prisma.worker.create({ data: { name: "Dave Thompson", role: "CUTTER", isAvailable: true } }),
    prisma.worker.create({ data: { name: "Mike Barnes", role: "CUTTER", isAvailable: true } }),
    prisma.worker.create({ data: { name: "Steve Wilson", role: "WELDER", isAvailable: true } }),
    prisma.worker.create({ data: { name: "Rob Clarke", role: "WELDER", isAvailable: true } }),
    prisma.worker.create({ data: { name: "Tony Mitchell", role: "FABRICATOR", isAvailable: true } }),
    prisma.worker.create({ data: { name: "Paul Harris", role: "FITTER", isAvailable: true } }),
    prisma.worker.create({ data: { name: "James Cooper", role: "PAINTER", isAvailable: true } }),
    prisma.worker.create({ data: { name: "Mark Evans", role: "PACKER", isAvailable: true } }),
    prisma.worker.create({ data: { name: "Gary Price", role: "SUPERVISOR", isAvailable: true } }),
  ])
  console.log(`Created ${workers.length} workers.`)

  // ========================================
  // LOOK UP PROJECTS IN MANUFACTURE STATUS
  // ========================================
  const projects = await prisma.project.findMany({
    where: { projectStatus: "MANUFACTURE" },
    include: { products: true },
  })

  if (projects.length === 0) {
    console.log("No projects in MANUFACTURE status. Looking for projects to update...")

    // Find some projects we can move to MANUFACTURE
    const designProjects = await prisma.project.findMany({
      where: { projectStatus: { in: ["DESIGN", "DESIGN_FREEZE"] } },
      include: { products: true },
      take: 6,
    })

    if (designProjects.length === 0) {
      console.log("No suitable projects found. Creating sample projects...")
      // If no projects exist at all, we'll need to work with what we have
      const allProjects = await prisma.project.findMany({
        include: { products: true },
        take: 6,
      })
      for (const p of allProjects) {
        await prisma.project.update({
          where: { id: p.id },
          data: { projectStatus: "MANUFACTURE", departmentStatus: "ONGOING" },
        })
      }
      projects.push(...allProjects)
    } else {
      for (const p of designProjects) {
        await prisma.project.update({
          where: { id: p.id },
          data: { projectStatus: "MANUFACTURE", departmentStatus: "ONGOING" },
        })
      }
      projects.push(...designProjects)
    }
  }

  console.log(`Found/updated ${projects.length} projects for production.`)

  // ========================================
  // SET ICU AND MEGA FLAGS
  // ========================================
  if (projects.length >= 2) {
    // Make first project ICU
    await prisma.project.update({
      where: { id: projects[0].id },
      data: { isICUFlag: true, priority: "CRITICAL" },
    })
    console.log(`Set project ${projects[0].projectNumber} as ICU.`)

    // Make second project MEGA
    await prisma.project.update({
      where: { id: projects[1].id },
      data: { classification: "MEGA" },
    })
    console.log(`Set project ${projects[1].projectNumber} as MEGA.`)
  }

  // ========================================
  // CREATE PRODUCTION TASKS
  // ========================================
  const stages = ["CUTTING", "FABRICATION", "FITTING", "SHOTBLASTING", "PAINTING", "PACKING"]
  let taskCount = 0
  const now = new Date()

  for (let pi = 0; pi < projects.length; pi++) {
    const project = projects[pi]
    const prods = project.products || []

    if (prods.length === 0) continue

    for (let prodIdx = 0; prodIdx < prods.length; prodIdx++) {
      const product = prods[prodIdx]

      // Determine how far through production this product is
      // Spread products across different stages
      const completedStages = (pi + prodIdx) % (stages.length + 1)

      for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
        const stage = stages[stageIdx]

        if (stageIdx < completedStages) {
          // Completed stage
          const startedAt = new Date(now.getTime() - (stages.length - stageIdx) * 3 * 24 * 60 * 60 * 1000)
          const completedAt = new Date(startedAt.getTime() + (60 + Math.floor(Math.random() * 120)) * 60 * 1000)

          await prisma.productionTask.create({
            data: {
              productId: product.id,
              projectId: project.id,
              stage,
              status: "COMPLETED",
              queuePosition: prodIdx,
              assignedTo: workers[stageIdx % workers.length].name,
              estimatedMins: 120 + Math.floor(Math.random() * 240),
              actualMins: Math.floor((completedAt.getTime() - startedAt.getTime()) / 60000),
              startedAt,
              completedAt,
              inspectionStatus: "ACCEPTED",
              inspectedBy: workers[8].name, // Supervisor
              inspectedAt: new Date(completedAt.getTime() + 30 * 60 * 1000),
            },
          })
          taskCount++
        } else if (stageIdx === completedStages) {
          // Current stage - mix of statuses
          const statusOptions = ["PENDING", "IN_PROGRESS", "PENDING"]
          const status = statusOptions[prodIdx % statusOptions.length]

          const taskData: any = {
            productId: product.id,
            projectId: project.id,
            stage,
            status,
            queuePosition: prodIdx,
            estimatedMins: 120 + Math.floor(Math.random() * 240),
          }

          if (status === "IN_PROGRESS") {
            taskData.assignedTo = workers[stageIdx % workers.length].name
            taskData.startedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
          }

          await prisma.productionTask.create({ data: taskData })
          taskCount++

          // Update product's productionStatus
          await prisma.product.update({
            where: { id: product.id },
            data: {
              productionStatus: stage,
              currentDepartment: "PRODUCTION",
            },
          })

          break // Don't create tasks for future stages
        }
      }
    }
  }
  console.log(`Created ${taskCount} production tasks.`)

  // ========================================
  // CREATE SAMPLE NCRs WITH NEW FIELDS
  // ========================================
  if (projects.length >= 1 && projects[0].products?.length) {
    const existingNcrs = await prisma.nonConformanceReport.findMany({
      orderBy: { ncrNumber: "desc" },
      take: 1,
    })
    const lastNum = existingNcrs.length > 0
      ? parseInt(existingNcrs[0].ncrNumber.replace("NCR-", ""), 10)
      : 0

    await prisma.nonConformanceReport.create({
      data: {
        ncrNumber: `NCR-${String(lastNum + 1).padStart(4, "0")}`,
        projectId: projects[0].id,
        productId: projects[0].products[0].id,
        title: "Weld defect on gate panel",
        description: "Sub-standard weld identified during inspection at fabrication stage",
        severity: "MAJOR",
        status: "OPEN",
        rootCause: "PRODUCTION_ERROR",
        originStage: "FABRICATION",
        returnToStage: "FABRICATION",
        costImpact: 450.0,
      },
    })
    console.log("Created sample NCR with production fields.")
  }

  console.log("Production seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect()
  })
