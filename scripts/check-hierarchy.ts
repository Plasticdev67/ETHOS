import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  const families = await prisma.productFamily.findMany({
    include: {
      types: {
        include: {
          variants: {
            select: { id: true, sageStockCode: true, code: true, name: true },
            take: 5,
          },
          _count: { select: { variants: true } },
        },
        take: 6,
        orderBy: { code: "asc" },
      },
      _count: { select: { types: true } },
    },
    orderBy: { name: "asc" },
  })

  for (const f of families) {
    console.log(`\nFAMILY: ${f.name} (${f.code}) — ${f._count.types} types`)
    for (const t of f.types) {
      console.log(`  TYPE: ${t.code} — ${t.name} — ${t._count.variants} variants`)
      for (const v of t.variants) {
        console.log(`    VARIANT (BOM): ${v.sageStockCode ?? v.code} | ${v.name}`)
      }
      if (t._count.variants > 5) console.log(`    ... and ${t._count.variants - 5} more`)
    }
    if (f._count.types > 6) console.log(`  ... and ${f._count.types - 6} more types`)
  }

  await prisma.$disconnect()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
