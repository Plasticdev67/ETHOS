import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/capacity/load
 * Returns all products that have estimated hours and planned dates,
 * grouped by project — this drives the capacity planning heatmap.
 */
export async function GET() {
  // Fetch all products that have at least one estimated hours field set
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { designEstimatedHours: { not: null } },
        { productionEstimatedHours: { not: null } },
        { installEstimatedHours: { not: null } },
        { opsEstimatedHours: { not: null } },
      ],
    },
    select: {
      id: true,
      partCode: true,
      description: true,
      quantity: true,
      currentDepartment: true,
      // Design
      designPlannedStart: true,
      designTargetDate: true,
      designCompletionDate: true,
      designEstimatedHours: true,
      // Ops
      opsPlannedStart: true,
      opsTargetDate: true,
      opsCompletionDate: true,
      opsEstimatedHours: true,
      // Production
      productionPlannedStart: true,
      productionTargetDate: true,
      productionCompletionDate: true,
      productionEstimatedHours: true,
      // Installation
      installPlannedStart: true,
      installTargetDate: true,
      installCompletionDate: true,
      installEstimatedHours: true,
      // Project info
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          projectStatus: true,
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { project: { projectNumber: "asc" } },
      { partCode: "asc" },
    ],
  })

  // Also fetch products that DON'T have hours but DO have planned dates
  // (to show them as "needs estimation" prompts)
  const unestimated = await prisma.product.findMany({
    where: {
      designEstimatedHours: null,
      productionEstimatedHours: null,
      installEstimatedHours: null,
      opsEstimatedHours: null,
      OR: [
        { designPlannedStart: { not: null } },
        { productionPlannedStart: { not: null } },
        { installPlannedStart: { not: null } },
        { opsPlannedStart: { not: null } },
      ],
    },
    select: {
      id: true,
      partCode: true,
      description: true,
      currentDepartment: true,
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
        },
      },
    },
    orderBy: { project: { projectNumber: "asc" } },
  })

  return NextResponse.json({
    products: JSON.parse(JSON.stringify(products)),
    unestimated: JSON.parse(JSON.stringify(unestimated)),
  })
}
