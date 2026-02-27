import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
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
