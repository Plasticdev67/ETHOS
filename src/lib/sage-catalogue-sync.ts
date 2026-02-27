/**
 * Helper functions for syncing Sage BOM library data into the
 * ProductFamily / ProductType / ProductVariant catalogue hierarchy.
 */

/** Extract the type prefix from a stock code, e.g. "SFD-900x1200" → "SFD" */
export function extractTypePrefix(stockCode: string): string {
  const dash = stockCode.indexOf("-")
  if (dash === -1) return stockCode
  return stockCode.substring(0, dash)
}

/** Parse dimensions from a stock code, e.g. "SFD-900x1200" → {width:900, height:1200} */
export function parseDimensions(stockCode: string): { width: number | null; height: number | null } {
  const match = stockCode.match(/(\d{3,5})[xX×](\d{3,5})/)
  if (match) {
    return { width: parseInt(match[1]), height: parseInt(match[2]) }
  }
  return { width: null, height: null }
}

/** Derive a short family code from a Sage productGroup, e.g. "FG-FD" → "FD" */
export function deriveFamilyCode(productGroup: string): string {
  if (productGroup.startsWith("FG-")) {
    return productGroup.substring(3)
  }
  return productGroup
}

/** Derive a human-readable type name from a type prefix and sample stock items */
export function deriveTypeName(typePrefix: string, sampleName: string | null): string {
  // If we have a sample item name, try to extract a meaningful type name
  // e.g. "Standard Flood Door 900x1200" → "Standard Flood Door"
  if (sampleName) {
    // Remove dimension patterns from the name
    const cleaned = sampleName
      .replace(/\d{3,5}\s*[xX×]\s*\d{3,5}/g, "")
      .replace(/\s+/g, " ")
      .trim()
    if (cleaned.length > 3) return cleaned
  }
  return typePrefix
}

/** Map Sage product group / material to BOM category */
export function mapComponentCategory(
  productGroup: string | null | undefined,
): "MATERIALS" | "LABOUR" | "HARDWARE" | "SEALS" | "FINISH" {
  const pg = (productGroup || "").toUpperCase()
  if (pg.includes("HARDWARE") || pg === "DH") return "HARDWARE"
  if (pg.includes("SEAL") || pg === "SG") return "SEALS"
  if (pg.includes("PAINT") || pg.includes("COAT") || pg.includes("FINISH")) return "FINISH"
  if (pg.includes("LABOUR") || pg.startsWith("SUB")) return "LABOUR"
  return "MATERIALS"
}

/** Group an array by a key function */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!result[key]) result[key] = []
    result[key].push(item)
  }
  return result
}
