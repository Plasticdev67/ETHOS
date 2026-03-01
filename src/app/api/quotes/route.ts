import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { validateBody, isValidationError, quoteCreateSchema } from "@/lib/api-validation"
import { getNextSequenceNumber } from "@/lib/finance/sequences"

export async function GET() {
  try {
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
  } catch (error) {
    console.error("Failed to fetch quotes:", error)
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("quotes:create")
    if (denied) return denied

    const data = await validateBody(request, quoteCreateSchema)
    if (isValidationError(data)) return data

    // Concurrency-safe quote number generation
    const quoteNumber = await getNextSequenceNumber("quote")

    const quote = await prisma.quote.create({
      data: {
        customerId: data.customerId,
        projectId: data.projectId || null,
        quoteNumber,
        subject: data.subject || null,
        notes: data.notes || null,
        createdById: data.createdById || null,
      },
    })

    revalidatePath("/quotes")
    revalidatePath("/finance")

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error("Failed to create quote:", error)
    return NextResponse.json(
      { error: "Failed to create quote" },
      { status: 500 }
    )
  }
}
