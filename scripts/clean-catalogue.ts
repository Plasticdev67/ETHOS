/**
 * Cleans the catalogue hierarchy by removing:
 *   - Project-specific entries (codes starting with digits)
 *   - "Custom Size" placeholder variants (codes ending with -CUSTOM)
 *
 * Run: npx tsx scripts/clean-catalogue.ts
 */
import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  console.log("\n=== Clean Catalogue — Remove project-specific + Custom entries ===\n")

  // 1. Find all variants to delete (project-specific or custom)
  const variantsToDelete = await prisma.productVariant.findMany({
    where: {
      OR: [
        { code: { endsWith: "-CUSTOM" } },
        // Project-specific: code starts with a digit
        { code: { startsWith: "0" } },
        { code: { startsWith: "1" } },
        { code: { startsWith: "2" } },
        { code: { startsWith: "3" } },
        { code: { startsWith: "4" } },
        { code: { startsWith: "5" } },
        { code: { startsWith: "6" } },
        { code: { startsWith: "7" } },
        { code: { startsWith: "8" } },
        { code: { startsWith: "9" } },
      ],
    },
    select: { id: true, code: true, name: true },
  })

  console.log(`Variants to delete: ${variantsToDelete.length}`)
  for (const v of variantsToDelete) {
    console.log(`  ${v.code} | ${v.name}`)
  }

  if (variantsToDelete.length > 0) {
    const variantIds = variantsToDelete.map(v => v.id)

    // Delete BaseBomItems for these variants
    const bomDeleted = await prisma.baseBomItem.deleteMany({
      where: { variantId: { in: variantIds } },
    })
    console.log(`\n  Deleted ${bomDeleted.count} BaseBomItems`)

    // Delete the variants
    const varsDeleted = await prisma.productVariant.deleteMany({
      where: { id: { in: variantIds } },
    })
    console.log(`  Deleted ${varsDeleted.count} ProductVariants`)
  }

  // 2. Find project-specific types (code starts with digit) that now have no variants
  const typesToDelete = await prisma.productType.findMany({
    where: {
      OR: [
        { code: { startsWith: "0" } },
        { code: { startsWith: "1" } },
        { code: { startsWith: "2" } },
        { code: { startsWith: "3" } },
        { code: { startsWith: "4" } },
        { code: { startsWith: "5" } },
        { code: { startsWith: "6" } },
        { code: { startsWith: "7" } },
        { code: { startsWith: "8" } },
        { code: { startsWith: "9" } },
      ],
    },
    include: { _count: { select: { variants: true } } },
  })

  const emptyTypes = typesToDelete.filter(t => t._count.variants === 0)
  console.log(`\nProject-specific types to delete: ${emptyTypes.length}`)
  for (const t of emptyTypes) {
    console.log(`  ${t.code} | ${t.name}`)
  }

  if (emptyTypes.length > 0) {
    const deleted = await prisma.productType.deleteMany({
      where: { id: { in: emptyTypes.map(t => t.id) } },
    })
    console.log(`  Deleted ${deleted.count} ProductTypes`)
  }

  // 3. Summary
  const remaining = {
    families: await prisma.productFamily.count(),
    types: await prisma.productType.count(),
    variants: await prisma.productVariant.count(),
    bomItems: await prisma.baseBomItem.count(),
  }
  console.log("\n=== Remaining catalogue ===")
  console.log(`  Families: ${remaining.families}`)
  console.log(`  Types: ${remaining.types}`)
  console.log(`  Variants: ${remaining.variants}`)
  console.log(`  BOM Items: ${remaining.bomItems}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})
