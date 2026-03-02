import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { validateBody, isValidationError, customerCreateSchema } from "@/lib/api-validation"

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("customers:create")
  if (denied) return denied

  try {
    const body = await validateBody(request, customerCreateSchema)
    if (isValidationError(body)) return body

    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        customerType: body.customerType || "OTHER",
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        paymentTerms: body.paymentTerms || null,
        notes: body.notes || null,
      },
    })

    revalidatePath("/customers")
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Failed to create customer:", error)
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { projects: true, contacts: true } },
    },
  })
  return NextResponse.json(customers)
}
