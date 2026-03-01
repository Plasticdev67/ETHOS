import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import {
  extractTypePrefix,
  parseDimensions,
  deriveFamilyCode,
  deriveTypeName,
  mapComponentCategory,
  groupBy,
} from "@/lib/sage-catalogue-sync"

/**
 * POST /api/catalogue/sync-from-sage
 *
 * Syncs Sage BOM library data into the ProductFamily / ProductType / ProductVariant
 * catalogue hierarchy so the CRM Configure Product wizard can use real BOM data.
 */
export async function POST() {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("catalogue:edit")
  if (denied) return denied

  try {
    // 1. Fetch all finished goods from Sage that have BOM headers
    const finishedGoods = await prisma.sageStockItem.findMany({
      where: {
        productGroup: { startsWith: "FG-" },
      },
      select: {
        stockCode: true,
        name: true,
        productFamily: true,
        productGroup: true,
        materialComposition: true,
        itemSetType: true,
      },
      orderBy: [{ productFamily: "asc" }, { stockCode: "asc" }],
    })

    if (finishedGoods.length === 0) {
      return NextResponse.json({
        message: "No finished goods found in Sage BOM library (productGroup starting with FG-)",
        synced: { families: 0, types: 0, variants: 0, bomItems: 0 },
      })
    }

    let familyCount = 0
    let typeCount = 0
    let variantCount = 0
    let bomItemCount = 0

    // 2. Group by productFamily
    const familyGroups = groupBy(
      finishedGoods,
      (item) => item.productFamily || "Uncategorised"
    )

    for (const [familyName, items] of Object.entries(familyGroups)) {
      // Derive family code from the first item's productGroup
      const firstProductGroup = items[0]?.productGroup || "FG-OTHER"
      const familyCode = deriveFamilyCode(firstProductGroup)

      // 3. Upsert ProductFamily
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const family = await (prisma.productFamily as any).upsert({
        where: { code: familyCode },
        update: {
          name: familyName,
          sageProductGroup: firstProductGroup,
          active: true,
        },
        create: {
          name: familyName,
          code: familyCode,
          sageProductGroup: firstProductGroup,
          sortOrder: familyCount,
          active: true,
        },
      })
      familyCount++

      // 4. Group items within family by type prefix
      const typeGroups = groupBy(items, (item) => extractTypePrefix(item.stockCode))

      let typeSortOrder = 0
      for (const [typePrefix, typeItems] of Object.entries(typeGroups)) {
        const typeName = deriveTypeName(typePrefix, typeItems[0]?.name || null)

        // 5. Upsert ProductType
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const type = await (prisma.productType as any).upsert({
          where: { code: typePrefix },
          update: {
            name: typeName,
            familyId: family.id,
            sageTypePrefix: typePrefix,
            active: true,
          },
          create: {
            familyId: family.id,
            name: typeName,
            code: typePrefix,
            sageTypePrefix: typePrefix,
            sortOrder: typeSortOrder,
            active: true,
          },
        })
        typeCount++
        typeSortOrder++

        // 6. Each stock item becomes a variant
        let variantSortOrder = 0
        for (const item of typeItems) {
          const dims = parseDimensions(item.stockCode)

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.productVariant as any).upsert({
            where: { code: item.stockCode },
            update: {
              name: item.name,
              typeId: type.id,
              defaultWidth: dims.width,
              defaultHeight: dims.height,
              sageStockCode: item.stockCode,
              active: true,
            },
            create: {
              typeId: type.id,
              name: item.name,
              code: item.stockCode,
              defaultWidth: dims.width,
              defaultHeight: dims.height,
              sageStockCode: item.stockCode,
              sortOrder: variantSortOrder,
              active: true,
            },
          })
          variantCount++
          variantSortOrder++

          // 7. Sync BOM components to BaseBomItem
          const synced = await syncBomItemsForVariant(item.stockCode)
          bomItemCount += synced
        }

        // 8. Ensure a "Custom Size" variant exists for each type
        const customCode = `${typePrefix}-CUSTOM`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existing = await (prisma.productVariant as any).findUnique({
          where: { code: customCode },
        })
        if (!existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.productVariant as any).create({
            data: {
              typeId: type.id,
              name: `${typePrefix} Custom Size`,
              code: customCode,
              sortOrder: 999,
              active: true,
            },
          })
          variantCount++
        }
      }
    }

    return NextResponse.json({
      message: "Sync completed successfully",
      synced: {
        families: familyCount,
        types: typeCount,
        variants: variantCount,
        bomItems: bomItemCount,
      },
    })
  } catch (error) {
    console.error("Sage sync error:", error)
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Sync BOM components from SageBomComponent into BaseBomItem for a given stock code.
 * Returns the number of BOM items created.
 */
async function syncBomItemsForVariant(stockCode: string): Promise<number> {
  // Find the variant by its sageStockCode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const variant = await (prisma.productVariant as any).findFirst({
    where: { sageStockCode: stockCode },
    select: { id: true },
  })
  if (!variant) return 0

  // Find the BOM header for this stock code
  const bomHeader = await prisma.sageBomHeader.findUnique({
    where: { headerRef: stockCode },
    include: {
      components: {
        orderBy: { sequenceNo: "asc" },
        include: {
          stockItem: {
            select: { name: true, productGroup: true, averageBuyingPrice: true },
          },
        },
      },
    },
  })

  if (!bomHeader || bomHeader.components.length === 0) return 0

  // Delete existing synced BaseBomItem records for this variant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.baseBomItem as any).deleteMany({
    where: { variantId: variant.id },
  })

  // Create BaseBomItem from each SageBomComponent
  let count = 0
  for (const comp of bomHeader.components) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.baseBomItem as any).create({
      data: {
        variantId: variant.id,
        description: comp.description || comp.stockItem?.name || comp.stockCode,
        category: mapComponentCategory(comp.stockItem?.productGroup),
        stockCode: comp.stockCode,
        unitCost: comp.stockItem?.averageBuyingPrice ? Number(comp.stockItem.averageBuyingPrice) : 0,
        quantity: Number(comp.quantity),
        scalesWithSize: !comp.fixedQuantity,
        sortOrder: comp.sequenceNo,
      },
    })
    count++
  }

  return count
}
