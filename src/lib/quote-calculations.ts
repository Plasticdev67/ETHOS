// Quote calculation constants
export const MINIMUM_MARGIN_FLOOR = 25 // 25% minimum margin
export const SELL_PRICE_ROUNDING = 25 // Round sell prices to nearest £25
export const COST_DEVIATION_THRESHOLD = 0.15 // 15% deviation triggers warning

/**
 * Calculate total cost from unit cost and quantity
 */
export function calculateCostTotal(unitCost: number, quantity: number): number {
  return unitCost * quantity
}

/**
 * Calculate sell price from cost total and margin percentage.
 * Formula: sellPrice = costTotal / (1 - margin/100)
 * Rounded to nearest £25.
 */
export function calculateSellPrice(costTotal: number, marginPercent: number): number {
  if (marginPercent >= 100 || costTotal === 0) return costTotal
  const raw = costTotal / (1 - marginPercent / 100)
  return Math.round(raw / SELL_PRICE_ROUNDING) * SELL_PRICE_ROUNDING
}

/**
 * Calculate sell price per unit (for display in rate column)
 */
export function calculateUnitSellPrice(unitCost: number, marginPercent: number): number {
  if (marginPercent >= 100 || unitCost === 0) return unitCost
  const raw = unitCost / (1 - marginPercent / 100)
  return Math.round(raw / SELL_PRICE_ROUNDING) * SELL_PRICE_ROUNDING
}

/**
 * Calculate overall margin percentage from totals
 */
export function calculateOverallMargin(totalCost: number, totalSell: number): number {
  return totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0
}

/**
 * Check if margin is below the minimum floor
 */
export function checkMarginFloor(marginPercent: number): {
  belowFloor: boolean
  floor: number
} {
  return {
    belowFloor: marginPercent < MINIMUM_MARGIN_FLOOR,
    floor: MINIMUM_MARGIN_FLOOR,
  }
}

/**
 * Check if the entered cost deviates significantly from the catalogue benchmark
 */
export function checkCostDeviation(
  unitCost: number,
  guideUnitCost: number | null | undefined
): { deviates: boolean; percentage: number; direction: "above" | "below" | "none" } {
  if (!guideUnitCost || guideUnitCost === 0)
    return { deviates: false, percentage: 0, direction: "none" }
  const diff = unitCost - guideUnitCost
  const pct = Math.abs(diff) / guideUnitCost
  return {
    deviates: pct > COST_DEVIATION_THRESHOLD,
    percentage: Math.round(pct * 100),
    direction: diff > 0 ? "above" : diff < 0 ? "below" : "none",
  }
}

/**
 * Calculate R&D-adjusted margin.
 * "True Margin" includes R&D cost, "Apparent Margin" excludes it.
 * Used for configured lines with R&D checkbox enabled.
 */
export function calculateRdAdjustedMargin(
  costTotal: number,
  sellPrice: number,
  rdCost: number
): { trueMargin: number; apparentMargin: number } {
  const trueMargin = sellPrice > 0 ? ((sellPrice - costTotal) / sellPrice) * 100 : 0
  const costWithoutRd = costTotal - rdCost
  const apparentMargin = sellPrice > 0 ? ((sellPrice - costWithoutRd) / sellPrice) * 100 : 0
  return {
    trueMargin: Math.round(trueMargin * 100) / 100,
    apparentMargin: Math.round(apparentMargin * 100) / 100,
  }
}

/** Standard units for the dropdown */
export const UNIT_OPTIONS = [
  { value: "nr", label: "nr" },
  { value: "item", label: "item" },
  { value: "set", label: "set" },
  { value: "lot", label: "lot" },
  { value: "m", label: "m" },
  { value: "m2", label: "m\u00B2" },
  { value: "m3", label: "m\u00B3" },
  { value: "kg", label: "kg" },
  { value: "tonne", label: "tonne" },
  { value: "day", label: "day" },
  { value: "week", label: "week" },
  { value: "trip", label: "trip" },
]
