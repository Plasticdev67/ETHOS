import "dotenv/config"
import { prisma } from "../src/lib/db"
import * as fs from "fs"
import * as path from "path"

/**
 * Match stock codes from Bom Database Component CSVs to BaseBomItems
 * that currently have no stock code.
 */

const BOM_DIR = path.resolve(__dirname, "../Bom Database")
const CSV_FILES = [
  "Component Header CVS MME Jan26 (Flood Door Combined).csv",
  "Component Header CVS MME Jan26 (Flood Gate Combined).csv",
  "Component Header CVS MME Jan26 (Flood Glazing Wall Combined).csv",
]

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

function normalise(s: string): string {
  return s.replace(/[^a-z0-9]/gi, "").toLowerCase()
}

async function main() {
  // Build lookup: description -> stock code from CSV files
  const descToCode = new Map<string, string>()
  const normDescToCode = new Map<string, string>()

  for (const file of CSV_FILES) {
    const filePath = path.join(BOM_DIR, file)
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping missing file: ${file}`)
      continue
    }
    const rows = parseCSV(fs.readFileSync(filePath, "utf-8"))
    console.log(`${file}: ${rows.length} rows`)

    for (const row of rows) {
      const code = row["Stock Code"]
      const desc = row["Description"]
      if (code && desc) {
        descToCode.set(desc, code)
        normDescToCode.set(normalise(desc), code)
      }
    }
  }

  console.log(`\nBuilt lookup with ${descToCode.size} exact descriptions, ${normDescToCode.size} normalised`)

  // Get all BOM items with no stock code
  const noCodeItems = await prisma.baseBomItem.findMany({
    where: { OR: [{ stockCode: null }, { stockCode: "" }] },
    select: { id: true, description: true, unitCost: true },
  })
  console.log(`\nBOM items with no stock code: ${noCodeItems.length}`)

  // Match
  let exactMatches = 0
  let normMatches = 0
  let unmatched = 0
  const unmatchedDescs = new Set<string>()
  const updates: { id: string; stockCode: string }[] = []

  for (const item of noCodeItems) {
    // Try exact match first
    const exactCode = descToCode.get(item.description)
    if (exactCode) {
      updates.push({ id: item.id, stockCode: exactCode })
      exactMatches++
      continue
    }

    // Try normalised match
    const normCode = normDescToCode.get(normalise(item.description))
    if (normCode) {
      updates.push({ id: item.id, stockCode: normCode })
      normMatches++
      continue
    }

    unmatched++
    unmatchedDescs.add(item.description)
  }

  console.log(`\nMatch results:`)
  console.log(`  Exact matches: ${exactMatches}`)
  console.log(`  Normalised matches: ${normMatches}`)
  console.log(`  Unmatched: ${unmatched} (${unmatchedDescs.size} unique descriptions)`)

  if (unmatchedDescs.size > 0) {
    console.log(`\n--- Still unmatched descriptions ---`)
    for (const d of [...unmatchedDescs].sort()) {
      console.log(`  ${d}`)
    }
  }

  // Apply updates
  if (updates.length > 0) {
    console.log(`\nApplying ${updates.length} stock code updates...`)
    let applied = 0
    for (const { id, stockCode } of updates) {
      await prisma.baseBomItem.update({
        where: { id },
        data: { stockCode },
      })
      applied++
    }
    console.log(`Updated ${applied} items with stock codes`)
  }

  // Now check price coverage — how many still have £0.00?
  const zeroPriceCount = await prisma.baseBomItem.count({ where: { unitCost: 0 } })
  const noCodeCount = await prisma.baseBomItem.count({ where: { OR: [{ stockCode: null }, { stockCode: "" }] } })
  const total = await prisma.baseBomItem.count()
  console.log(`\n--- Final state ---`)
  console.log(`Total items: ${total}`)
  console.log(`With stock code: ${total - noCodeCount}`)
  console.log(`No stock code: ${noCodeCount}`)
  console.log(`Zero price: ${zeroPriceCount}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
