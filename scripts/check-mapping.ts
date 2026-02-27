import pg from "pg"
import dotenv from "dotenv"
dotenv.config()
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
async function main() {
  const c = await pool.connect()
  try {
    const vars = await c.query("SELECT code, name FROM product_variants ORDER BY code")
    console.log("=== Product Variant Codes ===")
    vars.rows.forEach((r: any) => console.log("  " + r.code + ": " + r.name))

    const heads = await c.query(`SELECT "headerRef", description FROM sage_bom_headers ORDER BY "headerRef"`)
    console.log("\n=== BOM Header References ===")
    heads.rows.forEach((r: any) => console.log("  " + r.headerRef + ": " + r.description))

    const bom = await c.query("SELECT COUNT(*)::int as c FROM base_bom_items")
    console.log("\nBaseBomItem count: " + bom.rows[0].c)

    // Finished goods stock items
    const fg = await c.query(`SELECT "stockCode", name FROM sage_stock_items WHERE "productGroup" LIKE 'FG-%' ORDER BY "stockCode"`)
    console.log("\n=== Finished Goods Stock Codes ===")
    fg.rows.forEach((r: any) => console.log("  " + r.stockCode + ": " + r.name))
  } finally { c.release(); await pool.end() }
}
main().catch(console.error)
