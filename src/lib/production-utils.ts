// Production Module — shared utilities and constants

// All production stages in order (for manual progress updates)
export const ALL_PRODUCTION_STAGES = [
  "AWAITING",
  "CUTTING",
  "FABRICATION",
  "FITTING",
  "SHOTBLASTING",
  "PAINTING",
  "PACKING",
  "COMPLETED",
] as const

export const ALL_STAGE_DISPLAY_NAMES: Record<string, string> = {
  AWAITING: "Awaiting",
  CUTTING: "Cutting",
  FABRICATION: "Weld/Fab",
  FITTING: "Pre-Fit/Fitting",
  SHOTBLASTING: "Shotblast",
  PAINTING: "Painting",
  PACKING: "Packing",
  COMPLETED: "Completed",
}

// Mapping from stage to the worker role that handles it
export const STAGE_WORKER_ROLES: Record<string, string> = {
  CUTTING: "CUTTER",
  FABRICATION: "WELDER",
  FITTING: "FITTER",
  SHOTBLASTING: "PAINTER",
  PAINTING: "PAINTER",
  PACKING: "PACKER",
}

// The 6 workshop stages (subset of ProductionStage enum used for dashboard columns)
export const WORKSHOP_STAGES = [
  "CUTTING",
  "FABRICATION",
  "FITTING",
  "SHOTBLASTING",
  "PAINTING",
  "PACKING",
] as const

export type WorkshopStage = (typeof WORKSHOP_STAGES)[number]

// Display name mapping (existing enum → spec labels)
export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  CUTTING: "Cutting",
  FABRICATION: "Weld/Fab",
  FITTING: "Pre-Fit/Fitting",
  SHOTBLASTING: "Shotblast",
  PAINTING: "Painting",
  PACKING: "Packing",
}

// Stage colors for column top-borders
export const STAGE_BORDER_COLORS: Record<string, string> = {
  CUTTING: "border-t-orange-500",
  FABRICATION: "border-t-amber-500",
  FITTING: "border-t-yellow-500",
  SHOTBLASTING: "border-t-lime-500",
  PAINTING: "border-t-teal-500",
  PACKING: "border-t-cyan-500",
}

// Stage background tints (subtle, for column headers)
export const STAGE_BG_COLORS: Record<string, string> = {
  CUTTING: "bg-orange-50",
  FABRICATION: "bg-amber-50",
  FITTING: "bg-yellow-50",
  SHOTBLASTING: "bg-lime-50",
  PAINTING: "bg-teal-50",
  PACKING: "bg-cyan-50",
}

// Card left-border color based on schedule status
export function getCardScheduleColor(
  targetDate: string | Date | null,
  status?: string
): string {
  if (status === "ON_HOLD" || status === "BLOCKED")
    return "border-l-amber-500"
  if (!targetDate) return "border-l-gray-300"
  const target = new Date(targetDate)
  const now = new Date()
  const diffDays = Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays < 0) return "border-l-red-500"
  if (diffDays <= 7) return "border-l-amber-500"
  return "border-l-green-500"
}

// Get the next stage in the workflow
export function getNextStage(current: string): string | null {
  const idx = WORKSHOP_STAGES.indexOf(current as WorkshopStage)
  if (idx < 0 || idx >= WORKSHOP_STAGES.length - 1) return null
  return WORKSHOP_STAGES[idx + 1]
}

// Get the previous stage
export function getPreviousStage(current: string): string | null {
  const idx = WORKSHOP_STAGES.indexOf(current as WorkshopStage)
  if (idx <= 0) return null
  return WORKSHOP_STAGES[idx - 1]
}

// Task status display labels
export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Queued",
  IN_PROGRESS: "Active",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
  ON_HOLD: "On Hold",
  REWORK: "Rework",
}

export const TASK_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  BLOCKED: "bg-red-100 text-red-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  REWORK: "bg-purple-100 text-purple-700",
}

// ═══════════════════ Work Streams ═══════════════════

export const WORK_STREAMS = [
  "UTILITIES",
  "BESPOKE",
  "COMMUNITY",
  "BLAST",
  "REFURBISHMENT",
] as const
export type WorkStreamValue = (typeof WORK_STREAMS)[number]

export const WORK_STREAM_LABELS: Record<string, string> = {
  UTILITIES: "Utility",
  BESPOKE: "Bespoke",
  COMMUNITY: "Community",
  BLAST: "Blast",
  REFURBISHMENT: "Refurbishment",
}

export const WORK_STREAM_COLORS: Record<string, { badge: string; bg: string; border: string }> = {
  UTILITIES:     { badge: "bg-blue-100 text-blue-700",    bg: "bg-blue-50/50",    border: "border-blue-200" },
  BESPOKE:       { badge: "bg-purple-100 text-purple-700", bg: "bg-purple-50/50", border: "border-purple-200" },
  COMMUNITY:     { badge: "bg-green-100 text-green-700",  bg: "bg-green-50/50",   border: "border-green-200" },
  BLAST:         { badge: "bg-orange-100 text-orange-700", bg: "bg-orange-50/50", border: "border-orange-200" },
  REFURBISHMENT: { badge: "bg-teal-100 text-teal-700",    bg: "bg-teal-50/50",    border: "border-teal-200" },
}

// Product-level lane — single lane for all production (ICU elevated separately)
export const PRODUCT_LANES = ["STANDARD"] as const
export type ProductLane = (typeof PRODUCT_LANES)[number]

export const PRODUCT_LANE_CONFIG: Record<
  ProductLane,
  { label: string; subtitle: string; borderColor: string; bgFrom: string; bgVia: string; bgTo: string; accentColor: string; textColor: string; dotColor: string; cellEmptyColor: string }
> = {
  STANDARD: {
    label: "Production",
    subtitle: "All work streams",
    borderColor: "border-gray-300",
    bgFrom: "from-gray-50/80",
    bgVia: "via-white/40",
    bgTo: "to-gray-50/80",
    accentColor: "bg-gray-400",
    textColor: "text-gray-700",
    dotColor: "bg-gray-400",
    cellEmptyColor: "text-gray-300",
  },
}

// All products go into the single STANDARD lane
export function getProductLane(): ProductLane {
  return "STANDARD"
}

// Get primary production stage for a project (based on its products/tasks)
export function getProjectPrimaryStage(project: {
  products?: Array<{ productionStatus?: string | null }>
}): string | null {
  if (!project.products?.length) return null
  // The "current" stage is the earliest stage any product is at
  const stages = project.products
    .map((p) => p.productionStatus)
    .filter((s): s is string => s !== null && s !== undefined)
  if (!stages.length) return null

  for (const stage of WORKSHOP_STAGES) {
    if (stages.includes(stage)) return stage
  }
  return stages[0]
}

// ═══════════════════ Production Grid Constants ═══════════════════

// Full pipeline: Design + all workshop stages
export const GRID_STAGES = ["DESIGN", ...WORKSHOP_STAGES] as const
export type GridStage = (typeof GRID_STAGES)[number]

// Number of parallel workstations per stage
// Design count is dynamically set from DB designers; this is the fallback
export const STATION_COUNTS: Record<string, number> = {
  DESIGN: 7,
  CUTTING: 1,
  FABRICATION: 6,
  FITTING: 2,
  SHOTBLASTING: 1,
  PAINTING: 2,
  PACKING: 2,
}

// Default display labels (Design labels are overridden dynamically from DB)
export const STATION_LABELS: Record<string, string[]> = {
  DESIGN: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
  CUTTING: ["C1"],
  FABRICATION: ["W1", "W2", "W3", "W4", "W5", "W6"],
  FITTING: ["F1", "F2"],
  SHOTBLASTING: ["S1"],
  PAINTING: ["P1", "P2"],
  PACKING: ["K1", "K2"],
}

// Mapping from workshop stage to the Product database field name
export const STAGE_HOUR_FIELDS: Record<string, string> = {
  CUTTING: "productionCuttingHours",
  FABRICATION: "productionFabricationHours",
  FITTING: "productionFittingHours",
  SHOTBLASTING: "productionShotblastingHours",
  PAINTING: "productionPaintingHours",
  PACKING: "productionPackingHours",
}

// Default stage durations in working HOURS (allows multiple products per day)
export const DEFAULT_STAGE_HOURS: Record<string, number> = {
  DESIGN: 40,          // 5 days
  CUTTING: 3,          // ~3 hours — very quick, multiple per day
  FABRICATION: 24,     // 3 days
  FITTING: 16,         // 2 days
  SHOTBLASTING: 4,     // half day
  PAINTING: 16,        // 2 days (includes drying)
  PACKING: 8,          // 1 day
}

// Grid stage display names (extends STAGE_DISPLAY_NAMES with Design)
export const GRID_STAGE_DISPLAY_NAMES: Record<string, string> = {
  DESIGN: "Design",
  ...STAGE_DISPLAY_NAMES,
}

// 20 visually distinct colors for project identification on the grid
export const PROJECT_COLOR_PALETTE = [
  { bg: "bg-orange-300",  text: "text-orange-950",  hex: "#fdba74" },
  { bg: "bg-blue-300",    text: "text-blue-950",    hex: "#93c5fd" },
  { bg: "bg-green-300",   text: "text-green-950",   hex: "#86efac" },
  { bg: "bg-purple-300",  text: "text-purple-950",  hex: "#d8b4fe" },
  { bg: "bg-red-300",     text: "text-red-950",     hex: "#fca5a5" },
  { bg: "bg-cyan-300",    text: "text-cyan-950",    hex: "#67e8f9" },
  { bg: "bg-amber-300",   text: "text-amber-950",   hex: "#fcd34d" },
  { bg: "bg-pink-300",    text: "text-pink-950",    hex: "#f9a8d4" },
  { bg: "bg-teal-300",    text: "text-teal-950",    hex: "#5eead4" },
  { bg: "bg-indigo-300",  text: "text-indigo-950",  hex: "#a5b4fc" },
  { bg: "bg-lime-300",    text: "text-lime-950",    hex: "#bef264" },
  { bg: "bg-rose-300",    text: "text-rose-950",    hex: "#fda4af" },
  { bg: "bg-violet-300",  text: "text-violet-950",  hex: "#c4b5fd" },
  { bg: "bg-emerald-300", text: "text-emerald-950", hex: "#6ee7b7" },
  { bg: "bg-fuchsia-300", text: "text-fuchsia-950", hex: "#f0abfc" },
  { bg: "bg-sky-300",     text: "text-sky-950",     hex: "#7dd3fc" },
  { bg: "bg-yellow-300",  text: "text-yellow-950",  hex: "#fde047" },
  { bg: "bg-stone-400",   text: "text-stone-950",   hex: "#a8a29e" },
  { bg: "bg-blue-400",    text: "text-white",       hex: "#60a5fa" },
  { bg: "bg-red-400",     text: "text-white",       hex: "#f87171" },
] as const

// Calculate dashboard stats
export function calculateDashboardStats(
  projects: Array<{
    targetCompletion?: string | Date | null
    isICUFlag: boolean
    contractValue?: string | number | null
    _count?: { products?: number; ncrs?: number }
    products?: Array<{ productionStatus?: string | null }>
  }>
) {
  const now = new Date()
  return {
    totalProjects: projects.length,
    totalProducts: projects.reduce(
      (s, p) => s + (p._count?.products || 0),
      0
    ),
    totalValue: projects.reduce(
      (s, p) => s + Number(p.contractValue || 0),
      0
    ),
    overdue: projects.filter((p) => {
      if (!p.targetCompletion) return false
      return new Date(p.targetCompletion) < now
    }).length,
    icuCount: projects.filter((p) => p.isICUFlag).length,
    ncrCount: projects.reduce((s, p) => s + (p._count?.ncrs || 0), 0),
  }
}
