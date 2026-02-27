import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET() {
  const quotes = await prisma.quote.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      project: {
        select: { id: true, projectNumber: true, name: true },
      },
      createdBy: { select: { name: true } },
      _count: { select: { quoteLines: true } },
    },
  })
  return NextResponse.json(quotes)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Auto-generate quote number: Q-XXXXXX
  const lastQuote = await prisma.quote.findFirst({
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  })

  let nextNum = 1001
  if (lastQuote) {
    const match = lastQuote.quoteNumber.match(/Q-(\d+)/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const quote = await prisma.quote.create({
    data: {
      customerId: body.customerId,
      projectId: body.projectId || null,
      quoteNumber: `Q-${String(nextNum).padStart(4, "0")}`,
      subject: body.subject || null,
      notes: body.notes || null,
      createdById: body.createdById || null,
    },
  })

  revalidatePath("/quotes")
  revalidatePath("/finance")

  return NextResponse.json(quote, { status: 201 })
}
