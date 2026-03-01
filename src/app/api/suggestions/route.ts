import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50")

  const where: Record<string, unknown> = {}
  if (category) where.category = category

  const suggestions = await prisma.suggestion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  })

  return NextResponse.json(suggestions)
}

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  const session = await auth()
  const userName = session?.user?.name || "Anonymous"
  const userId = (session?.user as { id?: string })?.id || null

  const body = await request.json()
  const { message, category } = body

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  const suggestion = await prisma.suggestion.create({
    data: {
      userId,
      userName,
      category: category || "General",
      message: message.trim(),
    },
  })

  return NextResponse.json(suggestion, { status: 201 })
}
