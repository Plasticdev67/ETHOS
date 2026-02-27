import pg from "pg"
import dotenv from "dotenv"
import { parse } from "csv-parse/sync"
import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"
import crypto from "crypto"

dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const BOM_DIR = path.resolve("D:/Ethos/Bom Database")

function cuid(): string {
  return crypto.randomBytes(16).toString("hex").slice(0, 25)
}

// ─── File definitions ─────────────────────────────────────────────

interface FileEntry {
  file: string
  family: string // product family context from filename
}

const STOCK_ITEM_FILES: FileEntry[] = [
  { file: "StockItemsProfessional CSV MME Jan26 (Flood Door).csv", family: "Flood Door" },
  { file: "StockItemsProfessional CSV MME Jan26 (Flood Gate).csv", family: "Flood Gate" },
  { file: "StockItemsProfessional CSV MME Jan26 (Flood Glazing Wall).csv", family: "Flood Glazing Wall" },
  { file: "StockItemsProfessional CSV MME Jan26 (Fixings).csv", family: "Fixings" },
  { file: "StockItemsProfessional CSV MME Jan26 (Raw).csv", family: "Raw" },
  { file: "StockItemsProfessional CSV MME Jan26 (Stop Log).csv", family: "Stop Log" },
  { file: "StockItemsProfessional CSV MME Jan26 (Rack).xlsx", family: "Rack" },
]

const BOM_HEADER_FILES: FileEntry[] = [
  { file: "BOM Header CSV MME Jan26 (Flood Door).csv", family: "Flood Door" },
  { file: "BOM Header CSV MME Jan26 (Flood Gate).csv", family: "Flood Gate" },
  { file: "BOM Header CSV MME Jan26 (Flood Glazing Wall).csv", family: "Flood Glazing Wall" },
]

const COMPONENT_FILES: FileEntry[] = [
  { file: "Component Header CVS MME Jan26 (Flood Door Combined).csv", family: "Flood Door" },
  { file: "Component Header CVS MME Jan26 (Flood Gate Combined).csv", family: "Flood Gate" },
  { file: "Component Header CVS MME Jan26 (Flood Glazing Wall Combined).csv", family: "Flood Glazing Wall" },
]

const MSE_FILES: FileEntry[] = [
  { file: "MSE Stock Item CSV MME Jan26 (Flood Door).csv", family: "Flood Door" },
  { file: "MSE Stock Item CSV MME Jan26 (Flood Gate).csv", family: "Flood Gate" },
  { file: "MSE Stock Item CSV MME Jan26 (Flood Glazing Wall).csv", family: "Flood Glazing Wall" },
]

const OPERATION_FILES: FileEntry[] = [
  { file: "OperationStockItems CSV MME Jan26 (Flood Door).csv", family: "Flood Door" },
  { file: "OperationStockItems CSV MME Jan26 (Flood Gate).csv", family: "Flood Gate" },
  { file: "OperationStockItems CSV MME Jan26 (Flood Glazing Wall).csv", family: "Flood Glazing Wall" },
]

// ─── Parsing helpers ──────────────────────────────────────────────

function readFile(entry: FileEntry): Record<string, string>[] {
  const filePath = path.join(BOM_DIR, entry.file)
  if (!fs.existsSync(filePath)) {
    console.warn(`  SKIP: File not found: ${entry.file}`)
    return []
  }

  if (entry.file.endsWith(".xlsx")) {
    const workbook = XLSX.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })
  }

  const raw = fs.readFileSync(filePath, "utf-8")
  return parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true })
}

function str(val: unknown): string | null {
  if (val === undefined || val === null) return null
  const s = String(val).trim()
  return s === "" ? null : s
}

function int(val: unknown): number | null {
  const s = str(val)
  if (s === null) return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

function dec(val: unknown): string | null {
  const s = str(val)
  if (s === null) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : String(n)
}

function bool(val: unknown): boolean {
  const s = str(val)
  if (s === null) return false
  return s === "TRUE" || s === "true" || s === "1" || s === "True"
}

// Known analysis field names → DB column mapping
const ANALYSIS_MAP: Record<string, string> = {
  "Product Family": "productFamily",
  "Item Set Type": "itemSetType",
  "Product Operation Type": "operationType",
  "Material Composition": "materialComposition",
  "Automation": "automation",
  "Flooding Rating": "floodingRating",
  "Security Rating": "securityRating",
  "Fire Rating": "fireRating",
  "Blast Rating": "blastRating",
  "Pressure Rating": "pressureRating",
  "Thermal Rating": "thermalRating",
}

function parseAnalysis(row: Record<string, string>): Record<string, string | null | Record<string, string>> {
  const result: Record<string, string | null> = {}
  const extra: Record<string, string> = {}

  for (let i = 1; i <= 20; i++) {
    const name = str(row[`AnalysisName\\${i}`] || row[`AnalysisName/${i}`] || row[`AnalysisName${i}`])
    const value = str(row[`AnalysisValue\\${i}`] || row[`AnalysisValue/${i}`] || row[`AnalysisValue${i}`])
    if (!name || !value) continue

    const colName = ANALYSIS_MAP[name.trim()]
    if (colName) {
      result[colName] = value
    } else {
      extra[name] = value
    }
  }

  return {
    ...result,
    extraAnalysis: Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
  } as any
}

// ─── Import functions ─────────────────────────────────────────────

async function importStockItems(client: pg.PoolClient): Promise<number> {
  console.log("\n=== Importing Stock Items ===")
  const seen = new Set<string>()
  let total = 0

  for (const entry of STOCK_ITEM_FILES) {
    const rows = readFile(entry)
    console.log(`  ${entry.file}: ${rows.length} rows`)

    for (const row of rows) {
      const stockCode = str(row["Stock item code"])
      if (!stockCode || seen.has(stockCode)) continue
      seen.add(stockCode)

      const analysis = parseAnalysis(row)
      const accounting = {
        assetOfStock: { account: str(row["Asset of stock - account number"]), costCentre: str(row["Asset of stock - cost centre"]), department: str(row["Asset of stock - department"]) },
        revenue: { account: str(row["Revenue - account number"]), costCentre: str(row["Revenue - cost centre"]), department: str(row["Revenue - department"]) },
        accruedReceipts: { account: str(row["Accrued receipts - account number"]), costCentre: str(row["Accrued receipts - cost centre"]), department: str(row["Accrued receipts - department"]) },
        issues: { account: str(row["Issues - account number"]), costCentre: str(row["Issues - cost centre"]), department: str(row["Issues - department"]) },
      }

      await client.query(
        `INSERT INTO sage_stock_items (
          id, "stockCode", name, description, "productGroup", "taxCode",
          "manufacturerName", "manufacturerPartNo", "commodityCode", "netMass",
          "stockTakeDays", "allowSalesOrder", barcode, memo,
          "supplierRef", "supplierLeadTime", "supplierLeadTimeUnit",
          "supplierMinQty", "supplierUsualQty", "supplierPartNo",
          "alternativeItemCode", "alternativeItemName",
          "productFamily", "itemSetType", "operationType", "materialComposition",
          automation, "floodingRating", "securityRating", "fireRating",
          "blastRating", "pressureRating", "thermalRating", "extraAnalysis",
          "accountingData", "sourceFile", "importedAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,NOW(),NOW()
        ) ON CONFLICT ("stockCode") DO NOTHING`,
        [
          cuid(),
          stockCode,
          str(row["Stock item name"]) || stockCode,
          str(row["Stock item description"]),
          str(row["Product group"]),
          str(row["Tax code"]),
          str(row["Manufacturer's name"]),
          str(row["Manufacturer's part number"]),
          str(row["Commodity code"]),
          dec(row["Net mass"]),
          int(row["Stock take days"]),
          bool(row["Allow Sales order"]),
          str(row["Barcode"]),
          str(row["Memo"]),
          str(row["Supplier"]),
          int(row["Supplier lead time"]),
          str(row["Supplier lead time unit"]),
          dec(row["Supplier minimum quantity"]),
          dec(row["Supplier usual order quantity"]),
          str(row["Supplier part number"]),
          str(row["Alternative item"]),
          str(row["Alternative item name"]),
          analysis.productFamily || entry.family,
          analysis.itemSetType,
          analysis.operationType,
          analysis.materialComposition,
          analysis.automation,
          analysis.floodingRating,
          analysis.securityRating,
          analysis.fireRating,
          analysis.blastRating,
          analysis.pressureRating,
          analysis.thermalRating,
          analysis.extraAnalysis,
          JSON.stringify(accounting),
          entry.file,
        ]
      )
      total++
    }
  }

  console.log(`  Total stock items inserted: ${total}`)
  return total
}

async function importMseData(client: pg.PoolClient): Promise<number> {
  console.log("\n=== Merging MSE Manufacturing Settings ===")
  let total = 0

  for (const entry of MSE_FILES) {
    const rows = readFile(entry)
    console.log(`  ${entry.file}: ${rows.length} rows`)

    for (const row of rows) {
      const stockCode = str(row["StockCode"])
      if (!stockCode) continue

      const mseJson = {
        aggregateDays: int(row["AggregateDays"]),
        canCancelWo: bool(row["CanCancelWO"]),
        canCancelPo: bool(row["CanCancelPO"]),
        mrpMultipleValue: int(row["MRPReplenishmentMultipleValue"]),
        linked: bool(row["Linked"]),
        useDemandWarehouse: bool(row["UseDemandWarehouse"]),
        useWoCompletionWarehouse: bool(row["UseWOCompletionWarehouse"]),
        applyReorderAfterMax: bool(row["ApplyReorderLevelAfterMaximum"]),
        replenishmentHorizonDays: int(row["ReplenishmentHorizonDays"]),
      }

      const result = await client.query(
        `UPDATE sage_stock_items SET
          "bomItemType" = $1,
          "defaultMake" = $2,
          "defaultWarehouse" = $3,
          "costHeading" = $4,
          "scrapPercent" = $5,
          "woBatchMinQty" = $6,
          "woBatchMaxQty" = $7,
          "bulkIssue" = $8,
          "mrpRulesTypeId" = $9,
          "mseData" = $10,
          "updatedAt" = NOW()
        WHERE "stockCode" = $11`,
        [
          int(row["BomItemType"]),
          bool(row["BuiltBoughtDefaultMake"]),
          str(row["DefaultWOWarehouse"]),
          str(row["CostHeadingName"]),
          dec(row["ScrapPercent"]),
          int(row["WOBatchMinQty"]),
          int(row["WOBatchMaxQty"]),
          bool(row["BulkIssue"]),
          int(row["MRPReplenishmentRulesTypeID"]),
          JSON.stringify(mseJson),
          stockCode,
        ]
      )
      if (result.rowCount && result.rowCount > 0) total++
    }
  }

  console.log(`  Total MSE records merged: ${total}`)
  return total
}

async function importBomHeaders(client: pg.PoolClient): Promise<number> {
  console.log("\n=== Importing BOM Headers ===")
  const seen = new Set<string>()
  let total = 0

  for (const entry of BOM_HEADER_FILES) {
    const rows = readFile(entry)
    console.log(`  ${entry.file}: ${rows.length} rows`)

    for (const row of rows) {
      const headerRef = str(row["Header Reference"])
      if (!headerRef || seen.has(headerRef)) continue
      seen.add(headerRef)

      // Check that the stock item exists (FK constraint)
      const check = await client.query(
        `SELECT 1 FROM sage_stock_items WHERE "stockCode" = $1`, [headerRef]
      )
      if (check.rowCount === 0) {
        console.warn(`    SKIP header ${headerRef}: no matching stock item`)
        continue
      }

      await client.query(
        `INSERT INTO sage_bom_headers (
          id, "headerRef", description, "manufacturingInstructions", "qualityStandard",
          "effectiveFrom", "effectiveTo", "defaultCostQty", "defaultBuildQty",
          "bomModuleOnly", revision, "changeRef", "componentTraceability",
          "sourceFile", "importedAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
        ON CONFLICT ("headerRef") DO NOTHING`,
        [
          cuid(),
          headerRef,
          str(row["Description"]),
          str(row["Manufacturing Instructions"]),
          str(row["Quality Standard"]),
          str(row["Effective From"]) || null,
          str(row["Effective To"]) || null,
          int(row["Default Cost Quantity"]) || 1,
          int(row["Default Build Quantity"]) || 1,
          bool(row["Use Only in BOM Module"]),
          str(row["Revision"]),
          str(row["Change Reference"]),
          bool(row["Component Traceability"]),
          entry.file,
        ]
      )
      total++
    }
  }

  console.log(`  Total BOM headers inserted: ${total}`)
  return total
}

async function importComponents(client: pg.PoolClient): Promise<number> {
  console.log("\n=== Importing BOM Components ===")
  let total = 0
  let skipped = 0

  for (const entry of COMPONENT_FILES) {
    const rows = readFile(entry)
    console.log(`  ${entry.file}: ${rows.length} rows`)

    for (const row of rows) {
      const headerRef = str(row["Header Reference (BOM Reference)"])
      const stockCode = str(row["Stock Code"])
      if (!headerRef || !stockCode) continue

      // Check FK constraints
      const [hCheck, sCheck] = await Promise.all([
        client.query(`SELECT 1 FROM sage_bom_headers WHERE "headerRef" = $1`, [headerRef]),
        client.query(`SELECT 1 FROM sage_stock_items WHERE "stockCode" = $1`, [stockCode]),
      ])

      if (hCheck.rowCount === 0 || sCheck.rowCount === 0) {
        skipped++
        continue
      }

      await client.query(
        `INSERT INTO sage_bom_components (
          id, "headerRef", "stockCode", description, notes,
          "sequenceNo", quantity, instruction, "unitOfMeasure",
          "scrapPercent", "fixedQuantity", "bomModuleOnly",
          "sourceFile", "importedAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
        [
          cuid(),
          headerRef,
          stockCode,
          str(row["Description"]),
          str(row["Notes"]),
          int(row["Sequence Number"]) || 0,
          dec(row["Quantity"]) || "0",
          str(row["Instruction"]),
          str(row["Unit of MEachsure"]) || str(row["Unit of Measure"]),
          dec(row["Scrap Percentage"]) || "0",
          bool(row["Fixed Quantity"]),
          bool(row["Use Only in BOM Module"]),
          entry.file,
        ]
      )
      total++
    }
  }

  if (skipped > 0) console.log(`  Skipped ${skipped} components (missing header or stock item)`)
  console.log(`  Total BOM components inserted: ${total}`)
  return total
}

async function importOperations(client: pg.PoolClient): Promise<number> {
  console.log("\n=== Importing BOM Operations ===")
  let total = 0
  let skipped = 0

  for (const entry of OPERATION_FILES) {
    const rows = readFile(entry)
    console.log(`  ${entry.file}: ${rows.length} rows`)

    for (const row of rows) {
      const headerRef = str(row["Header Reference (BOM Reference)"])
      if (!headerRef) continue

      // Check FK: header must exist
      const hCheck = await client.query(
        `SELECT 1 FROM sage_bom_headers WHERE "headerRef" = $1`, [headerRef]
      )
      if (hCheck.rowCount === 0) {
        skipped++
        continue
      }

      // stockCode for the operation = headerRef (the parent product)
      const stockCode = headerRef

      const runH = int(row["Run-Time Hours"]) || 0
      const runM = int(row["Run-Time Minutes"]) || 0
      const runS = int(row["Run-Time Seconds"]) || 0
      const labH = int(row["Labour Hours"]) || 0
      const labM = int(row["Labour Minutes"]) || 0
      const labS = int(row["Labour Seconds"]) || 0

      const totalRunMin = runH * 60 + runM + runS / 60
      const totalLabMin = labH * 60 + labM + labS / 60

      // Parse subcontract breaks
      const breaks: any[] = []
      for (let i = 1; i <= 5; i++) {
        const from = dec(row[`Subcontract Quantity Break From ${i}`])
        const to = dec(row[`Subcontract Quantity Break To ${i}`])
        if (from !== null || to !== null) {
          breaks.push({
            from: from,
            to: to,
            cost: dec(row[`Subcontract Quantity Break Cost ${i}`]),
            ratePerItem: dec(row[`Subcontract Quantity Break Rate per Item ${i}`]),
            hoursOffsite: dec(row[`Subcontract Quantity Break Hours Offsite ${i}`]),
          })
        }
      }

      await client.query(
        `INSERT INTO sage_bom_operations (
          id, "headerRef", "stockCode", "sequenceNo", "operationRef", "operationDescription",
          "isSubcontract", "nonPrinting", shrinkage, "overlapPercent",
          "runTimeHours", "runTimeMinutes", "runTimeSeconds", "quantityPerRun",
          "delayHours", "delayMinutes", "delaySeconds",
          "setupHours", "setupMinutes", "setupSeconds", "setupRate",
          "labourRef", "labourDescription", "labourNotes", "labourRate",
          "labourHours", "labourMinutes", "labourSeconds",
          "setupLabourRef", "setupLabourDesc",
          "machineRef", "machineDescription", "machineNotes", "machineRate",
          "machineHours", "machineMinutes", "machineSeconds",
          "setupMachineRef", "setupMachineDesc",
          "toolingRef", "toolingDesc", "toolingCost", "toolingQty",
          "supplierAccountRef", "orderRef", "orderDetails", "leadTime",
          saturday, sunday, "subcontractBreaks",
          "labourIsResourceGroup", "machineIsResourceGroup", notes,
          "totalRunTimeMinutes", "totalLabourMinutes",
          "sourceFile", "importedAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,
          $40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,$56,NOW(),NOW()
        )`,
        [
          cuid(),                                            // $1  id
          headerRef,                                          // $2  headerRef
          stockCode,                                          // $3  stockCode
          int(row["Sequence Number"]) || 0,                   // $4  sequenceNo
          str(row["Operation Reference"]) || "UNKNOWN",       // $5  operationRef
          str(row["Operation Description"]),                  // $6  operationDescription
          bool(row["Subcontract"]),                           // $7  isSubcontract
          bool(row["Nonprinting"]),                           // $8  nonPrinting
          dec(row["Shrinkage"]),                              // $9  shrinkage
          dec(row["Overlap Percentage"]),                     // $10 overlapPercent
          runH,                                               // $11 runTimeHours
          runM,                                               // $12 runTimeMinutes
          runS,                                               // $13 runTimeSeconds
          int(row["Quantity Per Run"]) || 1,                  // $14 quantityPerRun
          int(row["Delay Hours"]) || 0,                       // $15 delayHours
          int(row["Delay Minutes"]) || 0,                     // $16 delayMinutes
          int(row["Delay Seconds"]) || 0,                     // $17 delaySeconds
          int(row["Setup Hours"]) || 0,                       // $18 setupHours
          int(row["Setup Minutes"]) || 0,                     // $19 setupMinutes
          int(row["Setup Seconds"]) || 0,                     // $20 setupSeconds
          dec(row["Setup Rate"]),                             // $21 setupRate
          str(row["Labour Reference"]),                       // $22 labourRef
          str(row["Labour Description"]),                     // $23 labourDescription
          str(row["Labour Notes"]),                           // $24 labourNotes
          dec(row["Labour Rate"]),                            // $25 labourRate
          labH,                                               // $26 labourHours
          labM,                                               // $27 labourMinutes
          labS,                                               // $28 labourSeconds
          str(row["Setup Labour Resource Reference"]),        // $29 setupLabourRef
          str(row["Setup Labour Resource Description"]),      // $30 setupLabourDesc
          str(row["Machine Reference"]),                      // $31 machineRef
          str(row["Machine Description"]),                    // $32 machineDescription
          str(row["Machine Notes"]),                          // $33 machineNotes
          dec(row["Machine Rate"]),                           // $34 machineRate
          int(row["Machine Hours"]) || 0,                     // $35 machineHours
          int(row["Machine Minutes"]) || 0,                   // $36 machineMinutes
          int(row["Machine Seconds"]) || 0,                   // $37 machineSeconds
          str(row["Setup Machine Resource Reference"]),       // $38 setupMachineRef
          str(row["Setup Machine Resource Description"]),     // $39 setupMachineDesc
          str(row["Tooling Resource Reference"]),             // $40 toolingRef
          str(row["Tooling Resource Description"]),           // $41 toolingDesc
          dec(row["Tooling Cost"]),                           // $42 toolingCost
          int(row["Tooling Quantity"]),                       // $43 toolingQty
          str(row["Supplier Account Reference"]),             // $44 supplierAccountRef
          str(row["Order Reference"]),                        // $45 orderRef
          str(row["Order Details"]),                          // $46 orderDetails
          int(row["Lead Time"]),                              // $47 leadTime
          bool(row["Saturday"]),                              // $48 saturday
          bool(row["Sunday"]),                                // $49 sunday
          breaks.length > 0 ? JSON.stringify(breaks) : null,  // $50 subcontractBreaks
          bool(row["LabourIsResourceGroup"]),                 // $51 labourIsResourceGroup
          bool(row["MachineIsResourceGroup"]),                // $52 machineIsResourceGroup
          str(row["Notes"]),                                  // $53 notes
          String(totalRunMin.toFixed(2)),                     // $54 totalRunTimeMinutes
          String(totalLabMin.toFixed(2)),                     // $55 totalLabourMinutes
          entry.file,                                         // $56 sourceFile
        ]
      )
      total++
    }
  }

  if (skipped > 0) console.log(`  Skipped ${skipped} operations (missing header)`)
  console.log(`  Total BOM operations inserted: ${total}`)
  return total
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect()

  try {
    console.log("Starting Sage BOM/BOO Import...")
    console.log(`Source directory: ${BOM_DIR}\n`)

    // Clear existing data (re-runnable)
    console.log("Clearing existing Sage data...")
    await client.query("DELETE FROM sage_bom_operations")
    await client.query("DELETE FROM sage_bom_components")
    await client.query("DELETE FROM sage_bom_headers")
    await client.query("DELETE FROM sage_stock_items")

    // Import in FK order
    const stockCount = await importStockItems(client)
    const mseCount = await importMseData(client)
    const headerCount = await importBomHeaders(client)
    const compCount = await importComponents(client)
    const opsCount = await importOperations(client)

    console.log("\n========== IMPORT COMPLETE ==========")
    console.log(`  Stock Items:     ${stockCount}`)
    console.log(`  MSE Merged:      ${mseCount}`)
    console.log(`  BOM Headers:     ${headerCount}`)
    console.log(`  BOM Components:  ${compCount}`)
    console.log(`  BOM Operations:  ${opsCount}`)
    console.log("=====================================\n")
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
