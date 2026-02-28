// Role-based access control — aligned with JRD definitions

export type Permission =
  | "projects:read" | "projects:create" | "projects:edit" | "projects:delete"
  | "quotes:read" | "quotes:create" | "quotes:edit" | "quotes:delete" | "quotes:approve"
  | "products:read" | "products:edit"
  | "purchasing:read" | "purchasing:create" | "purchasing:edit" | "purchasing:approve-high"
  | "finance:read" | "finance:edit"
  | "customers:read" | "customers:create" | "customers:edit"
  | "suppliers:read" | "suppliers:create" | "suppliers:edit"
  | "team:read" | "team:edit"
  | "catalogue:read" | "catalogue:edit"
  | "reports:read"
  | "import:use"
  | "settings:admin"
  | "variations:read" | "variations:create" | "variations:edit"
  | "ncrs:read" | "ncrs:create" | "ncrs:edit"
  | "audit:read"
  | "portal:manage"
  | "crm:read" | "crm:create" | "crm:edit" | "crm:delete" | "crm:convert"
  | "design:read" | "design:manage" | "design:assign"
  | "design:start" | "design:review" | "design:signoff"
  | "design:handover-create" | "design:handover-acknowledge"
  | "production:read" | "production:manage" | "production:inspect"
  | "dashboards:read"

// ── Read-only base (everyone gets these) ──
const BASE_READ: Permission[] = [
  "projects:read", "quotes:read", "products:read", "purchasing:read",
  "finance:read", "customers:read", "suppliers:read", "catalogue:read",
  "reports:read", "team:read", "ncrs:read", "variations:read", "crm:read",
  "design:read", "production:read",
]

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // ── ADMIN — full access ──
  ADMIN: [
    ...BASE_READ,
    "projects:create", "projects:edit", "projects:delete",
    "quotes:create", "quotes:edit", "quotes:delete", "quotes:approve",
    "products:edit",
    "purchasing:create", "purchasing:edit", "purchasing:approve-high",
    "finance:edit",
    "customers:create", "customers:edit",
    "suppliers:create", "suppliers:edit",
    "team:edit",
    "catalogue:edit",
    "import:use", "settings:admin",
    "variations:create", "variations:edit",
    "ncrs:create", "ncrs:edit",
    "audit:read", "portal:manage",
    "crm:create", "crm:edit", "crm:delete", "crm:convert",
    "design:manage", "design:assign",
    "design:start", "design:review", "design:signoff",
    "design:handover-create", "design:handover-acknowledge",
    "production:manage", "production:inspect",
    "dashboards:read",
  ],

  // ── Directors ──
  MANAGING_DIRECTOR: [
    ...BASE_READ,
    "projects:create", "projects:edit",
    "quotes:create", "quotes:edit", "quotes:approve",
    "products:edit",
    "purchasing:create", "purchasing:edit", "purchasing:approve-high",
    "finance:edit",
    "customers:create", "customers:edit",
    "suppliers:create", "suppliers:edit",
    "catalogue:edit",
    "variations:create", "variations:edit",
    "ncrs:create", "ncrs:edit",
    "audit:read",
    "crm:create", "crm:edit", "crm:convert",
    "design:manage", "design:assign", "design:signoff",
    "design:handover-create", "design:handover-acknowledge",
    "production:manage", "production:inspect",
    "dashboards:read",
  ],
  TECHNICAL_DIRECTOR: [
    ...BASE_READ,
    "projects:create", "projects:edit",
    "quotes:create", "quotes:edit", "quotes:approve",
    "products:edit",
    "purchasing:create", "purchasing:edit", "purchasing:approve-high",
    "finance:edit",
    "customers:create", "customers:edit",
    "suppliers:create", "suppliers:edit",
    "catalogue:edit",
    "variations:create", "variations:edit",
    "ncrs:create", "ncrs:edit",
    "audit:read",
    "crm:create", "crm:edit", "crm:convert",
    "design:manage", "design:assign", "design:signoff",
    "design:handover-create", "design:handover-acknowledge",
    "production:manage", "production:inspect",
    "dashboards:read",
  ],
  SALES_DIRECTOR: [
    ...BASE_READ,
    "projects:create",
    "quotes:create", "quotes:edit", "quotes:approve",
    "customers:create", "customers:edit",
    "crm:create", "crm:edit", "crm:delete", "crm:convert",
    "dashboards:read",
  ],
  DIRECTOR: [
    ...BASE_READ,
    "projects:create", "projects:edit",
    "quotes:create", "quotes:edit",
    "products:edit",
    "purchasing:create", "purchasing:edit",
    "customers:create", "customers:edit",
    "suppliers:create", "suppliers:edit",
    "variations:create", "variations:edit",
    "ncrs:create", "ncrs:edit",
    "crm:create", "crm:edit", "crm:convert",
    "dashboards:read",
  ],

  // ── Engineering ──
  ENGINEERING_MANAGER: [
    ...BASE_READ,
    "projects:create", "projects:edit",
    "quotes:create", "quotes:edit",
    "products:edit",
    "purchasing:create", "purchasing:edit",
    "suppliers:create",
    "catalogue:edit",
    "variations:create", "variations:edit",
    "ncrs:create", "ncrs:edit",
    "design:manage", "design:assign",
    "design:start", "design:review", "design:signoff",
    "design:handover-create",
    "dashboards:read",
  ],
  DESIGN_ENGINEER: [
    ...BASE_READ,
    "products:edit",
    "purchasing:create",
    "ncrs:create",
    "design:start", "design:review",
  ],

  // ── R&D ──
  R_AND_D_MANAGER: [
    ...BASE_READ,
    "projects:create", "projects:edit",
    "products:edit",
    "purchasing:create", "purchasing:edit",
    "suppliers:create",
    "catalogue:edit",
    "ncrs:create", "ncrs:edit",
    "design:start", "design:review",
  ],

  // ── Production ──
  PRODUCTION_MANAGER: [
    ...BASE_READ,
    "projects:edit",
    "products:edit",
    "purchasing:create", "purchasing:edit",
    "suppliers:create",
    "ncrs:create", "ncrs:edit",
    "design:handover-acknowledge",
    "production:manage", "production:inspect",
    "dashboards:read",
  ],
  PRODUCTION_SUPERVISOR: [
    ...BASE_READ,
    "products:edit",
    "purchasing:create",
    "ncrs:create", "ncrs:edit",
    "production:manage", "production:inspect",
  ],
  PRODUCTION_PLANNER: [
    ...BASE_READ,
    "products:edit",
    "purchasing:create",
    "production:manage",
  ],

  // ── Projects ──
  PROJECT_MANAGER: [
    ...BASE_READ,
    "projects:create", "projects:edit",
    "quotes:create", "quotes:edit",
    "products:edit",
    "purchasing:create", "purchasing:edit",
    "customers:create", "customers:edit",
    "suppliers:create",
    "variations:create", "variations:edit",
    "ncrs:create", "ncrs:edit",
    "crm:create", "crm:edit", "crm:convert",
    "design:manage", "design:assign", "design:handover-create",
  ],
  PROJECT_COORDINATOR: [
    ...BASE_READ,
    "projects:create", "projects:edit",
    "products:edit",
    "purchasing:create", "purchasing:edit",
    "suppliers:create",
    "variations:create", "variations:edit",
    "ncrs:create", "ncrs:edit",
    "design:manage", "design:assign", "design:handover-create",
  ],
  PROJECT_ADMINISTRATOR: [
    ...BASE_READ,
    "projects:create", "projects:edit",
    "products:edit",
    "purchasing:create",
    "customers:create",
    "ncrs:create",
  ],

  // ── Sales / Business Development ──
  BUSINESS_DEVELOPMENT: [
    ...BASE_READ,
    "projects:create",
    "quotes:create", "quotes:edit",
    "customers:create", "customers:edit",
    "crm:create", "crm:edit", "crm:convert",
  ],

  // ── Finance / IT / Procurement ──
  HEAD_OF_FINANCE_IT_PROCUREMENT: [
    ...BASE_READ,
    "projects:edit",
    "purchasing:create", "purchasing:edit", "purchasing:approve-high",
    "finance:edit",
    "customers:create", "customers:edit",
    "suppliers:create", "suppliers:edit",
    "audit:read",
    "dashboards:read",
  ],
  FINANCE_MANAGER: [
    ...BASE_READ,
    "purchasing:create", "purchasing:edit", "purchasing:approve-high",
    "finance:edit",
    "audit:read",
    "dashboards:read",
  ],
  ACCOUNTS: [
    ...BASE_READ,
    "purchasing:create", "purchasing:edit",
    "finance:edit",
  ],

  // ── Site ──
  SITE_MANAGER: [
    ...BASE_READ,
    "projects:edit",
    "products:edit",
    "ncrs:create", "ncrs:edit",
  ],
  SITE_SUPERVISOR: [
    ...BASE_READ,
    "ncrs:create",
  ],

  // ── Other ──
  SURVEYOR: [
    ...BASE_READ,
    "crm:create", "crm:edit",
  ],
  STAFF: [...BASE_READ],
}

// Legacy role mapping — ensures old role strings still resolve to permissions
const LEGACY_ROLE_MAP: Record<string, string> = {
  ESTIMATOR: "BUSINESS_DEVELOPMENT",
  DESIGNER: "DESIGN_ENGINEER",
  VIEWER: "STAFF",
}

function resolveRole(role: string): string {
  return LEGACY_ROLE_MAP[role] || role
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[resolveRole(role)]
  if (!perms) return false
  return perms.includes(permission)
}

export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function getPermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[resolveRole(role)] || []
}

export function canEdit(role: string): boolean {
  return role !== "STAFF"
}

/** Roles that can be assigned design work */
export const DESIGN_CAPABLE_ROLES = [
  "DESIGN_ENGINEER", "ENGINEERING_MANAGER", "R_AND_D_MANAGER", "ADMIN",
] as const

/** Roles that see the management dashboards */
export const DASHBOARD_ROLES = [
  "MANAGING_DIRECTOR", "TECHNICAL_DIRECTOR", "SALES_DIRECTOR",
  "HEAD_OF_FINANCE_IT_PROCUREMENT", "FINANCE_MANAGER",
  "ENGINEERING_MANAGER", "PRODUCTION_MANAGER", "ADMIN",
] as const

/** Roles that can access KPI reports and performance data */
export const MANAGEMENT_ROLES = [
  "MANAGING_DIRECTOR", "TECHNICAL_DIRECTOR", "SALES_DIRECTOR", "DIRECTOR",
  "ENGINEERING_MANAGER", "PRODUCTION_MANAGER", "PROJECT_MANAGER",
  "HEAD_OF_FINANCE_IT_PROCUREMENT", "FINANCE_MANAGER", "ADMIN",
] as const

export function isManagerOrDirector(role: string): boolean {
  return (MANAGEMENT_ROLES as readonly string[]).includes(resolveRole(role))
}
