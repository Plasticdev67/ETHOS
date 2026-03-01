/**
 * Repository for SpecField CRUD operations.
 *
 * Same isolation pattern as bom-items.ts — SpecField is part of the recursive
 * type chain (SpecField → SpecChoice → SpecBomModifier → BaseBomItem) that
 * exceeds TypeScript's stack depth on Vercel.
 *
 * @see https://github.com/prisma/prisma/issues/14832
 */
import { prisma } from "@/lib/db"

/* ------------------------------------------------------------------ */
/*  Plain input/output types                                          */
/* ------------------------------------------------------------------ */

export interface SpecChoiceInput {
  label: string
  value: string
  isDefault?: boolean
  costModifier?: number
  costMultiplier?: number
  sortOrder?: number
}

export interface SpecFieldCreateInput {
  typeId: string
  name: string
  code: string
  fieldType?: string
  required?: boolean
  sortOrder?: number
  helpText?: string | null
  choices?: SpecChoiceInput[]
}

export interface SpecFieldUpdateInput {
  name?: string
  code?: string
  fieldType?: string
  required?: boolean
  sortOrder?: number
  helpText?: string | null
}

export interface SpecChoiceResult {
  id: string
  fieldId: string
  label: string
  value: string
  isDefault: boolean
  costModifier: unknown // Prisma Decimal
  costMultiplier: unknown // Prisma Decimal
  sortOrder: number
}

export interface SpecFieldResult {
  id: string
  typeId: string
  name: string
  code: string
  fieldType: string
  required: boolean
  sortOrder: number
  helpText: string | null
  choices: SpecChoiceResult[]
}

export interface SpecFieldFlat {
  id: string
  typeId: string
  name: string
  code: string
  fieldType: string
  required: boolean
  sortOrder: number
  helpText: string | null
}

/* ------------------------------------------------------------------ */
/*  Narrow delegate — prevents Prisma's recursive generic resolution  */
/* ------------------------------------------------------------------ */

const INCLUDE_CHOICES = { choices: { orderBy: { sortOrder: "asc" as const } } }

const FLAT_SELECT = {
  id: true,
  typeId: true,
  name: true,
  code: true,
  fieldType: true,
  required: true,
  sortOrder: true,
  helpText: true,
} as const

interface SpecFieldDelegate {
  create(args: {
    data: Record<string, unknown>
    include: typeof INCLUDE_CHOICES
  }): Promise<SpecFieldResult>

  update(args: {
    where: { id: string }
    data: Record<string, unknown>
    select: typeof FLAT_SELECT
  }): Promise<SpecFieldFlat>

  delete(args: { where: { id: string } }): Promise<unknown>
}

const specFields: SpecFieldDelegate = prisma.specField as unknown as SpecFieldDelegate

/* ------------------------------------------------------------------ */
/*  CRUD operations                                                   */
/* ------------------------------------------------------------------ */

export async function createSpecField(input: SpecFieldCreateInput): Promise<SpecFieldResult> {
  const data: Record<string, unknown> = {
    typeId: input.typeId,
    name: input.name,
    code: input.code,
    fieldType: input.fieldType || "SELECT",
    required: input.required ?? false,
    sortOrder: input.sortOrder ?? 0,
    helpText: input.helpText || null,
  }

  if (input.choices && input.choices.length > 0) {
    data.choices = {
      create: input.choices.map((c, i) => ({
        label: c.label,
        value: c.value,
        isDefault: c.isDefault ?? false,
        costModifier: c.costModifier ?? 0,
        costMultiplier: c.costMultiplier ?? 1,
        sortOrder: c.sortOrder ?? i,
      })),
    }
  }

  return specFields.create({ data, include: INCLUDE_CHOICES })
}

export async function updateSpecField(
  id: string,
  input: SpecFieldUpdateInput
): Promise<SpecFieldFlat> {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.code !== undefined) data.code = input.code
  if (input.fieldType !== undefined) data.fieldType = input.fieldType
  if (input.required !== undefined) data.required = input.required
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder
  if (input.helpText !== undefined) data.helpText = input.helpText

  return specFields.update({ where: { id }, data, select: FLAT_SELECT })
}

export async function deleteSpecField(id: string): Promise<void> {
  await specFields.delete({ where: { id } })
}
