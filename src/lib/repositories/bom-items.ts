/**
 * Repository for BaseBomItem CRUD operations.
 *
 * Isolates Prisma calls for this model into a dedicated module to resolve
 * TypeScript's "excessive stack depth" error. The recursive type chain
 * (BaseBomItem → SpecBomModifier → SpecChoice → SpecField → ProductType)
 * causes TypeScript to hit its recursion limit when resolving Prisma's
 * create/update method signatures inline in Next.js route handlers.
 *
 * By moving the operations here with explicit return types and plain input
 * types, TypeScript resolves the Prisma types only at this module boundary.
 * Route handlers never import or reference Prisma model types directly.
 *
 * @see https://github.com/prisma/prisma/issues/14832
 */
import { prisma } from "@/lib/db"
import type { Prisma } from "@/generated/prisma/client"

/* ------------------------------------------------------------------ */
/*  Plain input types — safe to import from route handlers             */
/* ------------------------------------------------------------------ */

export interface BomItemCreateInput {
  variantId: string
  description: string
  category?: string
  stockCode?: string | null
  unitCost: Prisma.Decimal | number | string
  quantity: Prisma.Decimal | number | string
  scalesWithSize?: boolean
  sortOrder?: number
}

export interface BomItemUpdateInput {
  description?: string
  category?: string
  stockCode?: string | null
  unitCost?: Prisma.Decimal | number | string
  quantity?: Prisma.Decimal | number | string
  scalesWithSize?: boolean
  sortOrder?: number
}

/* ------------------------------------------------------------------ */
/*  Select & return type                                              */
/* ------------------------------------------------------------------ */

/** Flat select — excludes relations to prevent recursive type inference */
const FLAT_SELECT = {
  id: true,
  variantId: true,
  description: true,
  category: true,
  stockCode: true,
  unitCost: true,
  quantity: true,
  scalesWithSize: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const

/** Return type — resolved once at this module boundary, not in route handlers */
export type BomItem = Prisma.BaseBomItemGetPayload<{ select: typeof FLAT_SELECT }>

/* ------------------------------------------------------------------ */
/*  CRUD operations                                                   */
/* ------------------------------------------------------------------ */

export async function createBomItem(input: BomItemCreateInput): Promise<BomItem> {
  const data: Prisma.BaseBomItemUncheckedCreateInput = {
    variantId: input.variantId,
    description: input.description,
    category: input.category,
    stockCode: input.stockCode,
    unitCost: input.unitCost,
    quantity: input.quantity,
    scalesWithSize: input.scalesWithSize,
    sortOrder: input.sortOrder,
  }

  return prisma.baseBomItem.create({ data, select: FLAT_SELECT }) as Promise<BomItem>
}

export async function updateBomItem(
  id: string,
  input: BomItemUpdateInput
): Promise<BomItem> {
  const data: Prisma.BaseBomItemUncheckedUpdateInput = {}
  if (input.description !== undefined) data.description = input.description
  if (input.category !== undefined) data.category = input.category
  if (input.stockCode !== undefined) data.stockCode = input.stockCode
  if (input.unitCost !== undefined) data.unitCost = input.unitCost
  if (input.quantity !== undefined) data.quantity = input.quantity
  if (input.scalesWithSize !== undefined) data.scalesWithSize = input.scalesWithSize
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

  return prisma.baseBomItem.update({
    where: { id },
    data,
    select: FLAT_SELECT,
  }) as Promise<BomItem>
}

export async function deleteBomItem(id: string): Promise<void> {
  await prisma.baseBomItem.delete({ where: { id } })
}
