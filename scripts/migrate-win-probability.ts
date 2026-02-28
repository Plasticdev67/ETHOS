/**
 * DB Migration: Add winProbability column to opportunities table
 * Sets values based on existing status:
 *   ACTIVE_LEAD → 10, PENDING_APPROVAL → 30, QUOTED → 50,
 *   WON → 100, LOST → 0, DEAD_LEAD → 0
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

  // Add column if not exists
  await client.query(`
    ALTER TABLE "opportunities"
    ADD COLUMN IF NOT EXISTS "winProbability" INTEGER NOT NULL DEFAULT 10
  `)
  console.log("Added winProbability column (default 10)")

  // Set values based on existing status
  const updates = [
    { status: "DEAD_LEAD", probability: 0 },
    { status: "ACTIVE_LEAD", probability: 10 },
    { status: "PENDING_APPROVAL", probability: 30 },
    { status: "QUOTED", probability: 50 },
    { status: "WON", probability: 100 },
    { status: "LOST", probability: 0 },
  ]

  for (const { status, probability } of updates) {
    const result = await client.query(
      `UPDATE "opportunities" SET "winProbability" = $1 WHERE "status" = $2`,
      [probability, status]
    )
    console.log(`  ${status} → ${probability}%: ${result.rowCount} rows updated`)
  }

  // Verify
  const counts = await client.query(
    `SELECT status, "winProbability", COUNT(*) as cnt FROM "opportunities" GROUP BY status, "winProbability" ORDER BY status`
  )
  console.log("\nVerification:")
  for (const row of counts.rows) {
    console.log(`  ${row.status}: ${row.winProbability}% (${row.cnt} rows)`)
  }

  await client.end()
  console.log("\nDone!")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
