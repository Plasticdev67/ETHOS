import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function POST(request: NextRequest) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("suppliers:create")
  if (denied) return denied

  try {
    const body = await request.json()

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        whatTheySupply: body.whatTheySupply || null,
        paymentTerms: body.paymentTerms || null,
        notes: body.notes || null,
      },
    })

    revalidatePath("/suppliers")
    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Failed to create supplier:", error)
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { purchaseOrders: true, contacts: true } },
    },
  })
  return NextResponse.json(suppliers)
}
