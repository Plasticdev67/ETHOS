import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  // BOM headers with component counts
  const headers = await prisma.sageBomHeader.findMany({
    select: {
      headerRef: true,
      description: true,
      revision: true,
      _count: { select: { components: true } },
    },
    orderBy: { headerRef: "asc" },
  })
  console.log(`\n--- SAGE BOM HEADERS (${headers.length}) ---`)
  for (const h of headers) {
    console.log(
      `${h.headerRef} | ${h.description || "(no desc)"} | v${h.revision || "?"} | ${h._count.components} components`
    )
  }

  // Sample components for first 5 BOMs
  const sample = await prisma.sageBomHeader.findMany({
    take: 5,
    orderBy: { headerRef: "asc" },
    include: {
      components: {
        take: 8,
        orderBy: { sequenceNo: "asc" },
        include: { stockItem: { select: { name: true } } },
      },
    },
  })
  console.log("\n--- SAMPLE BOM COMPONENTS (first 5 BOMs, first 8 lines each) ---")
  for (const h of sample) {
    console.log(`\n${h.headerRef} — ${h.description || "(no desc)"}:`)
    for (const c of h.components) {
      console.log(
        `  #${c.sequenceNo} | ${c.stockCode} | ${c.stockItem?.name || c.description || "(no name)"} | qty: ${c.quantity}`
      )
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})
