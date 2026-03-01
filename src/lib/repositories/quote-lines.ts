/**
 * Repository for QuoteLine operations that trigger recursive type depth.
 *
 * QuoteLine → QuoteLineSpec → (catalogue chain) causes TypeScript to exceed
 * its recursion limit when resolving Prisma's update method signature.
 *
 * @see https://github.com/prisma/prisma/issues/14832
 */
import { prisma } from "@/lib/db"

/* ------------------------------------------------------------------ */
/*  Narrow delegate                                                   */
/* ------------------------------------------------------------------ */

interface QuoteLineDelegate {
  update(args: {
    where: { id: string }
    data: Record<string, unknown>
  }): Promise<unknown>
}

const quoteLines: QuoteLineDelegate =
  prisma.quoteLine as unknown as QuoteLineDelegate

/* ------------------------------------------------------------------ */
/*  Operations                                                        */
/* ------------------------------------------------------------------ */

/** Link a quote line to a product by ID */
export async function linkQuoteLineToProduct(
  quoteLineId: string,
  productId: string
): Promise<void> {
  await quoteLines.update({
    where: { id: quoteLineId },
    data: { productId },
  })
}
