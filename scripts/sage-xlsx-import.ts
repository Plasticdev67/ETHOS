/**
 * Sage XLSX Import — Replaces the old 22-file CSV import.
 *
 * Reads 6 XLSX files from "Sage Export/" and loads into:
 *   Phase 1: Clear staging tables
 *   Phase 2: Customers (upsert on accountCode)
 *   Phase 3: Suppliers (upsert on accountCode)
 *   Phase 4: SageStockItem (staging)
 *   Phase 5: SageBomHeader (staging)
 *   Phase 6: SageBomComponent (staging, stateful walk)
 *   Phase 7: Projects (upsert on projectNumber)
 *
 * Run:  npx tsx scripts/sage-xlsx-import.ts
 */
import "dotenv/config"
import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"
import { prisma } from "../src/lib/db"

// ─── File paths ──────────────────────────────────────────────────

const SAGE_DIR = path.resolve(__dirname, "../../Sage Export")

const FILES = {
  customers:  "Export_2026-03-01T17_50_18 - Customers.xlsx",
  suppliers:  "Export_2026-03-02T07_17_57 - Suppliers.xlsx",
  mega:       "Export_2026-03-02T07_54_33 - Mega.xlsx",
  bomHeaders: "Export_2026-03-01T17_49_43.xlsx",
  bomStruct:  "Export_2026-03-01T18_01_15.xlsx",
  projects:   "Export_2026-03-02T17_10_56 - Project list.xlsx",
} as const

// ─── XLSX + parsing helpers ──────────────────────────────────────

/** Read XLSX → array of objects, trimming trailing spaces from headers */
function readXlsx(fileName: string): Record<string, string>[] {
  const filePath = path.join(SAGE_DIR, fileName)
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP: File not found: ${fileName}`)
    return []
  }
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" })

  return raw.map((row) => {
    const clean: Record<string, string> = {}
    for (const [key, val] of Object.entries(row)) {
      clean[key.trim()] = typeof val === "string" ? val : String(val)
    }
    return clean
  })
}

/** Empty string → null, otherwise trimmed string */
function str(val: unknown): string | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  return s === "" ? null : s
}

/** Parse integer, NaN → null */
function int(val: unknown): number | null {
  const s = str(val)
  if (s === null) return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

/** Parse decimal, NaN → null */
function dec(val: unknown): number | null {
  const s = str(val)
  if (s === null) return null
  const cleaned = s.replace(/[£,]/g, "")
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/** Excel serial date → JS Date */
function excelDate(val: unknown): Date | null {
  const n = dec(val)
  if (n === null || n < 1) return null
  // Excel epoch is 1900-01-01, but has a leap year bug (day 60 = Feb 29, 1900 which doesn't exist)
  const epoch = new Date(Date.UTC(1899, 11, 30))
  return new Date(epoch.getTime() + n * 86400000)
}

/** Map BOM Item Type string → int code */
function bomItemTypeCode(val: unknown): number | null {
  const s = str(val)
  if (s === null) return null
  const map: Record<string, number> = {
    "Component": 1,
    "Sub Assembly": 2,
    "Built Item": 3,
    "Built/Bought": 4,
  }
  return map[s] ?? null
}

// ─── Phase 1: Clear staging tables ──────────────────────────────

async function clearStagingTables(): Promise<void> {
  console.log("\n[Phase 1] Clearing staging tables...")

  const ops = await prisma.sageBomOperation.deleteMany()
  const comp = await prisma.sageBomComponent.deleteMany()
  const hdr = await prisma.sageBomHeader.deleteMany()
  const stk = await prisma.sageStockItem.deleteMany()

  console.log(`  Deleted: ${ops.count} operations, ${comp.count} components, ${hdr.count} headers, ${stk.count} stock items`)
}

// ─── Phase 2: Import Customers ──────────────────────────────────

async function importCustomers(): Promise<{ created: number; updated: number }> {
  console.log("\n[Phase 2] Importing Customers...")
  const rows = readXlsx(FILES.customers)
  console.log(`  Read ${rows.length} rows`)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const accountCode = str(row["Code"])
    if (!accountCode) { skipped++; continue }

    const name = str(row["Name"]) ?? str(row["Short Name"]) ?? accountCode
    const email = str(row["Contact Email"])
    const phone = str(row["Contact Telephone"])
    const contactName = str(row["Contact Name"])

    const existing = await prisma.customer.findUnique({
      where: { accountCode },
      select: { id: true, name: true, email: true, phone: true },
    })

    if (existing) {
      // Only update fields that are currently null/empty in ETHOS
      const updates: Record<string, string> = {}
      if (!existing.name && name) updates.name = name
      if (!existing.email && email) updates.email = email
      if (!existing.phone && phone) updates.phone = phone

      if (Object.keys(updates).length > 0) {
        await prisma.customer.update({
          where: { accountCode },
          data: updates,
        })
        updated++
      }

      // Create contact if we have a contact name and the customer has no contacts
      if (contactName) {
        const contactCount = await prisma.customerContact.count({
          where: { customerId: existing.id },
        })
        if (contactCount === 0) {
          await prisma.customerContact.create({
            data: {
              customerId: existing.id,
              name: contactName,
              email,
              phone,
              isPrimary: true,
            },
          })
        }
      }
    } else {
      const customer = await prisma.customer.create({
        data: {
          name,
          accountCode,
          email,
          phone,
        },
      })
      created++

      if (contactName) {
        await prisma.customerContact.create({
          data: {
            customerId: customer.id,
            name: contactName,
            email,
            phone,
            isPrimary: true,
          },
        })
      }
    }
  }

  console.log(`  Created: ${created}, Updated: ${updated}, Skipped (no code): ${skipped}`)
  return { created, updated }
}

// ─── Phase 3: Import Suppliers ──────────────────────────────────

async function importSuppliers(): Promise<{ created: number; updated: number }> {
  console.log("\n[Phase 3] Importing Suppliers...")
  const rows = readXlsx(FILES.suppliers)
  console.log(`  Read ${rows.length} rows`)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const accountCode = str(row["Code"])
    if (!accountCode) { skipped++; continue }

    const name = str(row["Name"]) ?? str(row["Short Name"]) ?? accountCode
    const email = str(row["Contact Email"])
    const phone = str(row["Contact Telephone"])
    const contactName = str(row["Contact Name"])

    const existing = await prisma.supplier.findUnique({
      where: { accountCode },
      select: { id: true, name: true, email: true, phone: true },
    })

    if (existing) {
      const updates: Record<string, string> = {}
      if (!existing.name && name) updates.name = name
      if (!existing.email && email) updates.email = email
      if (!existing.phone && phone) updates.phone = phone

      if (Object.keys(updates).length > 0) {
        await prisma.supplier.update({
          where: { accountCode },
          data: updates,
        })
        updated++
      }

      if (contactName) {
        const contactCount = await prisma.supplierContact.count({
          where: { supplierId: existing.id },
        })
        if (contactCount === 0) {
          await prisma.supplierContact.create({
            data: {
              supplierId: existing.id,
              name: contactName,
              email,
              phone,
              isPrimary: true,
            },
          })
        }
      }
    } else {
      const supplier = await prisma.supplier.create({
        data: {
          name,
          accountCode,
          email,
          phone,
        },
      })
      created++

      if (contactName) {
        await prisma.supplierContact.create({
          data: {
            supplierId: supplier.id,
            name: contactName,
            email,
            phone,
            isPrimary: true,
          },
        })
      }
    }
  }

  console.log(`  Created: ${created}, Updated: ${updated}, Skipped (no code): ${skipped}`)
  return { created, updated }
}

// ─── Phase 4: Import Stock Items (Mega) ─────────────────────────

async function importStockItems(): Promise<number> {
  console.log("\n[Phase 4] Importing Stock Items from Mega...")
  const rows = readXlsx(FILES.mega)
  console.log(`  Read ${rows.length} rows`)

  let created = 0
  let skipped = 0

  for (const row of rows) {
    const stockCode = str(row["Code"])
    if (!stockCode) { skipped++; continue }

    const extraAnalysis: Record<string, unknown> = {}
    const actualQty = dec(row["Actual Quantity"])
    const freeQty = dec(row["Free Stock Quantity"])
    const status = str(row["Stock Item Status"])
    const stockItemType = str(row["Stock Item Type"])
    const masterFg = str(row["Master FG Item"])

    if (actualQty !== null) extraAnalysis.actualQuantity = actualQty
    if (freeQty !== null) extraAnalysis.freeStockQuantity = freeQty
    if (status) extraAnalysis.status = status
    if (stockItemType) extraAnalysis.stockItemType = stockItemType
    if (masterFg) extraAnalysis.masterFgItem = masterFg

    const data = {
      name: str(row["Name"]) ?? stockCode,
      description: str(row["Description"]),
      productGroup: str(row["Product Group Code"]),
      productFamily: str(row["Product Family"]),
      bomItemType: bomItemTypeCode(row["BOM Item Type"]),
      itemSetType: str(row["Item Set Type"]),
      operationType: str(row["Product Operation Type"]),
      materialComposition: str(row["Material Composition"]),
      automation: str(row["Automation"]),
      floodingRating: str(row["Flooding Rating"]),
      securityRating: str(row["Security Rating"]),
      fireRating: str(row["Fire Rating"]),
      blastRating: str(row["Blast Rating"]),
      pressureRating: str(row["Pressure Rating"]),
      thermalRating: str(row["Thermal Rating"]),
      extraAnalysis: Object.keys(extraAnalysis).length > 0 ? extraAnalysis : undefined,
      sourceFile: FILES.mega,
    }

    await prisma.sageStockItem.upsert({
      where: { stockCode },
      create: { stockCode, ...data },
      update: data,
    })
    created++
  }

  console.log(`  Upserted: ${created}, Skipped (no code): ${skipped}`)
  return created
}

// ─── Phase 5: Import BOM Headers ────────────────────────────────

async function importBomHeaders(): Promise<number> {
  console.log("\n[Phase 5] Importing BOM Headers...")
  const rows = readXlsx(FILES.bomHeaders)
  console.log(`  Read ${rows.length} rows`)

  let created = 0
  let skipped = 0

  for (const row of rows) {
    const headerRef = str(row["Reference"])
    if (!headerRef) { skipped++; continue }

    // FK constraint: headerRef must exist in SageStockItem
    const stockItem = await prisma.sageStockItem.findUnique({
      where: { stockCode: headerRef },
      select: { stockCode: true },
    })

    if (!stockItem) {
      console.warn(`    SKIP header "${headerRef}": no matching stock item`)
      skipped++
      continue
    }

    await prisma.sageBomHeader.upsert({
      where: { headerRef },
      create: {
        headerRef,
        description: str(row["Description"]),
        revision: str(row["Version"]),
        sourceFile: FILES.bomHeaders,
      },
      update: {
        description: str(row["Description"]),
        revision: str(row["Version"]),
        sourceFile: FILES.bomHeaders,
      },
    })
    created++
  }

  console.log(`  Upserted: ${created}, Skipped: ${skipped}`)
  return created
}

// ─── Phase 6: Import BOM Structure (stateful walk) ──────────────

async function importBomStructure(): Promise<{ headers: number; components: number; stubs: number }> {
  console.log("\n[Phase 6] Importing BOM Structure (stateful walk)...")
  const rows = readXlsx(FILES.bomStruct)
  console.log(`  Read ${rows.length} rows`)

  let headersCreated = 0
  let componentsCreated = 0
  let stubsCreated = 0
  let skipped = 0

  let currentHeaderRef: string | null = null
  let sequenceNo = 0

  // Track which stock items exist to avoid repeated lookups
  const existingStockCodes = new Set<string>()
  const allStockItems = await prisma.sageStockItem.findMany({ select: { stockCode: true } })
  for (const item of allStockItems) existingStockCodes.add(item.stockCode)

  // Track headers we've already created
  const existingHeaders = new Set<string>()
  const allHeaders = await prisma.sageBomHeader.findMany({ select: { headerRef: true } })
  for (const h of allHeaders) existingHeaders.add(h.headerRef)

  for (const row of rows) {
    const type = str(row["Type"])
    const code = str(row["Code"])

    if (!type || !code) { skipped++; continue }

    if (type === "Bill of Materials") {
      currentHeaderRef = code
      sequenceNo = 0

      if (!existingHeaders.has(code)) {
        // Must have a matching stock item
        if (!existingStockCodes.has(code)) {
          await prisma.sageStockItem.create({
            data: {
              stockCode: code,
              name: str(row["Name"]) ?? code,
              sourceFile: FILES.bomStruct,
            },
          })
          existingStockCodes.add(code)
          stubsCreated++
        }

        await prisma.sageBomHeader.create({
          data: {
            headerRef: code,
            description: str(row["Name"]),
            sourceFile: FILES.bomStruct,
          },
        })
        existingHeaders.add(code)
        headersCreated++
      }
    } else if (type === "Component" || type === "Subassembly" || type === "Sub Assembly") {
      if (!currentHeaderRef) {
        console.warn(`    SKIP component "${code}": no parent BOM header yet`)
        skipped++
        continue
      }

      sequenceNo += 10

      // Auto-create stub stock item if component code not in Mega
      if (!existingStockCodes.has(code)) {
        await prisma.sageStockItem.create({
          data: {
            stockCode: code,
            name: str(row["Name"]) ?? code,
            sourceFile: FILES.bomStruct,
          },
        })
        existingStockCodes.add(code)
        stubsCreated++
      }

      const qty = dec(row["Quantity"]) ?? 1

      await prisma.sageBomComponent.create({
        data: {
          headerRef: currentHeaderRef,
          stockCode: code,
          description: str(row["Name"]),
          sequenceNo,
          quantity: qty,
          unitOfMeasure: str(row["Unit of Measure"]),
          sourceFile: FILES.bomStruct,
        },
      })
      componentsCreated++
    } else {
      skipped++
    }
  }

  console.log(`  BOM headers created (from structure): ${headersCreated}`)
  console.log(`  BOM components created: ${componentsCreated}`)
  console.log(`  Stub stock items auto-created: ${stubsCreated}`)
  if (skipped > 0) console.log(`  Skipped rows: ${skipped}`)

  return { headers: headersCreated, components: componentsCreated, stubs: stubsCreated }
}

// ─── Phase 7: Import Projects ───────────────────────────────────

/** Map Sage status to ProjectStatus enum */
function mapProjectStatus(val: string | null): "OPPORTUNITY" | "QUOTATION" | "DESIGN" | "DESIGN_FREEZE" | "MANUFACTURE" | "INSTALLATION" | "REVIEW" | "COMPLETE" {
  if (!val) return "OPPORTUNITY"
  const lower = val.toLowerCase()
  if (lower === "live") return "DESIGN"
  if (lower === "complete" || lower === "completed") return "COMPLETE"
  if (lower === "tender" || lower === "tendering") return "QUOTATION"
  return "OPPORTUNITY"
}

/** Map Sage project type to ProjectType enum */
function mapProjectType(val: string | null): "STANDARD" | "BESPOKE_MAJOR" {
  if (!val) return "STANDARD"
  if (val.toLowerCase().includes("bespoke") || val.toLowerCase().includes("major")) return "BESPOKE_MAJOR"
  return "STANDARD"
}

/** Map Sage work stream to WorkStream enum */
function mapWorkStream(val: string | null): "COMMUNITY" | "UTILITIES" | "BESPOKE" | "BLAST" | "BUND_CONTAINMENT" | "REFURBISHMENT" {
  if (!val) return "BESPOKE"
  const lower = val.toLowerCase()
  if (lower === "community") return "COMMUNITY"
  if (lower === "utilities") return "UTILITIES"
  if (lower === "bespoke") return "BESPOKE"
  if (lower === "blast") return "BLAST"
  if (lower.includes("bund") || lower.includes("containment")) return "BUND_CONTAINMENT"
  if (lower.includes("refurb")) return "REFURBISHMENT"
  return "BESPOKE"
}

async function importProjects(): Promise<{ created: number; updated: number }> {
  console.log("\n[Phase 7] Importing Projects...")
  const rows = readXlsx(FILES.projects)
  console.log(`  Read ${rows.length} rows`)

  // Build lookup maps for Customer (by name) and User (by name)
  const allCustomers = await prisma.customer.findMany({ select: { id: true, name: true } })
  const customerByName = new Map<string, string>()
  for (const c of allCustomers) {
    customerByName.set(c.name.toLowerCase(), c.id)
  }

  const allUsers = await prisma.user.findMany({ select: { id: true, name: true } })
  const userByName = new Map<string, string>()
  for (const u of allUsers) {
    userByName.set(u.name.toLowerCase(), u.id)
  }

  let created = 0
  let updated = 0
  let skipped = 0
  const unmatchedCustomers = new Set<string>()
  const unmatchedUsers = new Set<string>()

  for (const row of rows) {
    const projectNumber = str(row["Project"])
    if (!projectNumber) { skipped++; continue }

    const name = str(row["Description"]) ?? `Project ${projectNumber}`
    const customerName = str(row["Customer"])
    const pmName = str(row["Project manager"])
    const salesName = str(row["Sales Lead"])
    const designName = str(row["Design Lead"])

    // Look up customer by name
    let customerId: string | undefined
    if (customerName) {
      customerId = customerByName.get(customerName.toLowerCase())
      if (!customerId) unmatchedCustomers.add(customerName)
    }

    // Look up users by name
    let projectManagerId: string | undefined
    if (pmName) {
      projectManagerId = userByName.get(pmName.toLowerCase())
      if (!projectManagerId) unmatchedUsers.add(pmName)
    }

    let salesLeadId: string | undefined
    if (salesName) {
      salesLeadId = userByName.get(salesName.toLowerCase())
      if (!salesLeadId) unmatchedUsers.add(salesName)
    }

    let designLeadId: string | undefined
    if (designName) {
      designLeadId = userByName.get(designName.toLowerCase())
      if (!designLeadId) unmatchedUsers.add(designName)
    }

    const budgetRevenue = dec(row["Budget Revenue"])
    const budgetCost = dec(row["Budget Cost"])
    const actualCost = dec(row["Actual Cost"])
    const poNumber = str(row["PO Number"])

    const existing = await prisma.project.findUnique({
      where: { projectNumber },
      select: { id: true },
    })

    const projectData = {
      name,
      projectType: mapProjectType(str(row["Project Type"])),
      workStream: mapWorkStream(str(row["Work Stream"])),
      projectStatus: mapProjectStatus(str(row["Status"])),
      siteLocation: str(row["Project Location"]),
      deliveryType: str(row["Project Delivery"]),
      contractValue: budgetRevenue,
      estimatedValue: budgetCost,
      currentCost: actualCost,
      customerId,
      projectManagerId,
      salesLeadId,
      designLeadId,
      notes: poNumber ? `PO: ${poNumber}` : undefined,
    }

    if (existing) {
      await prisma.project.update({
        where: { projectNumber },
        data: projectData,
      })
      updated++
    } else {
      await prisma.project.create({
        data: {
          projectNumber,
          ...projectData,
        },
      })
      created++
    }
  }

  console.log(`  Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`)
  if (unmatchedCustomers.size > 0) {
    console.log(`  Unmatched customers (no link): ${[...unmatchedCustomers].join(", ")}`)
  }
  if (unmatchedUsers.size > 0) {
    console.log(`  Unmatched users (no link): ${[...unmatchedUsers].join(", ")}`)
  }

  return { created, updated }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════╗")
  console.log("║   ETHOS — Sage XLSX Import               ║")
  console.log("╚══════════════════════════════════════════╝")
  console.log(`\nSource: ${SAGE_DIR}`)

  // Verify directory exists
  if (!fs.existsSync(SAGE_DIR)) {
    console.error(`\nERROR: Sage Export directory not found: ${SAGE_DIR}`)
    process.exit(1)
  }

  // Verify all required files exist
  for (const [label, fileName] of Object.entries(FILES)) {
    const fp = path.join(SAGE_DIR, fileName)
    if (!fs.existsSync(fp)) {
      console.error(`\nERROR: Missing file "${label}": ${fileName}`)
      process.exit(1)
    }
  }

  console.log("All 6 required files found.\n")

  // Phase 1: Clear staging tables
  await clearStagingTables()

  // Phase 2: Customers (master data first)
  const custResult = await importCustomers()

  // Phase 3: Suppliers (master data)
  const suppResult = await importSuppliers()

  // Phase 4: Stock items
  const stockCount = await importStockItems()

  // Phase 5: BOM headers
  const headerCount = await importBomHeaders()

  // Phase 6: BOM structure (components)
  const structResult = await importBomStructure()

  // Phase 7: Projects (references customers + users)
  const projResult = await importProjects()

  // Summary
  console.log("\n╔══════════════════════════════════════════╗")
  console.log("║   IMPORT COMPLETE                        ║")
  console.log("╠══════════════════════════════════════════╣")
  console.log(`║  Customers:  ${String(custResult.created).padStart(4)} new, ${String(custResult.updated).padStart(4)} updated  ║`)
  console.log(`║  Suppliers:  ${String(suppResult.created).padStart(4)} new, ${String(suppResult.updated).padStart(4)} updated  ║`)
  console.log(`║  Stock Items:       ${String(stockCount).padStart(6)}              ║`)
  console.log(`║  BOM Headers:       ${String(headerCount + structResult.headers).padStart(6)}              ║`)
  console.log(`║  BOM Components:    ${String(structResult.components).padStart(6)}              ║`)
  console.log(`║  Stub Stock Items:  ${String(structResult.stubs).padStart(6)}              ║`)
  console.log(`║  Projects:   ${String(projResult.created).padStart(4)} new, ${String(projResult.updated).padStart(4)} updated  ║`)
  console.log("╚══════════════════════════════════════════╝")
  console.log("\nNext steps:")
  console.log("  1. npx tsx scripts/run-sage-sync.ts   (rebuild catalogue)")
  console.log("  2. Check /customers, /suppliers, /projects, /bom-library in ETHOS")

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("\nERROR:", e.message)
  console.error(e.stack)
  process.exit(1)
})
