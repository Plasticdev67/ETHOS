import { config } from "dotenv"
config()

async function loadPrisma() {
  const pg = await import("pg")
  const adapterMod = await import("@prisma/adapter-pg")
  const mod = await import("../src/generated/prisma/client.js")

  const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new adapterMod.PrismaPg(pool)
  return new mod.PrismaClient({ adapter })
}

let prisma: any

async function main() {
  prisma = await loadPrisma()
  console.log("Seeding CRM amendments data...")

  // ── Feature Tags (Amendment 4) ──────────────────────────────────────────────

  const featureTags = [
    // FIXINGS
    { name: "Frame Fixings M12×100", code: "FIX-FRAME-M12", category: "FIXINGS", unitCost: 1.50, unit: "each", defaultQuantity: 12, autoCalcFromDimensions: true, autoCalcFormula: "perimeter / 400", sortOrder: 1 },
    { name: "Cill Fixings M10×80", code: "FIX-CILL-M10", category: "FIXINGS", unitCost: 1.20, unit: "each", defaultQuantity: 6, autoCalcFromDimensions: true, autoCalcFormula: "width / 400", sortOrder: 2 },
    { name: "Resin Anchors", code: "FIX-RESIN", category: "FIXINGS", unitCost: 4.50, unit: "each", defaultQuantity: 8, autoCalcFromDimensions: true, autoCalcFormula: "perimeter / 500", sortOrder: 3 },
    { name: "Chemical Fixings", code: "FIX-CHEMICAL", category: "FIXINGS", unitCost: 6.80, unit: "each", defaultQuantity: 6, sortOrder: 4 },
    // DOOR_HARDWARE
    { name: "Door Closer Dorma TS93", code: "HW-CLOSER-TS93", category: "DOOR_HARDWARE", unitCost: 125.00, unit: "each", defaultQuantity: 1, sortOrder: 1 },
    { name: "Door Closer Dorma TS83", code: "HW-CLOSER-TS83", category: "DOOR_HARDWARE", unitCost: 85.00, unit: "each", defaultQuantity: 1, sortOrder: 2 },
    { name: "Door Stay", code: "HW-STAY", category: "DOOR_HARDWARE", unitCost: 45.00, unit: "each", defaultQuantity: 1, sortOrder: 3 },
    { name: "Panic Hardware", code: "HW-PANIC", category: "DOOR_HARDWARE", unitCost: 210.00, unit: "each", defaultQuantity: 1, sortOrder: 4 },
    { name: "Kick Plate", code: "HW-KICKPLATE", category: "DOOR_HARDWARE", unitCost: 32.00, unit: "each", defaultQuantity: 1, sortOrder: 5 },
    { name: "Letter Plate", code: "HW-LETTERPLATE", category: "DOOR_HARDWARE", unitCost: 28.00, unit: "each", defaultQuantity: 1, sortOrder: 6 },
    // ELECTRICAL
    { name: "Earthing Kit", code: "ELEC-EARTH", category: "ELECTRICAL", unitCost: 35.00, unit: "each", defaultQuantity: 1, sortOrder: 1 },
    { name: "Mag Lock", code: "ELEC-MAGLOCK", category: "ELECTRICAL", unitCost: 180.00, unit: "each", defaultQuantity: 1, sortOrder: 2 },
    { name: "Access Control", code: "ELEC-ACCESS", category: "ELECTRICAL", unitCost: 350.00, unit: "each", defaultQuantity: 1, sortOrder: 3 },
    { name: "Intercom", code: "ELEC-INTERCOM", category: "ELECTRICAL", unitCost: 275.00, unit: "each", defaultQuantity: 1, sortOrder: 4 },
    // SEALS_GASKETS
    { name: "Perimeter Seal", code: "SEAL-PERIM", category: "SEALS_GASKETS", unitCost: 2.50, unit: "per_metre", defaultQuantity: 1, autoCalcFromDimensions: true, autoCalcFormula: "perimeter / 1000", sortOrder: 1 },
    { name: "Threshold Seal", code: "SEAL-THRESH", category: "SEALS_GASKETS", unitCost: 3.80, unit: "per_metre", defaultQuantity: 1, autoCalcFromDimensions: true, autoCalcFormula: "width / 1000", sortOrder: 2 },
    { name: "Intumescent Seal", code: "SEAL-INTUM", category: "SEALS_GASKETS", unitCost: 4.20, unit: "per_metre", defaultQuantity: 1, autoCalcFromDimensions: true, autoCalcFormula: "perimeter / 1000", sortOrder: 3 },
    { name: "Smoke Seal", code: "SEAL-SMOKE", category: "SEALS_GASKETS", unitCost: 3.50, unit: "per_metre", defaultQuantity: 1, autoCalcFromDimensions: true, autoCalcFormula: "perimeter / 1000", sortOrder: 4 },
  ]

  for (const tag of featureTags) {
    await prisma.featureTag.upsert({
      where: { code: tag.code },
      update: tag,
      create: { ...tag, isActive: true },
    })
  }
  console.log(`  ✓ ${featureTags.length} feature tags seeded`)

  // ── Lock Options (Amendment 7) ─────────────────────────────────────────────

  // Clear existing lock options first to avoid duplicates on re-run
  await prisma.lockOption.deleteMany()

  const lockOptions = [
    { category: "LOCK_TYPE", label: "None", value: "NONE", unitCost: 0, sortOrder: 0 },
    { category: "LOCK_TYPE", label: "Single-point deadlock", value: "SINGLE_DEADLOCK", unitCost: 45.00, sortOrder: 1 },
    { category: "LOCK_TYPE", label: "3-point multipoint lock", value: "3PT_MULTIPOINT", unitCost: 185.00, sortOrder: 2 },
    { category: "LOCK_TYPE", label: "5-point multipoint lock", value: "5PT_MULTIPOINT", unitCost: 275.00, sortOrder: 3 },
    { category: "LOCK_TYPE", label: "Panic bar (single point)", value: "PANIC_BAR_SINGLE", unitCost: 210.00, sortOrder: 4 },
    { category: "LOCK_TYPE", label: "Panic bar + multipoint", value: "PANIC_BAR_MULTI", unitCost: 380.00, sortOrder: 5 },
    { category: "LOCK_TYPE", label: "Slam lock", value: "SLAM_LOCK", unitCost: 120.00, sortOrder: 6 },
    { category: "LOCK_TYPE", label: "Mag lock (electronic)", value: "MAG_LOCK", unitCost: 180.00, sortOrder: 7 },
    { category: "LOCK_TYPE", label: "Padlock hasp only", value: "PADLOCK_HASP", unitCost: 15.00, sortOrder: 8 },
    // Cylinder types
    { category: "CYLINDER_TYPE", label: "Euro cylinder", value: "EURO", unitCost: 25.00, sortOrder: 1 },
    { category: "CYLINDER_TYPE", label: "Oval cylinder", value: "OVAL", unitCost: 22.00, sortOrder: 2 },
    { category: "CYLINDER_TYPE", label: "Thumbturn", value: "THUMBTURN", unitCost: 35.00, sortOrder: 3 },
    { category: "CYLINDER_TYPE", label: "Key both sides", value: "KEY_BOTH_SIDES", unitCost: 30.00, sortOrder: 4 },
    // Handle types
    { category: "HANDLE_TYPE", label: "Lever handle", value: "LEVER", unitCost: 35.00, sortOrder: 1 },
    { category: "HANDLE_TYPE", label: "Pull handle (D-bar)", value: "PULL_D_BAR", unitCost: 55.00, sortOrder: 2 },
    { category: "HANDLE_TYPE", label: "Push plate", value: "PUSH_PLATE", unitCost: 18.00, sortOrder: 3 },
    { category: "HANDLE_TYPE", label: "Flush pull", value: "FLUSH_PULL", unitCost: 28.00, sortOrder: 4 },
  ]

  for (const opt of lockOptions) {
    await prisma.lockOption.create({ data: { ...opt, isActive: true } })
  }
  console.log(`  ✓ ${lockOptions.length} lock options seeded`)

  // ── Coating Options (Amendment 8) ──────────────────────────────────────────

  // Clear existing coating options first to avoid duplicates on re-run
  await prisma.coatingOption.deleteMany()

  const coatingOptions = [
    { category: "COATING_STANDARD", label: "C1 — Very Low", value: "C1", description: "Dry interiors", defaultDft: 80, costPerM2: 8.00, sortOrder: 1 },
    { category: "COATING_STANDARD", label: "C2 — Low", value: "C2", description: "Low pollution, rural", defaultDft: 120, costPerM2: 12.00, sortOrder: 2 },
    { category: "COATING_STANDARD", label: "C3 — Medium", value: "C3", description: "Urban, moderate industrial", defaultDft: 200, costPerM2: 18.00, sortOrder: 3 },
    { category: "COATING_STANDARD", label: "C4 — High", value: "C4", description: "Industrial, coastal moderate", defaultDft: 240, costPerM2: 25.00, sortOrder: 4 },
    { category: "COATING_STANDARD", label: "C5 — Very High", value: "C5", description: "Industrial, coastal severe", defaultDft: 320, costPerM2: 35.00, sortOrder: 5 },
    { category: "COATING_STANDARD", label: "CX — Extreme", value: "CX", description: "Offshore, immersed", defaultDft: 400, costPerM2: 50.00, sortOrder: 6 },
    // Finish types
    { category: "FINISH_TYPE", label: "Gloss", value: "GLOSS", costPerM2: 0, sortOrder: 1 },
    { category: "FINISH_TYPE", label: "Semi-gloss", value: "SEMI_GLOSS", costPerM2: 0, sortOrder: 2 },
    { category: "FINISH_TYPE", label: "Satin", value: "SATIN", costPerM2: 0, sortOrder: 3 },
    { category: "FINISH_TYPE", label: "Matt", value: "MATT", costPerM2: 0, sortOrder: 4 },
    { category: "FINISH_TYPE", label: "Textured", value: "TEXTURED", costPerM2: 2.00, sortOrder: 5 },
    // Galv types
    { category: "GALV_TYPE", label: "Hot-dip galvanised", value: "HOT_DIP", costPerM2: 15.00, sortOrder: 1 },
    { category: "GALV_TYPE", label: "Electro galvanised", value: "ELECTRO", costPerM2: 10.00, sortOrder: 2 },
    { category: "GALV_TYPE", label: "Sherardised", value: "SHERARDISED", costPerM2: 20.00, sortOrder: 3 },
  ]

  for (const opt of coatingOptions) {
    await prisma.coatingOption.create({ data: { ...opt, isActive: true } })
  }
  console.log(`  ✓ ${coatingOptions.length} coating options seeded`)

  // ── Sample SpecBomMappings (Amendment 2) ────────────────────────────────────

  // Clear existing to avoid duplicates on re-run
  await prisma.specBomMapping.deleteMany()

  const specBomMappings = [
    {
      productType: "BLAST_DOOR",
      specField: "transome",
      specValue: "SINGLE",
      bomItems: [
        { material: "Steel Transome Bar 50x50", qtyFormula: "width / 1000", unitCost: 12.50, unit: "metres", category: "MATERIALS" },
        { material: "Transome Bracket", qtyFormula: "2", unitCost: 3.20, unit: "pieces", category: "HARDWARE" },
        { material: "Transome Seal", qtyFormula: "width / 1000", unitCost: 0.85, unit: "metres", category: "SEALS" },
      ],
    },
    {
      productType: "BLAST_DOOR",
      specField: "transome",
      specValue: "DOUBLE",
      bomItems: [
        { material: "Steel Transome Bar 50x50", qtyFormula: "width / 1000 * 2", unitCost: 12.50, unit: "metres", category: "MATERIALS" },
        { material: "Transome Bracket", qtyFormula: "4", unitCost: 3.20, unit: "pieces", category: "HARDWARE" },
        { material: "Transome Seal", qtyFormula: "width / 1000 * 2", unitCost: 0.85, unit: "metres", category: "SEALS" },
      ],
    },
    {
      productType: "BLAST_DOOR",
      specField: "vent",
      specValue: "LOUVRED",
      bomItems: [
        { material: "Louvred Vent 300×300", qtyFormula: "1", unitCost: 42.00, unit: "pieces", category: "HARDWARE" },
        { material: "Vent Frame", qtyFormula: "1", unitCost: 15.00, unit: "pieces", category: "MATERIALS" },
      ],
    },
  ]

  for (const mapping of specBomMappings) {
    await prisma.specBomMapping.create({ data: { ...mapping, isActive: true } })
  }
  console.log(`  ✓ ${specBomMappings.length} spec BOM mappings seeded`)

  // ── Sample DimensionBomMappings (Amendment 2) ──────────────────────────────

  // Clear existing to avoid duplicates on re-run
  await prisma.dimensionBomMapping.deleteMany()

  const dimMappings = [
    { productType: "BLAST_DOOR", material: "Frame Steel RHS 100x60x4", category: "MATERIALS", qtyFormula: "(width * 2 + height * 2) / 1000", unitCost: 12.00, unit: "metres" },
    { productType: "BLAST_DOOR", material: "Infill Plate 3mm", category: "MATERIALS", qtyFormula: "(width * height) / 1000000", unitCost: 40.00, unit: "m2" },
    { productType: "BLAST_DOOR", material: "Shotblast SA2.5", category: "FINISH", qtyFormula: "(width * height) / 1000000", unitCost: 5.00, unit: "m2" },
    { productType: "FLOOD_GATE", material: "Frame Steel RHS 120x80x5", category: "MATERIALS", qtyFormula: "(width * 2 + height * 2) / 1000", unitCost: 18.00, unit: "metres" },
    { productType: "FLOOD_GATE", material: "Infill Plate 5mm", category: "MATERIALS", qtyFormula: "(width * height) / 1000000", unitCost: 65.00, unit: "m2" },
  ]

  for (const mapping of dimMappings) {
    await prisma.dimensionBomMapping.create({ data: { ...mapping, isActive: true } })
  }
  console.log(`  ✓ ${dimMappings.length} dimension BOM mappings seeded`)

  console.log("\nCRM amendments seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect()
  })
