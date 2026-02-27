import pg from "pg"
import dotenv from "dotenv"
dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const client = await pool.connect()
  try {
    // Totals
    const counts = await client.query(`
      SELECT 'sage_stock_items' as t, COUNT(*)::int as c FROM sage_stock_items
      UNION ALL SELECT 'sage_bom_headers', COUNT(*)::int FROM sage_bom_headers
      UNION ALL SELECT 'sage_bom_components', COUNT(*)::int FROM sage_bom_components
      UNION ALL SELECT 'sage_bom_operations', COUNT(*)::int FROM sage_bom_operations
    `)
    console.log("=== TOTALS ===")
    for (const r of counts.rows) console.log(`  ${r.t}: ${r.c}`)

    // By product group
    const groups = await client.query(`
      SELECT "productGroup", COUNT(*)::int as c FROM sage_stock_items
      GROUP BY "productGroup" ORDER BY c DESC
    `)
    console.log("\n=== BY PRODUCT GROUP ===")
    for (const r of groups.rows) console.log(`  ${r.productGroup || "(null)"}: ${r.c}`)

    // By product family
    const fam = await client.query(`
      SELECT "productFamily", COUNT(*)::int as c FROM sage_stock_items
      WHERE "productFamily" IS NOT NULL
      GROUP BY "productFamily" ORDER BY c DESC
    `)
    console.log("\n=== BY PRODUCT FAMILY ===")
    for (const r of fam.rows) console.log(`  ${r.productFamily}: ${r.c}`)

    // Top BOMs
    const topBom = await client.query(`
      SELECT h."headerRef", h.description, COUNT(c.id)::int as n
      FROM sage_bom_headers h
      JOIN sage_bom_components c ON c."headerRef" = h."headerRef"
      GROUP BY h."headerRef", h.description
      ORDER BY n DESC LIMIT 5
    `)
    console.log("\n=== TOP 5 BOMS BY COMPONENT COUNT ===")
    for (const r of topBom.rows) console.log(`  ${r.headerRef} (${r.description}): ${r.n} parts`)

    // Labour hours by operation
    const ops = await client.query(`
      SELECT "operationRef",
        COUNT(*)::int as cnt,
        ROUND(SUM("totalLabourMinutes"::numeric) / 60, 1) as hrs
      FROM sage_bom_operations
      GROUP BY "operationRef"
      ORDER BY hrs DESC
    `)
    console.log("\n=== LABOUR HOURS BY OPERATION ===")
    for (const r of ops.rows) console.log(`  ${r.operationRef}: ${r.hrs} hrs (${r.cnt} entries)`)

    // Sample stock item
    const sample = await client.query(`
      SELECT "stockCode", name, "productFamily", "productGroup", "materialComposition", "bomItemType"
      FROM sage_stock_items WHERE "productFamily" = 'Flood Door' LIMIT 3
    `)
    console.log("\n=== SAMPLE FLOOD DOOR ITEMS ===")
    for (const r of sample.rows) console.log(`  ${r.stockCode}: ${r.name} [${r.productGroup}] mat=${r.materialComposition} bomType=${r.bomItemType}`)

  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(console.error)
