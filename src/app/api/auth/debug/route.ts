import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const checks: Record<string, string> = {}

  // Check env vars exist (don't reveal values)
  checks.DATABASE_URL = process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.length} chars)` : "MISSING"
  checks.AUTH_SECRET = process.env.AUTH_SECRET ? `set (${process.env.AUTH_SECRET.length} chars)` : "MISSING"
  checks.DIRECT_URL = process.env.DIRECT_URL ? `set (${process.env.DIRECT_URL.length} chars)` : "MISSING"

  // Test database connection
  try {
    const userCount = await prisma.user.count()
    checks.database = `connected (${userCount} users)`
  } catch (err) {
    checks.database = `FAILED: ${err instanceof Error ? err.message : String(err)}`
  }

  return NextResponse.json(checks)
}
