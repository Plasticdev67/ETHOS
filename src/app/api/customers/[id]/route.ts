import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      _count: { select: { projects: true, quotes: true, contacts: true } },
    },
  })

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  // Disconnect projects (set customerId to null) rather than cascade-deleting them
  if (customer._count.projects > 0) {
    await prisma.project.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    })
  }

  // Delete quote-related data then quotes (customerId is required on Quote)
  if (customer._count.quotes > 0) {
    const quoteIds = await prisma.quote.findMany({
      where: { customerId: id },
      select: { id: true },
    })
    const ids = quoteIds.map((q) => q.id)

    // Delete quote line specs, then quote lines, then quotes
    await prisma.quoteLineSpec.deleteMany({
      where: { quoteLine: { quoteId: { in: ids } } },
    })
    await prisma.quoteLine.deleteMany({
      where: { quoteId: { in: ids } },
    })
    await prisma.quote.deleteMany({
      where: { customerId: id },
    })
  }

  // Delete contacts (owned by customer)
  if (customer._count.contacts > 0) {
    await prisma.customerContact.deleteMany({
      where: { customerId: id },
    })
  }

  // Delete portal tokens
  await prisma.customerPortalToken.deleteMany({
    where: { customerId: id },
  })

  // Clear prospect conversion reference
  await prisma.prospect.updateMany({
    where: { convertedCustomerId: id },
    data: { convertedCustomerId: null },
  })

  // Delete the customer
  await prisma.customer.delete({
    where: { id },
  })

  await logAudit({
    action: "DELETE",
    entity: "Customer",
    entityId: id,
    metadata: `Deleted customer: ${customer.name}`,
  })

  revalidatePath("/customers")
  return NextResponse.json({ success: true })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: true,
      _count: { select: { projects: true, quotes: true, contacts: true } },
    },
  })

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  return NextResponse.json(customer)
}
