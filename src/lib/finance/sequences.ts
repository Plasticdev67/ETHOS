import { prisma } from '@/lib/db'

/**
 * Gets the next sequence number for a given sequence name.
 * Uses database-level locking to prevent duplicate numbers.
 */
export async function getNextSequenceNumber(name: string): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const counter = await tx.sequenceCounter.upsert({
      where: { name },
      create: { name, current: 1, prefix: getPrefix(name), padding: 6 },
      update: { current: { increment: 1 } },
    })

    const num = counter.current.toString().padStart(counter.padding, '0')
    return `${counter.prefix}${num}`
  })

  return result
}

function getPrefix(name: string): string {
  const prefixes: Record<string, string> = {
    journal: 'JNL-',
    sales_invoice: 'INV-',
    purchase_invoice: 'PIN-',
    purchase_order: 'PO-',
    credit_note: 'CN-',
    customer: 'CUST-',
    supplier: 'SUPP-',
    fixed_asset: 'FA-',
    quote: 'QT-',
    sales_order: 'SO-',
  }
  return prefixes[name] || ''
}
