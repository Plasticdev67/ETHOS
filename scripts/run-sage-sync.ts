import "dotenv/config"
import { prisma } from "../src/lib/db"
import {
  extractTypePrefix,
  parseDimensions,
  deriveFamilyCode,
  deriveTypeName,
  mapComponentCategory,
  groupBy,
} from "../src/lib/sage-catalogue-sync"

async function main() {
  const finishedGoods = await prisma.sageStockItem.findMany({
    where: { productGroup: { startsWith: "FG-" } },
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

  console.log("Found", finishedGoods.length, "finished goods")
  if (finishedGoods.length === 0) {
    process.exit(0)
  }

  let familyCount = 0
  let typeCount = 0
  let variantCount = 0
  let bomItemCount = 0

  const familyGroups = groupBy(
    finishedGoods,
    (item) => item.productFamily || "Uncategorised"
  )

  for (const [familyName, items] of Object.entries(familyGroups)) {
    const firstProductGroup = items[0]?.productGroup || "FG-OTHER"
    const familyCode = deriveFamilyCode(firstProductGroup)

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
    console.log("Family:", familyCode, "-", familyName)

    const typeGroups = groupBy(items, (item) => extractTypePrefix(item.stockCode))

    let typeSortOrder = 0
    for (const [typePrefix, typeItems] of Object.entries(typeGroups)) {
      const typeName = deriveTypeName(typePrefix, typeItems[0]?.name || null)

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
      console.log("  Type:", typePrefix, "-", typeName)

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

        // Sync BOM items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const variant = await (prisma.productVariant as any).findFirst({
          where: { sageStockCode: item.stockCode },
          select: { id: true },
        })
        if (variant) {
          const bomHeader = await prisma.sageBomHeader.findUnique({
            where: { headerRef: item.stockCode },
            include: {
              components: {
                orderBy: { sequenceNo: "asc" },
                include: {
                  stockItem: {
                    select: { name: true, productGroup: true },
                  },
                },
              },
            },
          })
          if (bomHeader && bomHeader.components.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma.baseBomItem as any).deleteMany({
              where: { variantId: variant.id },
            })
            for (const comp of bomHeader.components) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (prisma.baseBomItem as any).create({
                data: {
                  variantId: variant.id,
                  description:
                    comp.description ||
                    comp.stockItem?.name ||
                    comp.stockCode,
                  category: mapComponentCategory(
                    comp.stockItem?.productGroup
                  ),
                  unitCost: 0,
                  quantity: Number(comp.quantity),
                  scalesWithSize: !comp.fixedQuantity,
                  sortOrder: comp.sequenceNo,
                },
              })
              bomItemCount++
            }
          }
        }
      }

      // Custom Size variant
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

  console.log("\nSync complete:", {
    families: familyCount,
    types: typeCount,
    variants: variantCount,
    bomItems: bomItemCount,
  })
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
