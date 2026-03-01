import { Prisma } from "@/generated/prisma/client"

/**
 * Safely convert a value to Prisma Decimal.
 * Returns null if the value is falsy/empty, or the Decimal if valid.
 * Returns null if the value is present but not a valid number.
 */
export function toDecimal(value: unknown): Prisma.Decimal | null {
  if (value === null || value === undefined || value === "") return null
  const str = String(value)
  if (isNaN(Number(str))) return null
  return new Prisma.Decimal(str)
}

/**
 * Safely convert a value to Prisma Decimal with a default.
 * Returns the default if value is falsy/empty.
 */
export function toDecimalOrDefault(value: unknown, defaultValue: number = 0): Prisma.Decimal {
  const d = toDecimal(value)
  return d ?? new Prisma.Decimal(String(defaultValue))
}
