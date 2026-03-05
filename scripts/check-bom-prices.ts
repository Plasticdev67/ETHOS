import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  const items = await prisma.baseBomItem.findMany({
    select: { id: true, description: true, stockCode: true, unitCost: true },
    orderBy: { description: "asc" },
  })

  const withCode = items.filter((i) => i.stockCode)
  const withoutCode = items.filter((i) => !i.stockCode)
  const withPrice = items.filter((i) => Number(i.unitCost) > 0)

  console.log("=== BOM ITEM PRICING REPORT ===")
  console.log("Total BOM items:", items.length)
  console.log("With stock code:", withCode.length)
  console.log("Without stock code:", withoutCode.length)
  console.log("With price > £0:", withPrice.length)
  console.log("With price = £0:", items.length - withPrice.length)

  console.log("\n--- Sample WITH stock codes ---")
  for (const i of withCode.slice(0, 15)) {
    console.log(`  ${i.stockCode} | ${i.description} | £${Number(i.unitCost).toFixed(2)}`)
  }

  console.log("\n--- Sample WITHOUT stock codes ---")
  for (const i of withoutCode.slice(0, 15)) {
    console.log(`  ${i.description} | £${Number(i.unitCost).toFixed(2)}`)
  }

  // Now check the part prices from import-part-prices.js against BOM items
  const priceData = [
    { code: "DXF-0000-00-SFD", desc: "Single Flood Door DXF Pack", price: 773.46 },
    { code: "FD-0003-FP", desc: "Trip Plate - 4 mm", price: 1.89 },
    { code: "FD-0005-FP", desc: "P Frame Cap - 3 mm", price: 1.24 },
    { code: "FD-0008-MP", desc: "Spring Collar - 30/17x10", price: 7.20 },
    { code: "FD-0009-FP", desc: "P Frame Corner Closer - 3 mm", price: 0.00 },
    { code: "FD-0011-FP", desc: "Rose for Pull Handle", price: 6.00 },
    { code: "FD-0015-FP", desc: "Security Door Cylinder Guard Tube", price: 0.91 },
    { code: "FD-0026-FP", desc: "Hinge Shroud C5 - 6 mm", price: 1.83 },
    { code: "FD-0037-FP", desc: "Lock Fixing Plate Rear - 5mm", price: 7.55 },
    { code: "FD-0040-FP", desc: "Lock Fixing Plate Front - 5mm", price: 4.18 },
    { code: "FD-0041-FP", desc: "Universal Door Closer Bracket Fire - 5 mm", price: 20.00 },
    { code: "PP-DF-0001-1", desc: "HD Bullet Hinge - Top", price: 6.00 },
    { code: "PP-DF-0001-2", desc: "HD Bullet Hinge - Bottom", price: 6.00 },
    { code: "PP-DF-0001-3", desc: "HD Bullet Hinge - Washer 22mm x 2mm", price: 0.45 },
    { code: "PP-DF-0010", desc: "Compression Spring", price: 1.53 },
    { code: "PP-DF-0015", desc: "LCN 4040XP Door Closer", price: 153.00 },
    { code: "PP-DF-0063", desc: "Pull Handle - S/S - 14 x 225mm", price: 6.00 },
    { code: "PP-SL216", desc: "S McGill 2-Point Lock", price: 1401.74 },
    { code: "PP-FIX-M10-0001", desc: "M10 x 100 Thunder Bolt", price: 0.72 },
    { code: "PP-FIX-M12-0004", desc: "M12 Hex Nut - A2", price: 0.18 },
    { code: "PP-FIX-M4-0001", desc: "M4 x 16 Button Head Bolt", price: 0.04 },
    { code: "PP-FIX-M6-0001", desc: "M6x16 Button Head Bolt", price: 0.23 },
    { code: "PP-FIX-M6-0004", desc: "M6 Washer - A2", price: 0.06 },
    { code: "PP-FIX-M6-0023", desc: "M6x10 CSK Bolt - A2", price: 0.06 },
    { code: "PP-FIX-M8-0001", desc: "M8 x 20 Button Head Bolt", price: 0.17 },
    { code: "PP-FIX-M8-0002", desc: "M8 x 30 Button Head Bolt", price: 0.15 },
    { code: "PP-FIX-M8-0003", desc: "M8 x 50 CSK Bolt", price: 0.29 },
    { code: "PP-FIX-M8-0006", desc: "M8 Washer - A2", price: 0.04 },
    { code: "RAW-CHS-0002", desc: "CHS 26.9 x 2mm", price: 14.70 },
    { code: "RAW-RHS-0002", desc: "RHS 50x30x3mm", price: 2.47 },
    { code: "RAW-SFP-0001", desc: "P Frame - 3 mm", price: 49.50 },
    { code: "RAW-SFP-0002", desc: "P Frame Closer - 100 mm x 3 mm", price: 19.14 },
    { code: "RAW-SHS-0001", desc: "SHS 50x50x3mm", price: 32.00 },
    { code: "SEAL-0031", desc: "38x35mm Black Closed Cell Neoprene/EPDM", price: 1.99 },
    { code: "FG-0104-FP", desc: "Earthing Lug - 50 mm x 50 mm x 10 mm", price: 2.74 },
    { code: "PP-FIX-M6-0011", desc: "M6 x 16 CSK Bolt", price: 0.06 },
  ]

  // Try matching by sageStockCode
  console.log("\n=== PRICE MATCHING: Part Prices vs BOM Items ===")
  let matchedByCode = 0
  let matchedByDesc = 0
  let noMatch = 0

  for (const p of priceData) {
    const byCode = items.find((i) => i.stockCode === p.code)
    if (byCode) {
      matchedByCode++
      console.log(`  ✓ CODE MATCH: ${p.code} → ${byCode.description} (current: £${Number(byCode.unitCost).toFixed(2)}, new: £${p.price.toFixed(2)})`)
      continue
    }
    // Try description match
    const byDesc = items.find((i) =>
      i.description.toLowerCase().includes(p.desc.toLowerCase().slice(0, 20))
    )
    if (byDesc) {
      matchedByDesc++
      console.log(`  ~ DESC MATCH: ${p.code} "${p.desc}" → "${byDesc.description}" (code: ${byDesc.sageStockCode || "NONE"})`)
    } else {
      noMatch++
      console.log(`  ✗ NO MATCH: ${p.code} "${p.desc}"`)
    }
  }

  console.log(`\nSummary: ${matchedByCode} code matches, ${matchedByDesc} description matches, ${noMatch} no match`)
  console.log(`Total prices available: 190 (in import-part-prices.js)`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})
