/**
 * Repository for BaseBomItem CRUD operations.
 *
 * Isolates Prisma calls for this model to resolve TypeScript's "excessive
 * stack depth" error. The recursive type chain (BaseBomItem → SpecBomModifier
 * → SpecChoice → SpecField → ProductType) causes TypeScript to exceed its
 * recursion limit when resolving Prisma's deeply-generic create/update/delete
 * method signatures — especially under Vercel's stricter build environment.
 *
 * The fix: define a narrow delegate interface (`BomItemDelegate`) with only
 * the operations and return types we need. TypeScript resolves our simple
 * interface instead of traversing Prisma's recursive generics. The route
 * handler imports only plain types from this module.
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
/*  Return type — flat scalar fields, no relations                    */
/* ------------------------------------------------------------------ */

export interface BomItem {
  id: string
  variantId: string
  description: string
  category: string
  stockCode: string | null
  unitCost: Prisma.Decimal
  quantity: Prisma.Decimal
  scalesWithSize: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

/* ------------------------------------------------------------------ */
/*  Narrow delegate — prevents Prisma's recursive generic resolution  */
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

/**
 * Minimal typed interface for BaseBomItem operations.
 * Replaces Prisma's deeply-generic delegate to avoid recursive type
 * resolution that exceeds TypeScript's stack depth on Vercel.
 */
interface BomItemDelegate {
  create(args: {
    data: Record<string, unknown>
    select: typeof FLAT_SELECT
  }): Promise<BomItem>

  update(args: {
    where: { id: string }
    data: Record<string, unknown>
    select: typeof FLAT_SELECT
  }): Promise<BomItem>

  delete(args: { where: { id: string } }): Promise<unknown>
}

/** Narrowed Prisma delegate — typed only for the operations we use */
const bomItems: BomItemDelegate = prisma.baseBomItem as unknown as BomItemDelegate

/* ------------------------------------------------------------------ */
/*  CRUD operations                                                   */
/* ------------------------------------------------------------------ */

export async function createBomItem(input: BomItemCreateInput): Promise<BomItem> {
  return bomItems.create({
    data: {
      variantId: input.variantId,
      description: input.description,
      category: input.category,
      stockCode: input.stockCode,
      unitCost: input.unitCost,
      quantity: input.quantity,
      scalesWithSize: input.scalesWithSize,
      sortOrder: input.sortOrder,
    },
    select: FLAT_SELECT,
  })
}

export async function updateBomItem(
  id: string,
  input: BomItemUpdateInput
): Promise<BomItem> {
  const data: Record<string, unknown> = {}
  if (input.description !== undefined) data.description = input.description
  if (input.category !== undefined) data.category = input.category
  if (input.stockCode !== undefined) data.stockCode = input.stockCode
  if (input.unitCost !== undefined) data.unitCost = input.unitCost
  if (input.quantity !== undefined) data.quantity = input.quantity
  if (input.scalesWithSize !== undefined) data.scalesWithSize = input.scalesWithSize
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

  return bomItems.update({ where: { id }, data, select: FLAT_SELECT })
}

export async function deleteBomItem(id: string): Promise<void> {
  await bomItems.delete({ where: { id } })
}
