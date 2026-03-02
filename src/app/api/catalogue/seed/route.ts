import { NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

/**
 * POST /api/catalogue/seed
 *
 * This endpoint previously seeded fabricated product catalogue data
 * (fake families, types, variants, spec fields, BOM items, modifiers).
 *
 * All catalogue data should now come from Sage 200 via:
 *   1. POST /api/import/execute (type: sage-stock-items, sage-bom-headers, sage-bom-components)
 *   2. POST /api/catalogue/sync-from-sage
 *   3. POST /api/catalogue/propagate-prices
 *
 * This endpoint is disabled. Use the Sage import pipeline instead.
 */
export async function POST() {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  return NextResponse.json({
    error: "Catalogue seed endpoint is disabled. Use the Sage import pipeline instead.",
    instructions: [
      "1. Import stock items: POST /api/import/execute (type: sage-stock-items)",
      "2. Import BOM headers: POST /api/import/execute (type: sage-bom-headers)",
      "3. Import BOM components: POST /api/import/execute (type: sage-bom-components)",
      "4. Sync catalogue: POST /api/catalogue/sync-from-sage",
      "5. Update prices: POST /api/catalogue/propagate-prices",
    ],
  }, { status: 410 })
}
