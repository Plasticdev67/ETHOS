/**
 * seed-catalogue.ts
 *
 * Previously contained fabricated product families, types, variants,
 * spec fields, BOM items, and BOM modifiers with made-up costs.
 *
 * All catalogue data should now come from Sage 200 imports via:
 *   1. POST /api/import/execute (sage-stock-items, sage-bom-headers, sage-bom-components)
 *   2. POST /api/catalogue/sync-from-sage (builds ProductFamily/Type/Variant hierarchy)
 *   3. POST /api/catalogue/propagate-prices (updates BOM costs from Sage prices)
 *
 * This file is intentionally empty. Do not add hardcoded product data here.
 */

console.log("seed-catalogue.ts: No action — catalogue data comes from Sage 200 imports.")
