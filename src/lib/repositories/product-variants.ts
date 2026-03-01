/**
 * Repository for ProductVariant queries that trigger recursive type depth.
 *
 * ProductVariant sits in the recursive chain:
 * ProductVariant → BaseBomItem → SpecBomModifier → SpecChoice → SpecField → ProductType
 *
 * Even simple findFirst/findMany calls trigger "excessive stack depth" on
 * clean builds. This module provides narrowed delegates for safe usage.
 *
 * @see https://github.com/prisma/prisma/issues/14832
 */
import { prisma } from "@/lib/db"

/* ------------------------------------------------------------------ */
/*  Return types                                                      */
/* ------------------------------------------------------------------ */

export interface VariantWithBom {
  id: string
  baseBomItems: Array<{
    description: string
    category: string
    stockCode: string | null
    unitCost: unknown
    quantity: unknown
    sortOrder: number
  }>
}

/* ------------------------------------------------------------------ */
/*  Narrow delegate                                                   */
/* ------------------------------------------------------------------ */

interface ProductVariantDelegate {
  findMany(args: Record<string, unknown>): Promise<VariantWithBom[]>
  findFirst(args: Record<string, unknown>): Promise<VariantWithBom | null>
}

const productVariants: ProductVariantDelegate =
  prisma.productVariant as unknown as ProductVariantDelegate

/* ------------------------------------------------------------------ */
/*  Query operations                                                  */
/* ------------------------------------------------------------------ */

/** Find variants with BOM items for a catalogue item */
export async function findVariantsWithBom(
  catalogueItemId: string,
  take?: number
): Promise<VariantWithBom[]> {
  return productVariants.findMany({
    where: { catalogueItemId },
    include: { baseBomItems: { orderBy: { sortOrder: "asc" } } },
    ...(take ? { take } : {}),
  })
}

/** Find the first variant with BOM items for a given product type */
export async function findFirstVariantWithBom(
  typeId: string
): Promise<VariantWithBom | null> {
  return productVariants.findFirst({
    where: { typeId },
    include: { baseBomItems: { orderBy: { sortOrder: "asc" } } },
  })
}
