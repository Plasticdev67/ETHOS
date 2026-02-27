import pg from "pg"
import dotenv from "dotenv"
dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const c = await pool.connect()
  try {
    const tables = ["product_catalogue", "product_families", "product_types", "product_variants", "sage_stock_items"]
    for (const t of tables) {
      const r = await c.query(`SELECT COUNT(*)::int as c FROM ${t}`)
      console.log(`${t}: ${r.rows[0].c}`)
    }

    // Check if families have data
    const fam = await c.query(`SELECT id, name, code, active FROM product_families ORDER BY name`)
    console.log("\nProduct Families:", JSON.stringify(fam.rows, null, 2))

    const types = await c.query(`SELECT id, name, code, "familyId", active FROM product_types LIMIT 10`)
    console.log("\nProduct Types (first 10):", JSON.stringify(types.rows, null, 2))

    const variants = await c.query(`SELECT id, name, code, "typeId", active FROM product_variants LIMIT 10`)
    console.log("\nProduct Variants (first 10):", JSON.stringify(variants.rows, null, 2))

    // Check sage finished goods that could be in catalogue
    const fg = await c.query(`
      SELECT "stockCode", name, "productFamily", "productGroup"
      FROM sage_stock_items
      WHERE "productGroup" LIKE 'FG-%'
      ORDER BY "stockCode"
      LIMIT 20
    `)
    console.log("\nSage Finished Goods (FG-*):", JSON.stringify(fg.rows, null, 2))
  } finally {
    c.release()
    await pool.end()
  }
}

main().catch(console.error)
