import { prisma } from "@/lib/db"
import { hash } from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

// Temporary endpoint to set passwords — remove after initial setup
export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  const passwordHash = await hash(password, 12)

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    })
    return NextResponse.json({ success: true, name: user.name })
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
}
