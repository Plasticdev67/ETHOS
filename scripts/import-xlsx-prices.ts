import "dotenv/config"
import { prisma } from "../src/lib/db"
import * as XLSX from "xlsx"
import * as path from "path"

/**
 * Read Part Prices XLSX and match prices to BaseBomItems by stock code.
 */

const XLSX_PATH = path.resolve(
  __dirname,
  "../Parts/Part Prices - FD, FG, FGW.xlsx"
)

function normalise(s: string): string {
  return s.replace(/[^a-z0-9]/gi, "").toLowerCase()
}

async function main() {
  console.log("Reading XLSX:", XLSX_PATH)
  const workbook = XLSX.readFile(XLSX_PATH)

  // List all sheets
  console.log("Sheets:", workbook.SheetNames.join(", "))

  // Read all sheets and collect stock code -> price mappings
  const priceMap = new Map<string, { price: number; description: string; sheet: string }>()
  const descPriceMap = new Map<string, { price: number; code: string; sheet: string }>()

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

    if (rows.length === 0) continue

    // Show first row headers for debugging
    console.log(`\n--- Sheet: ${sheetName} (${rows.length} rows) ---`)
    console.log("Columns:", Object.keys(rows[0]).join(", "))
    console.log("First row:", JSON.stringify(rows[0], null, 2))

    for (const row of rows) {
      // Try to find stock code column
      const codeKey = Object.keys(row).find(
        (k) => /stock.?code|part.?code|code|reference|stock/i.test(k)
      )
      // Try to find price column
      const priceKey = Object.keys(row).find(
        (k) => /price|cost|unit.?cost|unit.?price|value/i.test(k)
      )
      // Try to find description column
      const descKey = Object.keys(row).find(
        (k) => /desc|description|name|item/i.test(k)
      )

      const code = codeKey ? String(row[codeKey] || "").trim() : ""
      const priceVal = priceKey ? row[priceKey] : null
      const desc = descKey ? String(row[descKey] || "").trim() : ""

      if (!code && !desc) continue

      const price = typeof priceVal === "number" ? priceVal : parseFloat(String(priceVal || "0"))
      if (isNaN(price) || price <= 0) continue

      if (code) {
        priceMap.set(code, { price, description: desc, sheet: sheetName })
      }
      if (desc) {
        descPriceMap.set(normalise(desc), { price, code, sheet: sheetName })
      }
    }
  }

  console.log(`\nBuilt price lookup: ${priceMap.size} by code, ${descPriceMap.size} by description`)

  // Show some samples
  console.log("\n--- Sample prices by code ---")
  let count = 0
  for (const [code, data] of priceMap) {
    if (count++ >= 15) break
    console.log(`  ${code} — £${data.price.toFixed(2)} — ${data.description}`)
  }

  // Get zero-price BOM items
  const zeroItems = await prisma.baseBomItem.findMany({
    where: { unitCost: 0 },
    select: { id: true, stockCode: true, description: true },
  })
  console.log(`\nBOM items at £0.00: ${zeroItems.length}`)

  // Match by stock code first, then by description
  let codeMatches = 0
  let descMatches = 0
  let unmatched = 0
  const updates: { id: string; price: number }[] = []
  const unmatchedCodes = new Set<string>()

  for (const item of zeroItems) {
    // Try exact code match
    if (item.stockCode) {
      const match = priceMap.get(item.stockCode)
      if (match) {
        updates.push({ id: item.id, price: match.price })
        codeMatches++
        continue
      }
    }

    // Try description match
    const descMatch = descPriceMap.get(normalise(item.description))
    if (descMatch) {
      updates.push({ id: item.id, price: descMatch.price })
      descMatches++
      continue
    }

    unmatched++
    unmatchedCodes.add(item.stockCode || item.description)
  }

  console.log(`\nMatch results:`)
  console.log(`  By stock code: ${codeMatches}`)
  console.log(`  By description: ${descMatches}`)
  console.log(`  Unmatched: ${unmatched}`)

  // Apply updates
  if (updates.length > 0) {
    console.log(`\nApplying ${updates.length} price updates...`)
    let applied = 0
    for (const { id, price } of updates) {
      await prisma.baseBomItem.update({
        where: { id },
        data: { unitCost: price },
      })
      applied++
    }
    console.log(`Updated ${applied} items`)
  }

  // Final state
  const finalZero = await prisma.baseBomItem.count({ where: { unitCost: 0 } })
  const total = await prisma.baseBomItem.count()
  console.log(`\n--- Final state ---`)
  console.log(`Total: ${total}`)
  console.log(`With price: ${total - finalZero}`)
  console.log(`Still £0.00: ${finalZero}`)

  if (unmatchedCodes.size > 0) {
    console.log(`\n--- Still unmatched (${unmatchedCodes.size} unique) ---`)
    for (const c of [...unmatchedCodes].sort()) {
      console.log(`  ${c}`)
    }
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
