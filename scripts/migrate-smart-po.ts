/**
 * Smart PO Migration Script
 *
 * Adds the bomLineId column to purchase_order_lines table
 * and the approvalThreshold column to purchase_orders table
 * to support BOM-linked purchase orders.
 *
 * Run with: npx tsx scripts/migrate-smart-po.ts
 */

import { PrismaClient } from "../src/generated/prisma"

const prisma = new PrismaClient()

async function main() {
  console.log("Smart PO Migration — Starting...")
  console.log("================================\n")

  // Step 1: Add bom_line_id column to purchase_order_lines
  console.log("[1/3] Adding bom_line_id column to purchase_order_lines...")
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE purchase_order_lines
      ADD COLUMN IF NOT EXISTS bom_line_id TEXT
      REFERENCES design_bom_lines(id)
    `)
    console.log("  -> bom_line_id column added (or already exists)")
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("already exists")) {
      console.log("  -> bom_line_id column already exists, skipping")
    } else {
      console.error("  -> Error adding bom_line_id:", msg)
      throw error
    }
  }

  // Step 2: Create index on bom_line_id
  console.log("[2/3] Creating index on bom_line_id...")
  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_po_lines_bom_line
      ON purchase_order_lines(bom_line_id)
    `)
    console.log("  -> Index idx_po_lines_bom_line created (or already exists)")
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("already exists")) {
      console.log("  -> Index already exists, skipping")
    } else {
      console.error("  -> Error creating index:", msg)
      throw error
    }
  }

  // Step 3: Add approval_threshold column to purchase_orders
  console.log("[3/3] Adding approval_threshold column to purchase_orders...")
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE purchase_orders
      ADD COLUMN IF NOT EXISTS approval_threshold DECIMAL(12,2)
    `)
    console.log("  -> approval_threshold column added (or already exists)")
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("already exists")) {
      console.log("  -> approval_threshold column already exists, skipping")
    } else {
      console.error("  -> Error adding approval_threshold:", msg)
      throw error
    }
  }

  console.log("\n================================")
  console.log("Smart PO Migration — Complete!")
  console.log("\nNew columns:")
  console.log("  - purchase_order_lines.bom_line_id (FK -> design_bom_lines.id)")
  console.log("  - purchase_orders.approval_threshold (Decimal 12,2)")
  console.log("\nNew index:")
  console.log("  - idx_po_lines_bom_line on purchase_order_lines(bom_line_id)")
}

main()
  .catch((e) => {
    console.error("\nMigration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
