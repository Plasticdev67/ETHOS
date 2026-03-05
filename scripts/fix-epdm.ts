import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  const result = await prisma.baseBomItem.updateMany({
    where: { OR: [{ stockCode: null }, { stockCode: "" }] },
    data: { stockCode: "RAW-SEAL-0026" },
  })
  console.log(`Updated ${result.count} items with stock code RAW-SEAL-0026`)

  const noCode = await prisma.baseBomItem.count({ where: { OR: [{ stockCode: null }, { stockCode: "" }] } })
  console.log(`Remaining without stock code: ${noCode}`)

  // Now check prices — how many at £0.00?
  const zeroPrice = await prisma.baseBomItem.count({ where: { unitCost: 0 } })
  const total = await prisma.baseBomItem.count()
  console.log(`\nTotal items: ${total}`)
  console.log(`With price > £0: ${total - zeroPrice}`)
  console.log(`Zero price: ${zeroPrice}`)

  // Get unique stock codes with zero price
  const zeroPriceItems = await prisma.baseBomItem.findMany({
    where: { unitCost: 0 },
    select: { stockCode: true, description: true },
    distinct: ["stockCode"],
    orderBy: { stockCode: "asc" },
  })
  console.log(`\n--- ${zeroPriceItems.length} unique stock codes at £0.00 ---`)
  for (const item of zeroPriceItems) {
    console.log(`  ${item.stockCode || "(none)"} — ${item.description}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
