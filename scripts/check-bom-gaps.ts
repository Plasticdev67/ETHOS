import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  const total = await prisma.baseBomItem.count()
  const noCode = await prisma.baseBomItem.count({ where: { OR: [{ stockCode: null }, { stockCode: "" }] } })
  const zeroPrice = await prisma.baseBomItem.count({ where: { unitCost: 0 } })
  const noCodeAndZero = await prisma.baseBomItem.count({
    where: { AND: [{ OR: [{ stockCode: null }, { stockCode: "" }] }, { unitCost: 0 }] },
  })

  console.log(`Total BOM items: ${total}`)
  console.log(`With stock code: ${total - noCode}`)
  console.log(`No stock code: ${noCode}`)
  console.log(`Zero price: ${zeroPrice}`)
  console.log(`No code AND zero price: ${noCodeAndZero}`)

  // Unique descriptions with no stock code
  const missing = await prisma.baseBomItem.findMany({
    where: { OR: [{ stockCode: null }, { stockCode: "" }] },
    select: { description: true, category: true, unitCost: true },
    distinct: ["description"],
    orderBy: { description: "asc" },
  })
  console.log(`\n--- ${missing.length} unique descriptions with no stock code ---`)
  for (const m of missing) {
    const price = Number(m.unitCost)
    console.log(`  [${m.category}] ${m.description}${price > 0 ? ` (£${price.toFixed(2)})` : ""}`)
  }

  // Items WITH stock codes - sample
  const withCode = await prisma.baseBomItem.findMany({
    where: { NOT: { OR: [{ stockCode: null }, { stockCode: "" }] } },
    select: { stockCode: true, description: true, unitCost: true },
    distinct: ["stockCode"],
    orderBy: { stockCode: "asc" },
    take: 20,
  })
  console.log(`\n--- Sample items WITH stock codes (first 20) ---`)
  for (const w of withCode) {
    console.log(`  ${w.stockCode} — ${w.description} (£${Number(w.unitCost).toFixed(2)})`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
