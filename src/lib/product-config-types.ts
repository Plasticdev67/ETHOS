// Types for CRM product configuration (Amendments 2-8)

export interface DimensionsConfig {
  width: number | null
  height: number | null
  depth: number | null
  leafConfig: "SINGLE" | "DOUBLE" | "SLIDING" | "BI_FOLD"
  openingDirection: "INWARD" | "OUTWARD" | "LEFT" | "RIGHT" | ""
  handing: "LH" | "RH" | "" // Simplified handing field
  clearOpening: number | null  // auto-calculated
  structuralOpening: number | null
}

export interface TransomeConfig {
  enabled: boolean
  type: "SINGLE" | "DOUBLE" | "GLAZED" | "SOLID" | ""
  position: "TOP" | "MIDDLE" | "TOP_AND_MIDDLE" | ""
  height: number | null // mm
  material: "STEEL" | "ALUMINIUM" | "STAINLESS_STEEL" | ""
}

export interface VentConfig {
  enabled: boolean
  type: "LOUVRED" | "MESH" | "INTUMESCENT" | "ACOUSTIC" | ""
  size: "SMALL" | "MEDIUM" | "LARGE" | "CUSTOM" | ""
  customWidth: number | null
  customHeight: number | null
  position: "TOP" | "BOTTOM" | "CENTRE" | ""
  quantity: number
  fireRated: boolean
}

export interface LockConfig {
  lockType: string
  lockBrand: string
  lockModel: string
  cylinderType: string
  handleType: string
  keyedAlike: boolean
  keyedAlikeGroup: string
  lockNotes: string
  unitCost: number
}

export interface FinishConfig {
  coatingStandard: string // C1-C5, CX, BESPOKE
  paintSystem: string
  ralColour: string
  bsColour: string
  customColour: string
  finishType: "GLOSS" | "SEMI_GLOSS" | "SATIN" | "MATT" | "TEXTURED" | ""
  galvanised: boolean
  galvType: "HOT_DIP" | "ELECTRO" | "SHERARDISED" | ""
  dft: number | null // dry film thickness, microns
  coatingNotes: string
  estimatedSurfaceArea: number | null // m²
  coatingCost: number | null
}

export interface SelectedFeatureTag {
  tagId: string
  name: string
  code: string
  category: string
  unitCost: number
  unit: string
  quantity: number
  totalCost: number
}

export interface LiftingConfig {
  required: "YES" | "NO" | "TBC"
  estimatedWeight: number | null // kg
  maxLiftHeight: number | null // metres
  craneRequired: "YES" | "NO" | "TBC"
  siteAccessNotes: string
  liftingPlanCost: number | null
  deliveryNotes: string
}

// Combined config for a fully configured product
export interface ProductConfig {
  dimensions: DimensionsConfig
  transome: TransomeConfig
  vent: VentConfig
  lock: LockConfig
  finish: FinishConfig
  features: SelectedFeatureTag[]
  lifting: LiftingConfig
}

// Feature tag from the database
export interface FeatureTagData {
  id: string
  name: string
  code: string
  category: string
  description: string | null
  unitCost: number
  unit: string
  defaultQuantity: number
  autoCalcFromDimensions: boolean
  autoCalcFormula: string | null
  applicableProducts: string[] | null
  isActive: boolean
  sortOrder: number
}

// ─── Simplified single-page configurator types ──────────────────────────────

export interface SimpleProductConfig {
  width: number | null
  height: number | null
  handing: "LH" | "RH" | ""
  lock: string      // simple dropdown value
  colour: string    // RAL code or custom string
  paintFinish: string // simple dropdown value
  fixings: string   // simple dropdown value
  // Feature toggles
  pullHandles: boolean
  doorCloser: boolean
  doorStay: boolean
  kickPlates: boolean
  transom: boolean
  earthing: boolean
  // Transom conditional
  transomHeight: number | null // mm — only when transom=true
  // Notes
  notes: string
}

export const defaultSimpleConfig: SimpleProductConfig = {
  width: null,
  height: null,
  handing: "",
  lock: "",
  colour: "",
  paintFinish: "",
  fixings: "",
  pullHandles: false,
  doorCloser: false,
  doorStay: false,
  kickPlates: false,
  transom: false,
  earthing: false,
  transomHeight: null,
  notes: "",
}

// Dropdown options for the simplified configurator
export const HANDING_OPTIONS = [
  { value: "LH", label: "Left Hand (LH)" },
  { value: "RH", label: "Right Hand (RH)" },
] as const

export const SIMPLE_LOCK_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "SINGLE_DEADLOCK", label: "Single deadlock" },
  { value: "3PT_MULTIPOINT", label: "3-point multipoint" },
  { value: "5PT_MULTIPOINT", label: "5-point multipoint" },
  { value: "PANIC_BAR", label: "Panic bar" },
  { value: "MAG_LOCK", label: "Mag lock" },
  { value: "SLAM_LOCK", label: "Slam lock" },
  { value: "TBC", label: "TBC" },
] as const

export const PAINT_FINISH_OPTIONS = [
  { value: "POWDER_COAT", label: "Powder coat" },
  { value: "WET_SPRAY", label: "Wet spray" },
  { value: "GALVANISED", label: "Galvanised" },
  { value: "GALV_AND_PAINT", label: "Galv + paint" },
  { value: "TBC", label: "TBC" },
] as const

export const FIXINGS_OPTIONS = [
  { value: "STANDARD", label: "Standard" },
  { value: "HEAVY_DUTY", label: "Heavy duty" },
  { value: "CHEMICAL_ANCHORS", label: "Chemical anchors" },
  { value: "TBC", label: "TBC" },
] as const

// ─── Legacy defaults (used by quote builder and existing config steps) ──────

export const defaultDimensions: DimensionsConfig = {
  width: null,
  height: null,
  depth: null,
  leafConfig: "SINGLE",
  openingDirection: "",
  handing: "",
  clearOpening: null,
  structuralOpening: null,
}

export const defaultTransome: TransomeConfig = {
  enabled: false,
  type: "",
  position: "",
  height: null,
  material: "",
}

export const defaultVent: VentConfig = {
  enabled: false,
  type: "",
  size: "",
  customWidth: null,
  customHeight: null,
  position: "",
  quantity: 1,
  fireRated: false,
}

export const defaultLock: LockConfig = {
  lockType: "",
  lockBrand: "",
  lockModel: "",
  cylinderType: "",
  handleType: "",
  keyedAlike: false,
  keyedAlikeGroup: "",
  lockNotes: "",
  unitCost: 0,
}

export const defaultFinish: FinishConfig = {
  coatingStandard: "",
  paintSystem: "",
  ralColour: "",
  bsColour: "",
  customColour: "",
  finishType: "",
  galvanised: false,
  galvType: "",
  dft: null,
  coatingNotes: "",
  estimatedSurfaceArea: null,
  coatingCost: null,
}

export const defaultLifting: LiftingConfig = {
  required: "TBC",
  estimatedWeight: null,
  maxLiftHeight: null,
  craneRequired: "TBC",
  siteAccessNotes: "",
  liftingPlanCost: null,
  deliveryNotes: "",
}

// Helper: calculate perimeter in mm
export function calcPerimeter(w: number | null, h: number | null): number {
  if (!w || !h) return 0
  return 2 * (w + h)
}

// Helper: calculate surface area in m²
export function calcSurfaceArea(w: number | null, h: number | null): number {
  if (!w || !h) return 0
  return (w * h) / 1_000_000
}

// Helper: calculate clear opening (width minus frame allowance)
export function calcClearOpening(width: number | null, leafConfig: string): number | null {
  if (!width) return null
  const frameAllowance = leafConfig === "DOUBLE" ? 120 : 60 // mm frame deduction
  return Math.max(0, width - frameAllowance)
}

// Helper: estimate weight from dimensions (rough steel calculation)
export function estimateWeight(w: number | null, h: number | null, depth: number | null): number | null {
  if (!w || !h) return null
  const area = (w * h) / 1_000_000 // m²
  const steelDensity = 7850 // kg/m³
  const avgThickness = (depth || 50) / 1000 // default 50mm depth → metres
  const fillFactor = 0.15 // ~15% of volume is steel (frame + infill)
  return Math.round(area * avgThickness * steelDensity * fillFactor)
}

// Common RAL colours used in UK steel/construction
export const COMMON_RAL_COLOURS = [
  { code: "RAL 1003", name: "Signal Yellow", hex: "#F9A800" },
  { code: "RAL 1021", name: "Colza Yellow", hex: "#EEC900" },
  { code: "RAL 2004", name: "Pure Orange", hex: "#E75B12" },
  { code: "RAL 3000", name: "Flame Red", hex: "#A72920" },
  { code: "RAL 3020", name: "Traffic Red", hex: "#C1121C" },
  { code: "RAL 5002", name: "Ultramarine Blue", hex: "#00387B" },
  { code: "RAL 5005", name: "Signal Blue", hex: "#004F7C" },
  { code: "RAL 5010", name: "Gentian Blue", hex: "#004F7F" },
  { code: "RAL 5012", name: "Light Blue", hex: "#3481B8" },
  { code: "RAL 5015", name: "Sky Blue", hex: "#007CB0" },
  { code: "RAL 5024", name: "Pastel Blue", hex: "#6093B8" },
  { code: "RAL 6005", name: "Moss Green", hex: "#0F4336" },
  { code: "RAL 6009", name: "Fir Green", hex: "#27352A" },
  { code: "RAL 6029", name: "Mint Green", hex: "#006B3F" },
  { code: "RAL 7001", name: "Silver Grey", hex: "#8C969D" },
  { code: "RAL 7004", name: "Signal Grey", hex: "#9EA0A1" },
  { code: "RAL 7011", name: "Iron Grey", hex: "#52595D" },
  { code: "RAL 7012", name: "Basalt Grey", hex: "#575D5E" },
  { code: "RAL 7015", name: "Slate Grey", hex: "#51565C" },
  { code: "RAL 7016", name: "Anthracite Grey", hex: "#383E42" },
  { code: "RAL 7035", name: "Light Grey", hex: "#C5C7C4" },
  { code: "RAL 7037", name: "Dusty Grey", hex: "#7A7B7A" },
  { code: "RAL 7040", name: "Window Grey", hex: "#989EA1" },
  { code: "RAL 7042", name: "Traffic Grey A", hex: "#8F9695" },
  { code: "RAL 7044", name: "Silk Grey", hex: "#B8B799" },
  { code: "RAL 8017", name: "Chocolate Brown", hex: "#44322D" },
  { code: "RAL 9001", name: "Cream", hex: "#EFEBDC" },
  { code: "RAL 9002", name: "Grey White", hex: "#D7D5CB" },
  { code: "RAL 9003", name: "Signal White", hex: "#ECE9D8" },
  { code: "RAL 9005", name: "Jet Black", hex: "#0E0E10" },
  { code: "RAL 9006", name: "White Aluminium", hex: "#A1A1A0" },
  { code: "RAL 9010", name: "Pure White", hex: "#F1ECE1" },
  { code: "RAL 9016", name: "Traffic White", hex: "#F1F0EA" },
]

// Coating standards with descriptions and default DFT
export const COATING_STANDARDS = [
  { value: "C1", label: "C1 — Very Low", description: "Dry interiors", defaultDft: 80 },
  { value: "C2", label: "C2 — Low", description: "Low pollution, rural", defaultDft: 120 },
  { value: "C3", label: "C3 — Medium", description: "Urban, moderate industrial", defaultDft: 200 },
  { value: "C4", label: "C4 — High", description: "Industrial, coastal moderate", defaultDft: 240 },
  { value: "C5", label: "C5 — Very High", description: "Industrial, coastal severe", defaultDft: 320 },
  { value: "CX", label: "CX — Extreme", description: "Offshore, immersed", defaultDft: 400 },
  { value: "BESPOKE", label: "Bespoke / Specify", description: "Custom specification", defaultDft: null },
]

// Vent size presets
export const VENT_SIZES = {
  SMALL: { width: 150, height: 150, label: "Small (150×150)" },
  MEDIUM: { width: 300, height: 300, label: "Medium (300×300)" },
  LARGE: { width: 450, height: 450, label: "Large (450×450)" },
  CUSTOM: { width: null, height: null, label: "Custom" },
}

// Weight threshold for auto-triggering lifting plan
export const LIFTING_PLAN_WEIGHT_THRESHOLD = 250 // kg
