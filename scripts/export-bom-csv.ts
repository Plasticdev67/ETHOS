/**
 * Export a variant's BOM to CSV for scaling flag markup.
 * Usage: npx tsx scripts/export-bom-csv.ts SFD-0001
 */
import "dotenv/config"
import { prisma } from "../src/lib/db"
import { writeFileSync } from "fs"
import { join } from "path"

async function main() {
  const code = process.argv[2]
  if (!code) {
    console.error("Usage: npx tsx scripts/export-bom-csv.ts <VARIANT_CODE>")
    process.exit(1)
  }

  const variant = await prisma.productVariant.findFirst({
    where: { code },
    include: {
      baseBomItems: { orderBy: { description: "asc" } },
      type: { include: { family: true } },
    },
  })

  if (!variant) {
    console.error(`Variant "${code}" not found`)
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log(`${variant.type.family.name} > ${variant.type.name} > ${variant.code} — ${variant.name}`)
  console.log(`BOM items: ${variant.baseBomItems.length}`)

  const rows: string[] = ["Description,Qty,Unit Cost,Stock Code,Scaling"]
  for (const item of variant.baseBomItems) {
    const desc = `"${item.description.replace(/"/g, '""')}"`
    const cost = Number(item.unitCost) || 0
    rows.push(`${desc},${item.quantity},${cost.toFixed(2)},${item.sageStockCode || ""},FIXED`)
  }

  const outPath = join(__dirname, "..", `${code}-BOM-Scaling.csv`)
  writeFileSync(outPath, rows.join("\n"), "utf-8")
  console.log(`\nExported to: ${outPath}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})
