import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  const body = await request.json()

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
