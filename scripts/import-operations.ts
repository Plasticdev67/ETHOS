import "dotenv/config"
import { prisma } from "../src/lib/db"
import * as fs from "fs"
import * as path from "path"

/**
 * Import flood door operations from CSV into SageBomOperation table.
 * CSV file: operations/OperationStockItems CSV MME Jan26 (Flood Door).csv
 */

const CSV_PATH = path.resolve(
  __dirname,
  "../operations/OperationStockItems CSV MME Jan26 (Flood Door).csv"
)

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n")
  const headers = lines[0].split(",")
  return lines.slice(1).map((line) => {
    const values = line.split(",")
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] || "").trim()
    })
    return row
  })
}

function toInt(val: string): number {
  const n = parseInt(val, 10)
  return isNaN(n) ? 0 : n
}

function toDecimalOrNull(val: string): number | null {
  if (!val) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

async function main() {
  console.log("Reading CSV...")
  const content = fs.readFileSync(CSV_PATH, "utf-8")
  const rows = parseCSV(content)
  console.log(`Parsed ${rows.length} rows from CSV`)

  // Check existing SageBomHeaders for these references
  const headerRefs = [...new Set(rows.map((r) => r["Header Reference (BOM Reference)"]))]
  console.log(`\nUnique BOM codes: ${headerRefs.length}`)
  console.log(headerRefs.join(", "))

  const existingHeaders = await prisma.sageBomHeader.findMany({
    where: { headerRef: { in: headerRefs } },
    select: { headerRef: true },
  })
  const existingSet = new Set(existingHeaders.map((h) => h.headerRef))
  const missing = headerRefs.filter((r) => !existingSet.has(r))

  if (missing.length > 0) {
    console.log(`\nWarning: ${missing.length} BOM headers not found in SageBomHeader:`)
    console.log(missing.join(", "))
    console.log("Operations will still be imported — headerRef is just a string reference.")
  }

  // Clear existing operations for these header refs (idempotent re-run)
  const deleted = await prisma.sageBomOperation.deleteMany({
    where: { headerRef: { in: headerRefs } },
  })
  if (deleted.count > 0) {
    console.log(`\nCleared ${deleted.count} existing operations for these BOM codes`)
  }

  // Insert operations
  let created = 0
  for (const row of rows) {
    const headerRef = row["Header Reference (BOM Reference)"]
    const stockCode = headerRef // The stock code IS the header reference for these

    await prisma.sageBomOperation.create({
      data: {
        headerRef,
        stockCode,
        sequenceNo: toInt(row["Sequence Number"]),
        operationRef: row["Operation Reference"] || "",
        operationDescription: row["Operation Description"] || null,
        isSubcontract: row["Subcontract"] === "TRUE",
        nonPrinting: row["Nonprinting"] === "TRUE",
        shrinkage: toDecimalOrNull(row["Shrinkage"]),
        overlapPercent: toDecimalOrNull(row["Overlap Percentage"]),

        // Run time
        runTimeHours: toInt(row["Run-Time Hours"]),
        runTimeMinutes: toInt(row["Run-Time Minutes"]),
        runTimeSeconds: toInt(row["Run-Time Seconds"]),
        quantityPerRun: toInt(row["Quantity Per Run"]) || 1,

        // Delay
        delayHours: toInt(row["Delay Hours"]),
        delayMinutes: toInt(row["Delay Minutes"]),
        delaySeconds: toInt(row["Delay Seconds"]),

        // Setup
        setupHours: toInt(row["Setup Hours"]),
        setupMinutes: toInt(row["Setup Minutes"]),
        setupSeconds: toInt(row["Setup Seconds"]),
        setupRate: toDecimalOrNull(row["Setup Rate"]),

        // Labour
        labourRef: row["Labour Reference"] || null,
        labourDescription: row["Labour Description"] || null,
        labourNotes: row["Labour Notes"] || null,
        labourRate: toDecimalOrNull(row["Labour Rate"]),
        labourHours: toInt(row["Labour Hours"]),
        labourMinutes: toInt(row["Labour Minutes"]),
        labourSeconds: toInt(row["Labour Seconds"]),
        setupLabourRef: row["Setup Labour Resource Reference"] || null,
        setupLabourDesc: row["Setup Labour Resource Description"] || null,

        // Machine
        machineRef: row["Machine Reference"] || null,
        machineDescription: row["Machine Description"] || null,
        machineNotes: row["Machine Notes"] || null,
        machineRate: toDecimalOrNull(row["Machine Rate"]),
        machineHours: toInt(row["Machine Hours"]),
        machineMinutes: toInt(row["Machine Minutes"]),
        machineSeconds: toInt(row["Machine Seconds"]),
        setupMachineRef: row["Setup Machine Resource Reference"] || null,
        setupMachineDesc: row["Setup Machine Resource Description"] || null,

        // Tooling
        toolingRef: row["Tooling Resource Reference"] || null,
        toolingDesc: row["Tooling Resource Description"] || null,
        toolingCost: toDecimalOrNull(row["Tooling Cost"]),
        toolingQty: toInt(row["Tooling Quantity"]) || null,
      },
    })
    created++
  }

  console.log(`\nImported ${created} operations across ${headerRefs.length} BOM codes`)

  // Summary per BOM code
  console.log("\n--- Summary by BOM Code ---")
  for (const ref of headerRefs) {
    const ops = rows.filter((r) => r["Header Reference (BOM Reference)"] === ref)
    const totalRunHours = ops.reduce(
      (sum, o) => sum + toInt(o["Run-Time Hours"]) + toInt(o["Run-Time Minutes"]) / 60,
      0
    )
    console.log(
      `  ${ref}: ${ops.length} operations, ~${totalRunHours.toFixed(1)}h total run time`
    )
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Import failed:", err)
  process.exit(1)
})
