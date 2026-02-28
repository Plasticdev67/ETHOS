/**
 * Procurement Enquiry / RFQ Schema Migration
 * Creates tables for procurement enquiries, enquiry lines, responses, and response lines.
 * Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
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

  // ============================================================
  // STEP 1: Create enum types
  // ============================================================
  console.log("\n--- Creating enum types ---")

  const enums: [string, string[]][] = [
    ["EnquiryStatus", ["DRAFT", "SENT", "PARTIALLY_RESPONDED", "ALL_RESPONDED", "AWARDED", "CANCELLED"]],
    ["EnquiryResponseStatus", ["PENDING", "QUOTED", "DECLINED", "AWARDED"]],
  ]

  for (const [name, values] of enums) {
    try {
      await client.query(
        `CREATE TYPE "${name}" AS ENUM (${values.map((v) => `'${v}'`).join(", ")})`
      )
      console.log(`  Created enum: ${name}`)
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code === "42710") {
        console.log(`  Enum already exists: ${name}`)
      } else {
        throw e
      }
    }
  }

  // ============================================================
  // STEP 2: Create procurement_enquiries table
  // ============================================================
  console.log("\n--- Creating procurement_enquiries table ---")

  await client.query(`
    CREATE TABLE IF NOT EXISTS "procurement_enquiries" (
      "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "enquiryNumber"   TEXT NOT NULL,
      "projectId"       TEXT NOT NULL,
      "subject"         TEXT NOT NULL,
      "notes"           TEXT,
      "status"          "EnquiryStatus" NOT NULL DEFAULT 'DRAFT',
      "createdById"     TEXT,
      "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "sentAt"          TIMESTAMP(3),

      CONSTRAINT "procurement_enquiries_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "procurement_enquiries_enquiryNumber_key" UNIQUE ("enquiryNumber")
    )
  `)
  console.log("  Created table: procurement_enquiries")

  // ============================================================
  // STEP 3: Create enquiry_lines table
  // ============================================================
  console.log("\n--- Creating enquiry_lines table ---")

  await client.query(`
    CREATE TABLE IF NOT EXISTS "enquiry_lines" (
      "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "enquiryId"   TEXT NOT NULL,
      "bomLineId"   TEXT,
      "description" TEXT NOT NULL,
      "partNumber"  TEXT,
      "quantity"    DECIMAL(10,2) NOT NULL,
      "unit"        TEXT NOT NULL DEFAULT 'each',
      "notes"       TEXT,
      "sortOrder"   INTEGER NOT NULL DEFAULT 0,

      CONSTRAINT "enquiry_lines_pkey" PRIMARY KEY ("id")
    )
  `)
  console.log("  Created table: enquiry_lines")

  // ============================================================
  // STEP 4: Create enquiry_responses table
  // ============================================================
  console.log("\n--- Creating enquiry_responses table ---")

  await client.query(`
    CREATE TABLE IF NOT EXISTS "enquiry_responses" (
      "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "enquiryId"     TEXT NOT NULL,
      "supplierId"    TEXT NOT NULL,
      "status"        "EnquiryResponseStatus" NOT NULL DEFAULT 'PENDING',
      "emailSentAt"   TIMESTAMP(3),
      "respondedAt"   TIMESTAMP(3),
      "totalQuoted"   DECIMAL(12,2),
      "leadTimeDays"  INTEGER,
      "validUntil"    TIMESTAMP(3),
      "notes"         TEXT,
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "enquiry_responses_pkey" PRIMARY KEY ("id")
    )
  `)
  console.log("  Created table: enquiry_responses")

  // ============================================================
  // STEP 5: Create enquiry_response_lines table
  // ============================================================
  console.log("\n--- Creating enquiry_response_lines table ---")

  await client.query(`
    CREATE TABLE IF NOT EXISTS "enquiry_response_lines" (
      "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "responseId"      TEXT NOT NULL,
      "enquiryLineId"   TEXT NOT NULL,
      "unitPrice"       DECIMAL(12,2),
      "totalPrice"      DECIMAL(12,2),
      "leadTimeDays"    INTEGER,
      "notes"           TEXT,
      "available"       BOOLEAN NOT NULL DEFAULT true,

      CONSTRAINT "enquiry_response_lines_pkey" PRIMARY KEY ("id")
    )
  `)
  console.log("  Created table: enquiry_response_lines")

  // ============================================================
  // STEP 6: Add foreign key constraints
  // ============================================================
  console.log("\n--- Adding foreign key constraints ---")

  const fks: [string, string, string, string, string][] = [
    // [constraint_name, table, column, ref_table, ref_column]
    ["procurement_enquiries_projectId_fkey", "procurement_enquiries", "projectId", "projects", "id"],
    ["procurement_enquiries_createdById_fkey", "procurement_enquiries", "createdById", "users", "id"],
    ["enquiry_lines_enquiryId_fkey", "enquiry_lines", "enquiryId", "procurement_enquiries", "id"],
    ["enquiry_lines_bomLineId_fkey", "enquiry_lines", "bomLineId", "design_bom_lines", "id"],
    ["enquiry_responses_enquiryId_fkey", "enquiry_responses", "enquiryId", "procurement_enquiries", "id"],
    ["enquiry_responses_supplierId_fkey", "enquiry_responses", "supplierId", "suppliers", "id"],
    ["enquiry_response_lines_responseId_fkey", "enquiry_response_lines", "responseId", "enquiry_responses", "id"],
    ["enquiry_response_lines_enquiryLineId_fkey", "enquiry_response_lines", "enquiryLineId", "enquiry_lines", "id"],
  ]

  for (const [name, table, col, refTable, refCol] of fks) {
    try {
      await client.query(`
        ALTER TABLE "${table}"
        ADD CONSTRAINT "${name}"
        FOREIGN KEY ("${col}") REFERENCES "${refTable}"("${refCol}")
        ${col === "enquiryId" || col === "responseId" ? "ON DELETE CASCADE" : "ON DELETE SET NULL"}
      `)
      console.log(`  Added FK: ${name}`)
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code === "42710") {
        console.log(`  FK already exists: ${name}`)
      } else {
        throw e
      }
    }
  }

  // ============================================================
  // STEP 7: Create indexes on foreign keys
  // ============================================================
  console.log("\n--- Creating indexes ---")

  const indexes: [string, string, string][] = [
    ["procurement_enquiries_projectId_idx", "procurement_enquiries", "projectId"],
    ["procurement_enquiries_status_idx", "procurement_enquiries", "status"],
    ["enquiry_lines_enquiryId_idx", "enquiry_lines", "enquiryId"],
    ["enquiry_responses_enquiryId_idx", "enquiry_responses", "enquiryId"],
    ["enquiry_responses_supplierId_idx", "enquiry_responses", "supplierId"],
    ["enquiry_response_lines_responseId_idx", "enquiry_response_lines", "responseId"],
    ["enquiry_response_lines_enquiryLineId_idx", "enquiry_response_lines", "enquiryLineId"],
  ]

  for (const [name, table, col] of indexes) {
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" ("${col}")`)
      console.log(`  Created index: ${name}`)
    } catch (e: unknown) {
      console.log(`  Index issue: ${name} — ${(e as Error).message}`)
    }
  }

  // ============================================================
  // STEP 8: Add sequence counter for ENQ- numbers
  // ============================================================
  console.log("\n--- Adding sequence counter ---")

  try {
    await client.query(`
      INSERT INTO "sequence_counters" ("id", "name", "current", "prefix", "padding")
      VALUES (gen_random_uuid()::text, 'enquiry', 0, 'ENQ-', 6)
      ON CONFLICT ("name") DO NOTHING
    `)
    console.log("  Added sequence counter: enquiry (ENQ-000001)")
  } catch (e: unknown) {
    console.log(`  Sequence counter issue: ${(e as Error).message}`)
  }

  // ============================================================
  // DONE
  // ============================================================
  console.log("\n=== Migration complete ===")
  await client.end()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
