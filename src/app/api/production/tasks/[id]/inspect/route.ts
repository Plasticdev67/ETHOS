import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { getNextStage } from "@/lib/production-utils"
import type { ProductionStage } from "@/generated/prisma/client"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { revalidatePath } from "next/cache"
import { getNextSequenceNumber } from "@/lib/finance/sequences"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  const denied = await requirePermission("production:inspect")
  if (denied) return denied

  const { id } = await params
  const body = await request.json()
  const {
    decision,
    inspectedBy,
    notes,
    ncrTitle,
    ncrDescription,
    ncrSeverity,
    ncrRootCause,
    ncrCostImpact,
  } = body

  if (!decision || !["ACCEPTED", "REJECTED"].includes(decision)) {
    return NextResponse.json(
      { error: "decision must be ACCEPTED or REJECTED" },
      { status: 400 }
    )
  }

  try {
    const task = await prisma.productionTask.findUnique({
      where: { id },
      include: { product: true, project: true },
    })
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (task.status !== "COMPLETED" || task.inspectionStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Task is not awaiting inspection" },
        { status: 400 }
      )
    }

    const now = new Date()

    if (decision === "ACCEPTED") {
      // Update inspection status
      await prisma.productionTask.update({
        where: { id },
        data: {
          inspectionStatus: "ACCEPTED",
          inspectedBy: inspectedBy || null,
          inspectedAt: now,
          notes: notes || task.notes,
        },
      })

      // Determine next stage
      const nextStage = getNextStage(task.stage) as ProductionStage | null

      if (nextStage) {
        // Get max queue position for next stage
        const maxPos = await prisma.productionTask.findFirst({
          where: { stage: nextStage },
          orderBy: { queuePosition: "desc" },
          select: { queuePosition: true },
        })
        const queuePosition = (maxPos?.queuePosition ?? -1) + 1

        // Create task at next stage
        await prisma.productionTask.create({
          data: {
            productId: task.productId,
            projectId: task.projectId,
            stage: nextStage,
            status: "PENDING",
            queuePosition,
            estimatedMins: task.estimatedMins,
          },
        })

        // Update product's production status
        await prisma.product.update({
          where: { id: task.productId },
          data: { productionStatus: nextStage },
        })
      } else {
        // Last stage (PACKING) — mark product as completed
        await prisma.product.update({
          where: { id: task.productId },
          data: {
            productionStatus: "COMPLETED",
            productionCompletionDate: now,
          },
        })

        // Check if all products in this project are complete
        const incompleteProducts = await prisma.product.count({
          where: {
            projectId: task.projectId,
            productionStatus: { not: "COMPLETED" },
            currentDepartment: "PRODUCTION",
          },
        })

        if (incompleteProducts === 0) {
          // All products complete — update project
          await prisma.project.update({
            where: { id: task.projectId },
            data: {
              departmentStatus: "DONE",
              p4Date: now,
            },
          })
        }
      }

      await logAudit({
        action: "UPDATE",
        entity: "ProductionTask",
        entityId: id,
        field: "inspectionStatus",
        oldValue: "PENDING",
        newValue: "ACCEPTED",
        metadata: JSON.stringify({ stage: task.stage, nextStage }),
      })

      revalidatePath("/production")
      revalidatePath("/production/dashboard")

      return NextResponse.json({ success: true, nextStage })
    }

    // REJECTED — create NCR and rework task
    // Generate NCR number (concurrency-safe)
    const ncrNumber = await getNextSequenceNumber("ncr")

    // Create NCR
    const ncr = await prisma.nonConformanceReport.create({
      data: {
        ncrNumber,
        projectId: task.projectId,
        productId: task.productId,
        title: ncrTitle || `Production NCR - ${task.product.description}`,
        description: ncrDescription || null,
        severity: ncrSeverity || "MINOR",
        status: "OPEN",
        rootCause: ncrRootCause || "PRODUCTION_ERROR",
        originStage: task.stage,
        returnToStage: task.stage,
        costImpact: ncrCostImpact || null,
      },
    })

    // Update the task
    await prisma.productionTask.update({
      where: { id },
      data: {
        inspectionStatus: "REJECTED",
        inspectedBy: inspectedBy || null,
        inspectedAt: now,
        ncrId: ncr.id,
        notes: notes || task.notes,
      },
    })

    // Create a REWORK task at same stage
    const maxPos = await prisma.productionTask.findFirst({
      where: { stage: task.stage, status: { in: ["PENDING", "REWORK"] } },
      orderBy: { queuePosition: "desc" },
      select: { queuePosition: true },
    })
    const queuePosition = (maxPos?.queuePosition ?? -1) + 1

    await prisma.productionTask.create({
      data: {
        productId: task.productId,
        projectId: task.projectId,
        stage: task.stage,
        status: "REWORK",
        queuePosition,
        notes: `Rework required: ${ncrNumber}`,
      },
    })

    // Update product status
    await prisma.product.update({
      where: { id: task.productId },
      data: { productionStatus: "REWORK" },
    })

    // Increment NCR cost on project
    if (ncrCostImpact) {
      await prisma.project.update({
        where: { id: task.projectId },
        data: {
          ncrCost: {
            increment: ncrCostImpact,
          },
        },
      })
    }

    await logAudit({
      action: "UPDATE",
      entity: "ProductionTask",
      entityId: id,
      field: "inspectionStatus",
      oldValue: "PENDING",
      newValue: "REJECTED",
      metadata: JSON.stringify({ ncrNumber, ncrId: ncr.id, stage: task.stage }),
    })

    revalidatePath("/production")
    revalidatePath("/production/dashboard")

    return NextResponse.json({ success: true, ncrNumber, ncrId: ncr.id })

  } catch (error) {
    console.error("POST /api/production/tasks/[id]/inspect error:", error)
    return NextResponse.json({ error: "Failed to inspect task" }, { status: 500 })
  }
}
