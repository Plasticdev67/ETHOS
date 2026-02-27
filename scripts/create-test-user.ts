import "dotenv/config"
import pg from "pg"
import { hash } from "bcryptjs"
import crypto from "crypto"

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const passwordHash = await hash("Test1234", 10)
  const id = crypto.randomBytes(12).toString("hex")

  await pool.query(
    `INSERT INTO users (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET "passwordHash" = $4`,
    [id, "Test User", "test@mme.co.uk", passwordHash, "ADMIN"]
  )

  console.log("Test account created:")
  console.log("  Email:    test@mme.co.uk")
  console.log("  Password: Test1234")
  console.log("  Role:     ADMIN")

  await pool.end()
}

main().catch(console.error)
