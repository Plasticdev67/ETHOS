// Shared TypeScript interfaces for the hierarchical product catalogue

export interface CatalogueFamily {
  id: string
  name: string
  code: string
  sortOrder: number
  active: boolean
  types: CatalogueType[]
}

export interface CatalogueType {
  id: string
  familyId: string
  name: string
  code: string
  sortOrder: number
  active: boolean
  variants: CatalogueVariant[]
  specFields: CatalogueSpecField[]
}

export interface CatalogueVariant {
  id: string
  typeId: string
  name: string
  code: string
  defaultWidth: number | null
  defaultHeight: number | null
  catalogueItemId: string | null
  sortOrder: number
  active: boolean
}

export interface CatalogueSpecField {
  id: string
  typeId: string
  name: string
  code: string
  fieldType: "SELECT" | "NUMBER" | "TEXT" | "BOOLEAN"
  required: boolean
  sortOrder: number
  helpText: string | null
  choices: CatalogueSpecChoice[]
  dependencies: CatalogueSpecDependency[]
}

export interface CatalogueSpecChoice {
  id: string
  fieldId: string
  label: string
  value: string
  isDefault: boolean
  costModifier: number
  costMultiplier: number
  sortOrder: number
}

export interface CatalogueSpecDependency {
  id: string
  dependentFieldId: string
  triggerChoiceId: string
  action: "SHOW" | "HIDE"
}

export interface BomItem {
  id: string
  variantId: string
  description: string
  category: "MATERIALS" | "LABOUR" | "HARDWARE" | "SEALS" | "FINISH"
  unitCost: number
  quantity: number
  scalesWithSize: boolean
  sortOrder: number
}

export interface BomModifier {
  id: string
  bomItemId: string
  choiceId: string
  action: "REPLACE_COST" | "ADD_COST" | "MULTIPLY_COST" | "ADD_ITEM" | "REMOVE_ITEM"
  value: number
  description: string | null
}

// Computed BOM line (output of the calculator)
export interface ComputedBomLine {
  description: string
  category: string
  quantity: number
  unitCost: number
  totalCost: number
  isAdded?: boolean // true if added by a modifier
}

export interface BomCalculationResult {
  items: ComputedBomLine[]
  totalCost: number
}

// Spec selections as stored in QuoteLineSpec.specSelections
export type SpecSelections = Record<string, string>
