import { config } from "dotenv"
config()

import pg from "pg"

// ── Helpers ──

function cuid(): string {
  // Simple cuid-like ID generator
  const ts = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 10)
  const r2 = Math.random().toString(36).slice(2, 6)
  return `c${ts}${r}${r2}`
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)]
}

function randomDate(daysAgoStart: number, daysAgoEnd: number): Date {
  const now = Date.now()
  const start = now - daysAgoStart * 86400000
  const end = now - daysAgoEnd * 86400000
  return new Date(start + Math.random() * (end - start))
}

function futureDate(daysFromNow: number): Date {
  return new Date(Date.now() + daysFromNow * 86400000)
}

function toISO(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

// ── Data pools ──

const PROJECT_NAMES = [
  "Thames Barrier Maintenance", "Bristol Flood Defence", "Cardiff Bay Barrage Upgrade",
  "Liverpool Waterfront Protection", "Glasgow River Clyde Scheme", "Edinburgh Coastal Wall",
  "Manchester Ship Canal Gates", "Birmingham Flood Alleviation", "Leeds Flood Defence Phase 2",
  "Sheffield Rivelin Valley", "Newcastle Quayside Barriers", "Southampton Dock Gates",
  "Plymouth Naval Base Upgrade", "Brighton Marina Flood Wall", "Norwich Broads Protection",
  "Cambridge Flood Scheme", "Oxford Thames Barrier", "Exeter Canal Defences",
  "Chester River Dee Gates", "York Ouse Flood Barrier", "Carlisle Eden Protection",
  "Portsmouth Harbour Wall", "Ipswich Docks Renewal", "Swansea Bay Tidal Lagoon",
  "Aberdeen Harbour Gates", "Dundee Tay Barrier", "Belfast Lough Protection",
  "Hull Humber Defences", "Grimsby Dock Gates Replacement", "Falmouth Harbour Upgrade",
  "Whitby Harbour Walls", "Dover Port Gates", "Folkestone Storm Barrier",
  "Weymouth Flood Defence", "Torquay Harbour Wall", "Tenby Coastal Protection",
  "Aberystwyth Seafront Scheme", "Llandudno Coastal Wall", "Blackpool Sea Defence",
  "Scarborough Coastal Barrier", "Bridlington Harbour Gates", "Lowestoft Tidal Barrier",
  "Great Yarmouth Flood Wall", "Whitstable Harbour Upgrade", "Ramsgate Port Defence",
  "Poole Harbour Barrier", "Weir Replacement Teddington", "Medway Barrier Upgrade",
  "Severn Estuary Phase 3", "Tyne Barrier Replacement"
]

const PRODUCT_TYPES = [
  "Single Flood Gate", "Double Flood Gate", "Hydraulic Flood Gate",
  "Demountable Barrier", "Steel Flood Wall", "Penstock Valve",
  "Sluice Gate", "Radial Gate", "Tilting Weir",
  "Flood Door", "Stop Log Set", "Flap Valve",
  "Self-Closing Barrier", "Bund Wall Panel", "Access Platform",
  "Handrail System", "Lifting Beam", "Trash Screen",
  "Fish Pass Gate", "Overflow Weir",
]

const PRODUCT_VARIANTS = ["EXC3", "EXC4", "Marine Grade", "Standard", "Heavy Duty", "Compact"]

const CUSTOMER_NAMES = [
  "Environment Agency", "Natural Resources Wales", "SEPA",
  "Skanska", "BAM Nuttall", "Balfour Beatty",
  "UKPN(EPN)", "National Grid", "Welsh Water",
  "Network Rail", "Highways England", "MoD",
  "Port of London Authority", "Associated British Ports", "Peel Ports",
]

const PRODUCTION_STAGES = ["CUTTING", "FABRICATION", "FITTING", "SHOTBLASTING", "PAINTING", "PACKING"] as const
const DESIGN_JOB_TYPES = ["GA_DRAWING", "PRODUCTION_DRAWINGS", "BOM_FINALISATION", "DESIGN_REVIEW"] as const

type ProgressLevel =
  | "opportunity" | "quoted" | "early_design" | "mid_design" | "late_design"
  | "design_complete" | "handed_over" | "mid_production" | "late_production" | "complete"

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()

  console.log("Stress Test: Creating 50 random projects...")

  try {
    // Fetch existing users
    const usersRes = await client.query('SELECT id, name, role FROM users')
    const allUsers = usersRes.rows
    const designers = allUsers.filter(u =>
      ["DESIGN_ENGINEER", "ENGINEERING_MANAGER", "R_AND_D_MANAGER", "ADMIN"].includes(u.role)
    )
    const managers = allUsers.filter(u =>
      ["PROJECT_MANAGER", "TECHNICAL_DIRECTOR", "MANAGING_DIRECTOR", "ADMIN"].includes(u.role)
    )

    if (designers.length === 0 || managers.length === 0) {
      console.error("No users found — run the main seed first")
      process.exit(1)
    }
    console.log(`  Found ${designers.length} designers, ${managers.length} managers`)

    // Fetch existing customers
    const custRes = await client.query('SELECT id, name FROM customers')
    let customers = custRes.rows

    if (customers.length < 5) {
      console.log("  Creating customers...")
      for (const name of CUSTOMER_NAMES) {
        const exists = customers.find(c => c.name === name)
        if (!exists) {
          const id = cuid()
          const custType = pick(["MAIN_CONTRACTOR", "UTILITY", "COUNCIL", "DIRECT", "DEFENCE", "OTHER"])
          const now = new Date().toISOString()
          await client.query(
            `INSERT INTO customers (id, name, "customerType", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5)`,
            [id, name, custType, now, now]
          )
          customers.push({ id, name })
        }
      }
    }

    // Get next project number
    const lastProjRes = await client.query('SELECT "projectNumber" FROM projects ORDER BY "projectNumber" DESC LIMIT 1')
    let nextNum = 300001
    if (lastProjRes.rows.length > 0) {
      const n = parseInt(lastProjRes.rows[0].projectNumber, 10)
      if (!isNaN(n)) nextNum = n + 1
    }

    // Get max queue position
    const maxPosRes = await client.query('SELECT MAX("queuePosition") as max FROM production_tasks')
    let queuePos = (maxPosRes.rows[0]?.max ?? -1) + 1

    const progressDistribution: ProgressLevel[] = [
      ...Array(3).fill("opportunity"),
      ...Array(3).fill("quoted"),
      ...Array(4).fill("early_design"),
      ...Array(5).fill("mid_design"),
      ...Array(4).fill("late_design"),
      ...Array(3).fill("design_complete"),
      ...Array(3).fill("handed_over"),
      ...Array(6).fill("mid_production"),
      ...Array(5).fill("late_production"),
      ...Array(14).fill("complete"),
    ]
    progressDistribution.sort(() => Math.random() - 0.5)

    let created = 0
    for (let i = 0; i < 50; i++) {
      const projNum = String(nextNum + i)
      const projName = PROJECT_NAMES[i] || `Test Project ${projNum}`
      const customer = pick(customers)
      const manager = pick(managers)
      const progress = progressDistribution[i]
      const productCount = rand(3, 20)

      console.log(`  [${i + 1}/50] ${projNum} - ${projName} (${productCount} products, ${progress})`)

      // Determine project-level fields based on progress
      let projectStatus: string
      let salesStage: string
      let lifecycleStage: string
      let departmentStatus: string
      const dates: Record<string, Date | null> = {
        enquiryReceived: randomDate(365, 30),
        quoteSubmitted: null, orderReceived: null,
        targetCompletion: futureDate(rand(30, 365)),
        actualCompletion: null,
        p0Date: randomDate(365, 30),
        p1Date: null, p2Date: null, p3Date: null, p4Date: null, p5Date: null,
      }

      switch (progress) {
        case "opportunity":
          projectStatus = "OPPORTUNITY"; salesStage = "OPPORTUNITY"; lifecycleStage = "P0"; departmentStatus = "TODO"
          break
        case "quoted":
          projectStatus = "QUOTATION"; salesStage = "QUOTED"; lifecycleStage = "P1"; departmentStatus = "TODO"
          dates.quoteSubmitted = randomDate(60, 10)
          dates.p1Date = dates.quoteSubmitted
          break
        case "early_design": case "mid_design": case "late_design": case "design_complete":
          projectStatus = "DESIGN"; salesStage = "ORDER"; lifecycleStage = "P2"; departmentStatus = "ONGOING"
          dates.quoteSubmitted = randomDate(120, 60)
          dates.orderReceived = randomDate(60, 20)
          dates.p1Date = dates.quoteSubmitted
          dates.p2Date = dates.orderReceived
          break
        case "handed_over": case "mid_production": case "late_production":
          projectStatus = "MANUFACTURE"; salesStage = "ORDER"; lifecycleStage = "P3"; departmentStatus = "ONGOING"
          dates.quoteSubmitted = randomDate(200, 120)
          dates.orderReceived = randomDate(120, 60)
          dates.p1Date = dates.quoteSubmitted
          dates.p2Date = dates.orderReceived
          dates.p3Date = randomDate(60, 20)
          break
        case "complete":
          projectStatus = "COMPLETE"; salesStage = "ORDER"; lifecycleStage = "P5"; departmentStatus = "DONE"
          dates.quoteSubmitted = randomDate(400, 200)
          dates.orderReceived = randomDate(200, 120)
          dates.p1Date = dates.quoteSubmitted
          dates.p2Date = dates.orderReceived
          dates.p3Date = randomDate(120, 80)
          dates.p4Date = randomDate(80, 40)
          dates.p5Date = randomDate(40, 5)
          dates.actualCompletion = dates.p5Date
          break
        default:
          projectStatus = "DESIGN"; salesStage = "ORDER"; lifecycleStage = "P2"; departmentStatus = "ONGOING"
      }

      // Create project
      const projId = cuid()
      const now = new Date().toISOString()
      await client.query(
        `INSERT INTO projects (
          id, "projectNumber", name, "customerId", "projectManagerId",
          "projectType", "workStream", "salesStage", "projectStatus", "contractType",
          "lifecycleStage", "departmentStatus", priority, classification, "ragStatus",
          "isICUFlag", "estimatedValue", "contractValue",
          "enquiryReceived", "quoteSubmitted", "orderReceived", "targetCompletion", "actualCompletion",
          "p0Date", "p1Date", "p2Date", "p3Date", "p4Date", "p5Date",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21, $22, $23,
          $24, $25, $26, $27, $28, $29,
          $30, $31
        )`,
        [
          projId, projNum, projName, customer.id, manager.id,
          pick(["STANDARD", "BESPOKE_MAJOR"]),
          pick(["COMMUNITY", "UTILITIES", "BESPOKE", "ADHOC"]),
          salesStage, projectStatus,
          pick(["NEC", "STANDARD", "FRAMEWORK_CALLOFF"]),
          lifecycleStage, departmentStatus,
          pick(["NORMAL", "NORMAL", "NORMAL", "HIGH", "CRITICAL"]),
          pick(["NORMAL", "NORMAL", "MEGA", "SUB_CONTRACT"]),
          pick(["GREEN", "GREEN", "GREEN", "AMBER", "RED", null]),
          Math.random() < 0.1,
          rand(5000, 500000), rand(5000, 500000),
          toISO(dates.enquiryReceived), toISO(dates.quoteSubmitted),
          toISO(dates.orderReceived), toISO(dates.targetCompletion), toISO(dates.actualCompletion),
          toISO(dates.p0Date), toISO(dates.p1Date), toISO(dates.p2Date),
          toISO(dates.p3Date), toISO(dates.p4Date), toISO(dates.p5Date),
          now, now,
        ]
      )

      // Create products
      const products: { id: string }[] = []
      for (let p = 0; p < productCount; p++) {
        const prodType = pick(PRODUCT_TYPES)
        const variant = pick(PRODUCT_VARIANTS)
        const jobNum = `${projNum}-${String(p + 1).padStart(2, "0")}`

        let currentDepartment: string
        let productionStatus: string | null = null

        switch (progress) {
          case "opportunity": case "quoted":
            currentDepartment = "PLANNING"; break
          case "early_design": case "mid_design": case "late_design": case "design_complete":
            currentDepartment = "DESIGN"; break
          case "handed_over": case "mid_production": case "late_production":
            currentDepartment = "PRODUCTION"
            productionStatus = pick([...PRODUCTION_STAGES])
            break
          case "complete":
            currentDepartment = "COMPLETE"
            productionStatus = "COMPLETED"
            break
          default:
            currentDepartment = "PLANNING"
        }

        const prodId = cuid()
        await client.query(
          `INSERT INTO products (
            id, "projectId", "partCode", description, quantity, "productJobNumber",
            "currentDepartment", "productionStatus", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            prodId, projId,
            `${variant.replace(/ /g, "-").toUpperCase()}-${rand(100, 999)}`,
            `${prodType} - ${variant}`,
            rand(1, 5), jobNum,
            currentDepartment, productionStatus,
            now, now,
          ]
        )
        products.push({ id: prodId })
      }

      // ── Design cards + job cards (for design and later stages) ──
      if (["early_design", "mid_design", "late_design", "design_complete", "handed_over", "mid_production", "late_production", "complete"].includes(progress)) {
        for (let p = 0; p < products.length; p++) {
          const product = products[p]
          const designer = pick(designers)

          let cardStatus: string
          switch (progress) {
            case "early_design":
              cardStatus = p === 0 ? "IN_PROGRESS" : "QUEUED"; break
            case "mid_design":
              cardStatus = p < products.length / 2 ? "IN_PROGRESS" : "QUEUED"; break
            case "late_design":
              cardStatus = p < products.length - 1 ? "COMPLETE" : "IN_PROGRESS"; break
            case "design_complete": case "handed_over":
            case "mid_production": case "late_production": case "complete":
              cardStatus = "COMPLETE"; break
            default:
              cardStatus = "QUEUED"
          }

          const cardId = cuid()
          await client.query(
            `INSERT INTO product_design_cards (
              id, "productId", "projectId", "assignedDesignerId", status,
              "targetEndDate", "actualStartDate", "actualEndDate",
              "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              cardId, product.id, projId, designer.id, cardStatus,
              toISO(futureDate(rand(10, 90))),
              cardStatus !== "QUEUED" ? toISO(randomDate(30, 5)) : null,
              cardStatus === "COMPLETE" ? toISO(randomDate(5, 1)) : null,
              now, now,
            ]
          )

          // Create 4 job cards for each design card
          for (let j = 0; j < DESIGN_JOB_TYPES.length; j++) {
            const jobType = DESIGN_JOB_TYPES[j]
            let jobStatus: string

            if (cardStatus === "COMPLETE") {
              jobStatus = "SIGNED_OFF"
            } else if (cardStatus === "QUEUED") {
              jobStatus = j === 0 ? "READY" : "BLOCKED"
            } else {
              if (progress === "early_design") {
                if (j === 0) jobStatus = p === 0 ? "IN_PROGRESS" : "READY"
                else jobStatus = "BLOCKED"
              } else if (progress === "mid_design") {
                if (p < products.length / 2) {
                  const activeJobIdx = rand(0, 2)
                  if (j < activeJobIdx) jobStatus = "SIGNED_OFF"
                  else if (j === activeJobIdx) jobStatus = pick(["IN_PROGRESS", "SUBMITTED", "APPROVED"])
                  else jobStatus = "BLOCKED"
                } else {
                  jobStatus = j === 0 ? "READY" : "BLOCKED"
                }
              } else {
                if (p < products.length - 1) {
                  jobStatus = "SIGNED_OFF"
                } else {
                  const activeIdx = rand(1, 3)
                  if (j < activeIdx) jobStatus = "SIGNED_OFF"
                  else if (j === activeIdx) jobStatus = "IN_PROGRESS"
                  else jobStatus = "BLOCKED"
                }
              }
            }

            const jobId = cuid()
            await client.query(
              `INSERT INTO design_job_cards (
                id, "designCardId", "jobType", status, "sortOrder",
                "assignedToId", "startedAt", "approvedAt", "signedOffAt",
                "createdAt", "updatedAt"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                jobId, cardId, jobType, jobStatus, j,
                designer.id,
                jobStatus !== "BLOCKED" && jobStatus !== "READY" ? toISO(randomDate(20, 2)) : null,
                jobStatus === "SIGNED_OFF" || jobStatus === "APPROVED" ? toISO(randomDate(5, 1)) : null,
                jobStatus === "SIGNED_OFF" ? toISO(randomDate(3, 0)) : null,
                now, now,
              ]
            )
          }
        }
      }

      // ── Design handover (for design_complete and later) ──
      if (["design_complete", "handed_over", "mid_production", "late_production", "complete"].includes(progress)) {
        const handoverStatus = progress === "design_complete" ? "SUBMITTED" : "ACKNOWLEDGED"
        const handoverId = cuid()
        await client.query(
          `INSERT INTO design_handovers (
            id, "projectId", status, "initiatedById", "initiatedAt",
            "acknowledgedAt", "receivedById", "includedProductIds", checklist,
            "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            handoverId, projId, handoverStatus,
            pick(designers).id, toISO(randomDate(30, 5)),
            handoverStatus === "ACKNOWLEDGED" ? toISO(randomDate(5, 1)) : null,
            handoverStatus === "ACKNOWLEDGED" ? pick(managers).id : null,
            JSON.stringify(products.map(p => p.id)),
            JSON.stringify([
              { item: "All drawings approved", checked: true },
              { item: "BOM finalised", checked: true },
              { item: "Design review complete", checked: true },
            ]),
            now, now,
          ]
        )
      }

      // ── Production tasks (for production and complete stages) ──
      if (["handed_over", "mid_production", "late_production", "complete"].includes(progress)) {
        for (const product of products) {
          let maxStageIdx: number
          switch (progress) {
            case "handed_over": maxStageIdx = 0; break
            case "mid_production": maxStageIdx = rand(1, 3); break
            case "late_production": maxStageIdx = rand(3, 5); break
            case "complete": maxStageIdx = 5; break
            default: maxStageIdx = 0
          }

          for (let s = 0; s <= maxStageIdx && s < PRODUCTION_STAGES.length; s++) {
            const stage = PRODUCTION_STAGES[s]
            let status: string
            let inspectionStatus: string | null = null

            if (s < maxStageIdx) {
              status = "COMPLETED"
              inspectionStatus = "ACCEPTED"
            } else if (s === maxStageIdx && progress !== "complete") {
              status = pick(["PENDING", "IN_PROGRESS", "IN_PROGRESS"])
            } else {
              status = "COMPLETED"
              inspectionStatus = "ACCEPTED"
            }

            const taskId = cuid()
            await client.query(
              `INSERT INTO production_tasks (
                id, "productId", "projectId", stage, status,
                "queuePosition", "startedAt", "completedAt",
                "inspectionStatus", "inspectedAt",
                "createdAt", "updatedAt"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                taskId, product.id, projId, stage, status,
                queuePos++,
                status !== "PENDING" ? toISO(randomDate(20, 2)) : null,
                status === "COMPLETED" ? toISO(randomDate(5, 0)) : null,
                inspectionStatus,
                inspectionStatus ? toISO(randomDate(3, 0)) : null,
                now, now,
              ]
            )
          }

          // Update product's productionStatus to current stage
          const finalStatus = progress === "complete" ? "COMPLETED" : PRODUCTION_STAGES[maxStageIdx]
          await client.query(
            `UPDATE products SET "productionStatus" = $1, "updatedAt" = $2 WHERE id = $3`,
            [finalStatus, now, product.id]
          )
        }
      }

      created++
    }

    console.log(`\nDone! Created ${created} projects with products, design cards, and production tasks.`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error("Stress test failed:", e)
  process.exit(1)
})
