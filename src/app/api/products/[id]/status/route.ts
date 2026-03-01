import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

// Date fields on the Product model
const DATE_FIELDS = new Set([
  "appraisalTargetDate", "appraisalFinishDate",
  "designPlannedStart", "designTargetDate", "designCompletionDate",
  "opsPlannedStart", "opsTargetDate", "opsCompletionDate",
  "productionPlannedStart", "productionTargetDate", "productionCompletionDate",
  "installPlannedStart", "installTargetDate", "installCompletionDate",
  "reviewCompletedDate", "requiredCompletionDate",
])

// Decimal/hours fields on the Product model
const DECIMAL_FIELDS = new Set([
  "designEstimatedHours", "productionEstimatedHours",
  "installEstimatedHours", "opsEstimatedHours",
  "productionCuttingHours", "productionFabricationHours",
  "productionFittingHours", "productionShotblastingHours",
  "productionPaintingHours", "productionPackingHours",
])

// String fields that can be set directly
const STRING_FIELDS = new Set([
  "currentOperationalStatus", "progressMonitor", "appraisalStatus",
  "drawingNumber", "designStatus", "installStatus", "opsStatus",
  "notes", "partCode", "description", "additionalDetails",
  "productJobNumber",
])

// Enum fields
const ENUM_FIELDS = new Set([
  "currentDepartment", "productionStatus",
])

// Boolean fields
const BOOLEAN_FIELDS = new Set([
  "asBuiltComplete",
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("projects:edit")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue

    if (ENUM_FIELDS.has(key)) {
      data[key] = value
    } else if (STRING_FIELDS.has(key)) {
      data[key] = value === null ? null : String(value)
    } else if (DATE_FIELDS.has(key)) {
      data[key] = value ? new Date(value as string) : null
    } else if (DECIMAL_FIELDS.has(key)) {
      data[key] = value === null || value === "" ? null : Number(value)
    } else if (BOOLEAN_FIELDS.has(key)) {
      data[key] = Boolean(value)
    } else if (key === "quantity") {
      data[key] = Number(value) || 1
    } else if (key === "allocatedDesignerId" || key === "coordinatorId" || key === "catalogueItemId") {
      data[key] = value || null
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const product = await prisma.product.update({
    where: { id },
    data,
  })

  return NextResponse.json(JSON.parse(JSON.stringify(product)))
}
