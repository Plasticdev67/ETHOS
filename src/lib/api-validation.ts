import { z } from "zod"
import { NextResponse } from "next/server"

/**
 * Validate request body against a Zod schema.
 * Returns parsed data on success, or a 400 NextResponse on validation failure.
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    return result.data
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }
}

/** Helper to check if a validateBody result is an error response */
export function isValidationError(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}

// ── Reusable field schemas ──────────────────────────────────────

const decimal = z.union([z.string(), z.number()]).optional().nullable()
const optionalString = z.string().optional().nullable()
const optionalDate = z.string().datetime({ offset: true }).or(z.string().date()).optional().nullable()

// ── Route schemas ───────────────────────────────────────────────

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  customerId: optionalString,
  coordinatorId: optionalString,
  projectManagerId: optionalString,
  installManagerId: optionalString,
  projectType: z.enum(["STANDARD", "BESPOKE_MAJOR"]).optional(),
  workStream: z.enum(["UTILITIES", "BESPOKE", "COMMUNITY", "BLAST", "BUND_CONTAINMENT", "REFURBISHMENT"]).optional(),
  salesStage: z.enum(["OPPORTUNITY", "QUOTED", "ORDER"]).optional(),
  projectStatus: z.enum(["OPPORTUNITY", "QUOTATION", "DESIGN", "DESIGN_FREEZE", "MANUFACTURE", "INSTALLATION", "REVIEW", "COMPLETE"]).optional(),
  contractType: z.enum(["NEC", "STANDARD", "FRAMEWORK_CALLOFF", "OTHER"]).optional(),
  priority: z.enum(["NORMAL", "HIGH", "CRITICAL"]).optional(),
  estimatedValue: decimal,
  contractValue: decimal,
  siteLocation: optionalString,
  deliveryType: optionalString,
  projectRegion: optionalString,
  notes: optionalString,
  enquiryReceived: optionalDate,
  targetCompletion: optionalDate,
  quoteId: optionalString,
})

export const customerCreateSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  customerType: z.string().optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: optionalString,
  address: optionalString,
  postcode: optionalString,
  notes: optionalString,
  accountCode: optionalString,
  vatNumber: optionalString,
  paymentTerms: optionalString,
})

export const supplierCreateSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: optionalString,
  address: optionalString,
  postcode: optionalString,
  whatTheySupply: optionalString,
  notes: optionalString,
  category: optionalString,
  accountCode: optionalString,
  vatNumber: optionalString,
  paymentTerms: optionalString,
})

export const quoteCreateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  projectId: optionalString,
  subject: optionalString,
  notes: optionalString,
  createdById: optionalString,
})

export const purchaseOrderCreateSchema = z.object({
  supplierId: optionalString,
  projectId: optionalString,
  status: optionalString,
  dateSent: optionalDate,
  expectedDelivery: optionalDate,
  notes: optionalString,
  totalValue: decimal,
  lines: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: decimal,
    totalCost: decimal,
    bomLineId: optionalString,
  })).optional(),
})

export const variationCreateSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  description: optionalString,
  type: optionalString,
  costImpact: decimal,
  valueImpact: decimal,
  raisedBy: optionalString,
  notes: optionalString,
})

export const ncrCreateSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  productId: optionalString,
  description: optionalString,
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]).optional(),
  costImpact: decimal,
  rootCause: optionalString,
  originStage: optionalString,
  returnToStage: optionalString,
  requireDesignRework: z.boolean().optional(),
})

export const opportunityCreateSchema = z.object({
  prospectId: z.string().min(1, "Prospect is required"),
  name: z.string().min(1, "Name is required"),
  description: optionalString,
  estimatedValue: decimal,
  contactPerson: optionalString,
  leadSource: optionalString,
  status: optionalString,
  expectedCloseDate: optionalDate,
  notes: optionalString,
})

export const catalogueCreateSchema = z.object({
  partCode: z.string().min(1, "Part code is required"),
  description: z.string().min(1, "Description is required"),
  classId: optionalString,
  defaultUnits: optionalString,
  guideUnitCost: decimal,
  guideMarginPercent: decimal,
})
