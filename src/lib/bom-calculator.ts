import type {
  BomItem,
  BomModifier,
  CatalogueSpecChoice,
  ComputedBomLine,
  BomCalculationResult,
  SpecSelections,
} from "./catalogue-types"

/**
 * Computes the final BOM and total cost for a configured product.
 *
 * Steps:
 * 1. Start with base BOM items for the selected variant
 * 2. Apply spec-BOM modifiers (REPLACE_COST, ADD_COST, MULTIPLY_COST, ADD_ITEM, REMOVE_ITEM)
 * 3. Apply choice-level costModifier (flat addition to total) and costMultiplier
 * 4. Scale costs by dimensions relative to variant defaults if item scalesWithSize
 */
export function computeBomCost(
  baseBom: BomItem[],
  specSelections: SpecSelections,
  modifiers: BomModifier[],
  allChoices: CatalogueSpecChoice[],
  width: number | null,
  height: number | null,
  defaultWidth: number | null,
  defaultHeight: number | null
): BomCalculationResult {
  // Build a lookup of selected choice IDs from spec selections
  const selectedChoiceIds = new Set<string>()
  for (const choiceValue of Object.values(specSelections)) {
    const choice = allChoices.find((c) => c.value === choiceValue || c.id === choiceValue)
    if (choice) selectedChoiceIds.add(choice.id)
  }

  // Clone base BOM items into working set
  const workingBom: Map<string, ComputedBomLine & { bomItemId: string; scalesWithSize: boolean }> =
    new Map()

  for (const item of baseBom) {
    workingBom.set(item.id, {
      bomItemId: item.id,
      description: item.description,
      category: item.category,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      totalCost: Number(item.quantity) * Number(item.unitCost),
      scalesWithSize: item.scalesWithSize,
    })
  }

  // Collect active modifiers (those whose choiceId is in the selected choices)
  const activeModifiers = modifiers.filter((m) => selectedChoiceIds.has(m.choiceId))

  // Group modifiers by bomItemId for efficient processing
  const removedItems = new Set<string>()
  const addedItems: ComputedBomLine[] = []

  for (const mod of activeModifiers) {
    const item = workingBom.get(mod.bomItemId)

    switch (mod.action) {
      case "REMOVE_ITEM":
        removedItems.add(mod.bomItemId)
        break

      case "REPLACE_COST":
        if (item) {
          item.unitCost = Number(mod.value)
          item.totalCost = item.quantity * item.unitCost
        }
        break

      case "ADD_COST":
        if (item) {
          item.unitCost += Number(mod.value)
          item.totalCost = item.quantity * item.unitCost
        }
        break

      case "MULTIPLY_COST":
        if (item) {
          item.unitCost *= Number(mod.value)
          item.totalCost = item.quantity * item.unitCost
        }
        break

      case "ADD_ITEM":
        addedItems.push({
          description: mod.description || "Additional item",
          category: item?.category || "MATERIALS",
          quantity: 1,
          unitCost: Number(mod.value),
          totalCost: Number(mod.value),
          isAdded: true,
        })
        break
    }
  }

  // Remove items marked for removal
  for (const id of removedItems) {
    workingBom.delete(id)
  }

  // Build final items list
  const items: ComputedBomLine[] = []

  // Dimension scaling factor
  const widthScale =
    width && defaultWidth && defaultWidth > 0 ? width / defaultWidth : 1
  const heightScale =
    height && defaultHeight && defaultHeight > 0 ? height / defaultHeight : 1
  const sizeScale = widthScale * heightScale

  for (const item of workingBom.values()) {
    const scale = item.scalesWithSize ? sizeScale : 1
    const scaledUnitCost = item.unitCost * scale
    items.push({
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unitCost: Math.round(scaledUnitCost * 100) / 100,
      totalCost: Math.round(item.quantity * scaledUnitCost * 100) / 100,
    })
  }

  // Add modifier-added items (these don't scale with size)
  items.push(...addedItems)

  // Calculate subtotal
  let totalCost = items.reduce((sum, item) => sum + item.totalCost, 0)

  // Apply choice-level costModifier (flat additions) and costMultiplier
  let flatAddition = 0
  let multiplier = 1

  for (const choiceId of selectedChoiceIds) {
    const choice = allChoices.find((c) => c.id === choiceId)
    if (choice) {
      flatAddition += Number(choice.costModifier) || 0
      const m = Number(choice.costMultiplier)
      if (m && m !== 1) {
        multiplier *= m
      }
    }
  }

  totalCost = (totalCost + flatAddition) * multiplier
  totalCost = Math.round(totalCost * 100) / 100

  return { items, totalCost }
}
