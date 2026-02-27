// Run with: npx tsx prisma/seed-catalogue.ts
import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Clearing existing catalogue hierarchy...")
  await prisma.specBomModifier.deleteMany()
  await prisma.specDependency.deleteMany()
  await prisma.baseBomItem.deleteMany()
  await prisma.specChoice.deleteMany()
  await prisma.specField.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.productType.deleteMany()
  await prisma.productFamily.deleteMany()

  console.log("Creating Flood Doors family...")
  const floodDoors = await prisma.productFamily.create({
    data: { name: "Flood Doors", code: "FD", sortOrder: 1 },
  })

  const sfd = await prisma.productType.create({
    data: { familyId: floodDoors.id, name: "Standard Flood Door", code: "SFD", sortOrder: 1 },
  })
  const dfd = await prisma.productType.create({
    data: { familyId: floodDoors.id, name: "Double Flood Door", code: "DFD", sortOrder: 2 },
  })
  const c5 = await prisma.productType.create({
    data: { familyId: floodDoors.id, name: "C5 Security Flood Door", code: "SFDC5", sortOrder: 3 },
  })

  console.log("Creating Flood Gates family...")
  const floodGates = await prisma.productFamily.create({
    data: { name: "Flood Gates", code: "FG", sortOrder: 2 },
  })
  const sfg = await prisma.productType.create({
    data: { familyId: floodGates.id, name: "Single Flood Gate", code: "SFG", sortOrder: 1 },
  })
  const dfg = await prisma.productType.create({
    data: { familyId: floodGates.id, name: "Double Flood Gate", code: "DFG", sortOrder: 2 },
  })
  const slg = await prisma.productType.create({
    data: { familyId: floodGates.id, name: "Sliding Flood Gate", code: "SLG", sortOrder: 3 },
  })
  const hfg = await prisma.productType.create({
    data: { familyId: floodGates.id, name: "Hydraulic Flood Gate", code: "HFG", sortOrder: 4 },
  })

  // ==========================================
  // VARIANTS
  // ==========================================
  console.log("Creating variants...")
  const sfd900x1200 = await prisma.productVariant.create({
    data: { typeId: sfd.id, name: "SFD 900×1200", code: "SFD-900x1200", defaultWidth: 900, defaultHeight: 1200, sortOrder: 1 },
  })
  const sfd900x1500 = await prisma.productVariant.create({
    data: { typeId: sfd.id, name: "SFD 900×1500", code: "SFD-900x1500", defaultWidth: 900, defaultHeight: 1500, sortOrder: 2 },
  })
  const sfd1000x2100 = await prisma.productVariant.create({
    data: { typeId: sfd.id, name: "SFD 1000×2100", code: "SFD-1000x2100", defaultWidth: 1000, defaultHeight: 2100, sortOrder: 3 },
  })
  const sfdCustom = await prisma.productVariant.create({
    data: { typeId: sfd.id, name: "SFD Custom Size", code: "SFD-CUSTOM", sortOrder: 4 },
  })

  await prisma.productVariant.create({
    data: { typeId: dfd.id, name: "DFD 1800×1500", code: "DFD-1800x1500", defaultWidth: 1800, defaultHeight: 1500, sortOrder: 1 },
  })
  await prisma.productVariant.create({
    data: { typeId: dfd.id, name: "DFD 2000×2100", code: "DFD-2000x2100", defaultWidth: 2000, defaultHeight: 2100, sortOrder: 2 },
  })
  await prisma.productVariant.create({
    data: { typeId: dfd.id, name: "DFD Custom Size", code: "DFD-CUSTOM", sortOrder: 3 },
  })

  await prisma.productVariant.create({
    data: { typeId: c5.id, name: "SFDC5 900×2100", code: "SFDC5-900x2100", defaultWidth: 900, defaultHeight: 2100, sortOrder: 1 },
  })
  await prisma.productVariant.create({
    data: { typeId: c5.id, name: "SFDC5 Custom Size", code: "SFDC5-CUSTOM", sortOrder: 2 },
  })

  await prisma.productVariant.create({
    data: { typeId: sfg.id, name: "SFG 1200×900", code: "SFG-1200x900", defaultWidth: 1200, defaultHeight: 900, sortOrder: 1 },
  })
  await prisma.productVariant.create({
    data: { typeId: sfg.id, name: "SFG 1500×1200", code: "SFG-1500x1200", defaultWidth: 1500, defaultHeight: 1200, sortOrder: 2 },
  })
  await prisma.productVariant.create({
    data: { typeId: dfg.id, name: "DFG 3000×1200", code: "DFG-3000x1200", defaultWidth: 3000, defaultHeight: 1200, sortOrder: 1 },
  })
  await prisma.productVariant.create({
    data: { typeId: slg.id, name: "SLG 5000×1500", code: "SLG-5000x1500", defaultWidth: 5000, defaultHeight: 1500, sortOrder: 1 },
  })
  await prisma.productVariant.create({
    data: { typeId: hfg.id, name: "HFG 4000×1200", code: "HFG-4000x1200", defaultWidth: 4000, defaultHeight: 1200, sortOrder: 1 },
  })

  // ==========================================
  // SPEC FIELDS
  // ==========================================
  console.log("Creating spec fields and choices...")
  const specFieldDefs = [
    { code: "MATERIAL", name: "Material", sortOrder: 1, required: true },
    { code: "FINISH", name: "Finish", sortOrder: 2, required: true },
    { code: "PAINT_COLOUR", name: "Paint Colour", sortOrder: 3, required: false },
    { code: "SECURITY", name: "Security Rating", sortOrder: 4, required: false },
    { code: "LOCK", name: "Lock Type", sortOrder: 5, required: true },
    { code: "FRAME_FIXING", name: "Frame Fixing", sortOrder: 6, required: false },
    { code: "SEAL", name: "Seal Type", sortOrder: 7, required: true },
    { code: "THRESHOLD", name: "Threshold", sortOrder: 8, required: false },
  ]

  const choiceDefs: Record<string, { label: string; value: string; isDefault?: boolean; costModifier?: number; costMultiplier?: number }[]> = {
    MATERIAL: [
      { label: "Mild Steel", value: "MILD_STEEL", isDefault: true },
      { label: "Stainless Steel 316", value: "STAINLESS_316", costMultiplier: 1.35 },
      { label: "Stainless Steel 304", value: "STAINLESS_304", costMultiplier: 1.25 },
      { label: "Aluminium", value: "ALUMINIUM", costMultiplier: 1.15 },
    ],
    FINISH: [
      { label: "Hot-Dip Galvanised", value: "GALVANISED", isDefault: true },
      { label: "Painted (Specify Colour)", value: "PAINTED" },
      { label: "Galvanised + Painted", value: "GALV_PAINTED", costModifier: 150 },
      { label: "Raw / Unfinished", value: "RAW", costModifier: -80 },
    ],
    PAINT_COLOUR: [
      { label: "RAL 7016 Anthracite Grey", value: "RAL7016", isDefault: true },
      { label: "RAL 9005 Jet Black", value: "RAL9005" },
      { label: "RAL 5010 Gentian Blue", value: "RAL5010" },
      { label: "Custom RAL", value: "CUSTOM_RAL", costModifier: 30 },
    ],
    SECURITY: [
      { label: "Standard", value: "STANDARD", isDefault: true },
      { label: "PAS 68 Rated", value: "PAS68", costModifier: 450 },
      { label: "LPS 1175 SR2", value: "LPS1175_SR2", costModifier: 600 },
    ],
    LOCK: [
      { label: "Standard Multi-point", value: "STANDARD", isDefault: true },
      { label: "Panic Bar (Push)", value: "PANIC_BAR" },
      { label: "Deadbolt Only", value: "DEADBOLT", costModifier: -40 },
      { label: "Electronic Access", value: "ELECTRONIC", costModifier: 280 },
    ],
    FRAME_FIXING: [
      { label: "Chemical Anchor", value: "CHEMICAL_ANCHOR", isDefault: true },
      { label: "Mechanical Expansion", value: "MECH_EXPANSION" },
      { label: "Welded to Steel", value: "WELDED", costModifier: 60 },
    ],
    SEAL: [
      { label: "EPDM Standard", value: "EPDM", isDefault: true },
      { label: "Marine Grade Neoprene", value: "MARINE" },
      { label: "Dual Seal (EPDM + Inflatable)", value: "DUAL", costModifier: 120 },
    ],
    THRESHOLD: [
      { label: "Standard Aluminium", value: "STANDARD_ALU", isDefault: true },
      { label: "Stainless Steel", value: "STAINLESS", costModifier: 80 },
      { label: "Recessed / Flush", value: "RECESSED", costModifier: 60 },
    ],
  }

  const allDoorTypes = [sfd, dfd, c5]
  const choiceIdMap: Record<string, Record<string, string>> = {}

  for (const type of allDoorTypes) {
    choiceIdMap[type.id] = {}
    for (const fieldDef of specFieldDefs) {
      const choices = choiceDefs[fieldDef.code] || []
      const field = await prisma.specField.create({
        data: {
          typeId: type.id,
          name: fieldDef.name,
          code: fieldDef.code,
          fieldType: "SELECT",
          required: fieldDef.required,
          sortOrder: fieldDef.sortOrder,
          choices: {
            create: choices.map((c, i) => ({
              label: c.label,
              value: c.value,
              isDefault: c.isDefault ?? false,
              costModifier: c.costModifier ?? 0,
              costMultiplier: c.costMultiplier ?? 1,
              sortOrder: i,
            })),
          },
        },
        include: { choices: true },
      })

      for (const choice of field.choices) {
        choiceIdMap[type.id][`${fieldDef.code}_${choice.value}`] = choice.id
      }

      if (fieldDef.code === "PAINT_COLOUR") {
        const paintedId = choiceIdMap[type.id]["FINISH_PAINTED"]
        const galvPaintedId = choiceIdMap[type.id]["FINISH_GALV_PAINTED"]
        if (paintedId) {
          await prisma.specDependency.create({
            data: { dependentFieldId: field.id, triggerChoiceId: paintedId, action: "SHOW" },
          })
        }
        if (galvPaintedId) {
          await prisma.specDependency.create({
            data: { dependentFieldId: field.id, triggerChoiceId: galvPaintedId, action: "SHOW" },
          })
        }
      }
    }
  }

  // Gate types — subset of fields
  const gateTypes = [sfg, dfg, slg, hfg]
  for (const type of gateTypes) {
    choiceIdMap[type.id] = {}
    const gateFields = specFieldDefs.filter((f) => ["MATERIAL", "FINISH", "PAINT_COLOUR", "SEAL"].includes(f.code))
    for (const fieldDef of gateFields) {
      const choices = choiceDefs[fieldDef.code] || []
      const field = await prisma.specField.create({
        data: {
          typeId: type.id,
          name: fieldDef.name,
          code: fieldDef.code,
          fieldType: "SELECT",
          required: fieldDef.required,
          sortOrder: fieldDef.sortOrder,
          choices: {
            create: choices.map((c, i) => ({
              label: c.label,
              value: c.value,
              isDefault: c.isDefault ?? false,
              costModifier: c.costModifier ?? 0,
              costMultiplier: c.costMultiplier ?? 1,
              sortOrder: i,
            })),
          },
        },
        include: { choices: true },
      })

      for (const choice of field.choices) {
        choiceIdMap[type.id][`${fieldDef.code}_${choice.value}`] = choice.id
      }

      if (fieldDef.code === "PAINT_COLOUR") {
        const paintedId = choiceIdMap[type.id]["FINISH_PAINTED"]
        const galvPaintedId = choiceIdMap[type.id]["FINISH_GALV_PAINTED"]
        if (paintedId) {
          await prisma.specDependency.create({
            data: { dependentFieldId: field.id, triggerChoiceId: paintedId, action: "SHOW" },
          })
        }
        if (galvPaintedId) {
          await prisma.specDependency.create({
            data: { dependentFieldId: field.id, triggerChoiceId: galvPaintedId, action: "SHOW" },
          })
        }
      }
    }
  }

  // ==========================================
  // BASE BOM for SFD variants (~£2,030 for 900x1500)
  // ==========================================
  console.log("Creating BOM items and modifiers...")
  const bomItems = [
    { description: "Steel Frame", category: "MATERIALS", unitCost: 380, scalesWithSize: true, sortOrder: 1 },
    { description: "Door Leaf", category: "MATERIALS", unitCost: 520, scalesWithSize: true, sortOrder: 2 },
    { description: "Hinge Set", category: "HARDWARE", unitCost: 95, scalesWithSize: false, sortOrder: 3 },
    { description: "Lock Assembly", category: "HARDWARE", unitCost: 145, scalesWithSize: false, sortOrder: 4 },
    { description: "EPDM Seal Kit", category: "SEALS", unitCost: 65, scalesWithSize: true, sortOrder: 5 },
    { description: "Threshold Assembly", category: "MATERIALS", unitCost: 110, scalesWithSize: true, sortOrder: 6 },
    { description: "Galvanising", category: "FINISH", unitCost: 180, scalesWithSize: true, sortOrder: 7 },
    { description: "Fixings Pack", category: "HARDWARE", unitCost: 35, scalesWithSize: false, sortOrder: 8 },
    { description: "Labour — Fabrication", category: "LABOUR", unitCost: 320, scalesWithSize: false, sortOrder: 9 },
    { description: "Labour — Assembly", category: "LABOUR", unitCost: 180, scalesWithSize: false, sortOrder: 10 },
  ]

  // Create BOM for all SFD variants
  const sfdVariants = [sfd900x1200, sfd900x1500, sfd1000x2100, sfdCustom]
  const createdBom: Record<string, string> = {} // for sfd900x1500

  for (const variant of sfdVariants) {
    for (const bom of bomItems) {
      const item = await prisma.baseBomItem.create({
        data: {
          variantId: variant.id,
          description: bom.description,
          category: bom.category,
          unitCost: bom.unitCost,
          quantity: 1,
          scalesWithSize: bom.scalesWithSize,
          sortOrder: bom.sortOrder,
        },
      })
      if (variant.id === sfd900x1500.id) {
        createdBom[bom.description] = item.id
      }
    }
  }

  // ==========================================
  // BOM MODIFIERS for SFD-900x1500
  // ==========================================
  const ss316Id = choiceIdMap[sfd.id]["MATERIAL_STAINLESS_316"]
  if (ss316Id) {
    await prisma.specBomModifier.create({
      data: { bomItemId: createdBom["Steel Frame"], choiceId: ss316Id, action: "MULTIPLY_COST", value: 1.35 },
    })
    await prisma.specBomModifier.create({
      data: { bomItemId: createdBom["Door Leaf"], choiceId: ss316Id, action: "MULTIPLY_COST", value: 1.35 },
    })
  }

  const paintedId = choiceIdMap[sfd.id]["FINISH_PAINTED"]
  if (paintedId) {
    await prisma.specBomModifier.create({
      data: { bomItemId: createdBom["Galvanising"], choiceId: paintedId, action: "REMOVE_ITEM", value: 0 },
    })
    await prisma.specBomModifier.create({
      data: { bomItemId: createdBom["Galvanising"], choiceId: paintedId, action: "ADD_ITEM", value: 220, description: "Powder Coat Paint" },
    })
  }

  const panicBarId = choiceIdMap[sfd.id]["LOCK_PANIC_BAR"]
  if (panicBarId) {
    await prisma.specBomModifier.create({
      data: { bomItemId: createdBom["Lock Assembly"], choiceId: panicBarId, action: "REPLACE_COST", value: 285 },
    })
  }

  const marineId = choiceIdMap[sfd.id]["SEAL_MARINE"]
  if (marineId) {
    await prisma.specBomModifier.create({
      data: { bomItemId: createdBom["EPDM Seal Kit"], choiceId: marineId, action: "REPLACE_COST", value: 150 },
    })
  }

  console.log("✓ Catalogue seeded successfully!")
  console.log("  Families: 2 (Flood Doors, Flood Gates)")
  console.log("  Types: 7")
  console.log("  Variants: 14")
  console.log("  Spec fields: ~56 (8 per door type × 3 + 4 per gate type × 4)")
  console.log("  BOM items: 40 (10 per SFD variant × 4)")
  console.log("  BOM modifiers: 6")
}

main()
  .catch(console.error)
  .finally(() => {
    pool.end()
  })
