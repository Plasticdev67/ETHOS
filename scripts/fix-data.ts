/**
 * Data cleanup script — fixes known data quality issues
 * Run: npx tsx scripts/fix-data.ts
 */
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import * as dotenv from "dotenv"

dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=== DATA CLEANUP ===\n")

  // ── 1. Fix designer roles ──
  const designerNames = [
    "andrew robinson",
    "david howells",
    "dave howells",
    "gregg hughes",
    "kelan taylor",
    "reece hobson",
    "samuel roberts",
    "shaun griffiths",
  ]

  console.log("1. Updating designer roles...")
  const allUsers = await prisma.user.findMany({ select: { id: true, name: true, role: true } })

  let designerUpdates = 0
  for (const user of allUsers) {
    const nameMatch = designerNames.includes((user.name || "").toLowerCase())
    if (nameMatch && user.role !== "DESIGNER") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "DESIGNER" },
      })
      console.log(`   ✓ ${user.name}: ${user.role} → DESIGNER`)
      designerUpdates++
    }
  }
  console.log(`   Updated ${designerUpdates} users to DESIGNER role\n`)

  const designers = await prisma.user.findMany({
    where: { role: "DESIGNER" },
    select: { name: true },
    orderBy: { name: "asc" },
  })
  console.log(`   Designers now: ${designers.map(d => d.name).join(", ")}\n`)

  // ── 2. Fix missing productJobNumber ──
  console.log("2. Fixing missing productJobNumber...")
  const productsNoJobNum = await prisma.product.findMany({
    where: { productJobNumber: null },
    include: { project: { select: { projectNumber: true } } },
  })

  for (const p of productsNoJobNum) {
    const jobNum = `${p.project.projectNumber}-${p.partCode}`
    await prisma.product.update({
      where: { id: p.id },
      data: { productJobNumber: jobNum },
    })
    console.log(`   ✓ ${p.partCode} → productJobNumber: "${jobNum}"`)
  }
  console.log(`   Fixed ${productsNoJobNum.length} products\n`)

  // ── 3. Populate estimated hours ──
  console.log("3. Populating estimated hours...")

  const products = await prisma.product.findMany({
    include: {
      project: { select: { projectStatus: true, projectNumber: true } },
      productionTasks: {
        select: { stage: true, estimatedMins: true },
      },
      designCard: { select: { estimatedHours: true } },
    },
  })

  let hourUpdates = 0
  for (const p of products) {
    let designHours = p.designEstimatedHours ? Number(p.designEstimatedHours) : 0
    let prodHours = p.productionEstimatedHours ? Number(p.productionEstimatedHours) : 0

    if (designHours > 0 && prodHours > 0) continue

    // Calculate production hours from existing tasks
    if (prodHours === 0 && p.productionTasks.length > 0) {
      const totalMins = p.productionTasks.reduce((sum, t) => sum + (t.estimatedMins || 0), 0)
      if (totalMins > 0) {
        prodHours = Math.round(totalMins / 60 * 10) / 10
      }
    }

    // Use design card hours
    if (designHours === 0 && p.designCard?.estimatedHours) {
      designHours = Number(p.designCard.estimatedHours)
    }

    // Default estimates based on department
    if (designHours === 0) {
      const dept = p.currentDepartment
      if (dept === "PRODUCTION" || dept === "INSTALLATION" || dept === "REVIEW" || dept === "COMPLETE") {
        designHours = 0
      } else {
        designHours = 32 // ~4 working days average
      }
    }

    if (prodHours === 0) {
      // Cutting 3h + Fabrication 24h + Fitting 16h + Shotblast 4h + Painting 16h + Packing 8h = 71h
      const dept = p.currentDepartment
      if (dept === "COMPLETE" || dept === "REVIEW") {
        prodHours = 0
      } else {
        prodHours = 71
      }
    }

    const data: Record<string, unknown> = {}
    if (!p.designEstimatedHours && designHours > 0) {
      data.designEstimatedHours = designHours
    }
    if (!p.productionEstimatedHours && prodHours > 0) {
      data.productionEstimatedHours = prodHours
    }

    if (Object.keys(data).length > 0) {
      await prisma.product.update({ where: { id: p.id }, data })
      console.log(`   ✓ ${p.project.projectNumber}/${p.partCode}: design=${designHours}h, prod=${prodHours}h`)
      hourUpdates++
    }
  }
  console.log(`   Updated ${hourUpdates} products with estimated hours\n`)

  // ── Summary ──
  console.log("=== SUMMARY ===")
  console.log(`  Designer roles fixed:    ${designerUpdates}`)
  console.log(`  Job numbers generated:   ${productsNoJobNum.length}`)
  console.log(`  Estimated hours added:   ${hourUpdates}`)
  console.log("\nDone!")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
