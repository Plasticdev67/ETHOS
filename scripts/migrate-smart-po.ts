/**
 * Smart PO Migration Script
 *
 * Adds the bomLineId column to purchase_order_lines table
 * and the approvalThreshold column to purchase_orders table
 * to support BOM-linked purchase orders.
 *
 * Run with: npx tsx scripts/migrate-smart-po.ts
 */

import "dotenv/config"
import pg from "pg"

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log("Connected to database")
  console.log("Smart PO Migration — Starting...")
  console.log("================================\n")

  // Step 1: Add bom_line_id column to purchase_order_lines
  console.log("[1/3] Adding bom_line_id column to purchase_order_lines...")
  await client.query(`
    ALTER TABLE "purchase_order_lines"
    ADD COLUMN IF NOT EXISTS "bomLineId" TEXT
    REFERENCES "design_bom_lines"("id") ON DELETE SET NULL
  `)
  console.log("  -> bomLineId column added (or already exists)")

  // Step 2: Create index on bomLineId
  console.log("[2/3] Creating index on bomLineId...")
  await client.query(`
    CREATE INDEX IF NOT EXISTS "idx_po_lines_bom_line"
    ON "purchase_order_lines"("bomLineId")
  `)
  console.log("  -> Index idx_po_lines_bom_line created (or already exists)")

  // Step 3: Add approvalThreshold column to purchase_orders
  console.log("[3/3] Adding approvalThreshold column to purchase_orders...")
  await client.query(`
    ALTER TABLE "purchase_orders"
    ADD COLUMN IF NOT EXISTS "approvalThreshold" DECIMAL(12,2)
  `)
  console.log("  -> approvalThreshold column added (or already exists)")

  console.log("\n================================")
  console.log("Smart PO Migration — Complete!")
  console.log("\nNew columns:")
  console.log("  - purchase_order_lines.bomLineId (FK -> design_bom_lines.id)")
  console.log("  - purchase_orders.approvalThreshold (Decimal 12,2)")
  console.log("\nNew index:")
  console.log("  - idx_po_lines_bom_line on purchase_order_lines(bomLineId)")

  await client.end()
}

main().catch((e) => {
  console.error("\nMigration failed:", e)
  process.exit(1)
})
