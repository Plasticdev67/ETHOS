import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { prisma } from "@/lib/db"
import { compare } from "bcryptjs"

/**
 * POST /api/auth/verify-password
 * Verifies the current user's password. Used for sensitive operations
 * like BOM editing that require re-authentication.
 */
export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  try {
    const { password } = await request.json()
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password required" }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    })

    if (!dbUser?.passwordHash) {
      return NextResponse.json({ error: "Account has no password set" }, { status: 400 })
    }

    const isValid = await compare(password, dbUser.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    return NextResponse.json({ verified: true })
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
