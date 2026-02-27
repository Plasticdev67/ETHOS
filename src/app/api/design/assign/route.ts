import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit"
import { requirePermission } from "@/lib/api-auth"
import { revalidatePath } from "next/cache"

// POST /api/design/assign — Assign designer to design card(s)
export async function POST(request: NextRequest) {
  try {
    const denied = await requirePermission("design:assign")
    if (denied) return denied

    const body = await request.json()
    const { designCardIds, designerId } = body

    // Validate required fields
    if (!designCardIds || !Array.isArray(designCardIds) || designCardIds.length === 0) {
      return NextResponse.json(
        { error: "designCardIds must be a non-empty array" },
        { status: 400 }
      )
    }

    if (!designerId || typeof designerId !== "string") {
      return NextResponse.json(
        { error: "designerId is required" },
        { status: 400 }
      )
    }

    // Validate designer exists and has DESIGNER role
    const designer = await prisma.user.findUnique({
      where: { id: designerId },
      select: { id: true, name: true, role: true },
    })

    if (!designer) {
      return NextResponse.json({ error: "Designer not found" }, { status: 404 })
    }

    const designRoles = ["DESIGN_ENGINEER", "ENGINEERING_MANAGER", "R_AND_D_MANAGER", "ADMIN"]
    if (!designRoles.includes(designer.role)) {
      return NextResponse.json(
        { error: "User does not have a design-capable role" },
        { status: 400 }
      )
    }

    // Fetch current state of all cards for audit logging
    const existingCards = await prisma.productDesignCard.findMany({
      where: { id: { in: designCardIds } },
      select: { id: true, status: true, assignedDesignerId: true },
    })

    if (existingCards.length !== designCardIds.length) {
      return NextResponse.json(
        { error: "One or more design card IDs not found" },
        { status: 404 }
      )
    }

    const now = new Date()
    const updatedCards = []

    for (const card of existingCards) {
      const updateData: Record<string, unknown> = {
        assignedDesignerId: designerId,
      }

      // If card was QUEUED, transition to IN_PROGRESS and set actualStartDate
      if (card.status === "QUEUED") {
        updateData.status = "IN_PROGRESS"
        updateData.actualStartDate = now
      }

      const updated = await prisma.productDesignCard.update({
        where: { id: card.id },
        data: updateData,
        include: {
          product: {
            select: {
              id: true,
              description: true,
              partCode: true,
              quantity: true,
              productJobNumber: true,
            },
          },
          project: {
            select: {
              id: true,
              projectNumber: true,
              name: true,
            },
          },
          assignedDesigner: {
            select: { id: true, name: true },
          },
          jobCards: {
            select: { id: true, jobType: true, status: true },
          },
        },
      })

      updatedCards.push(updated)

      // Also assign all unassigned job cards on this design card to the same designer
      await prisma.designJobCard.updateMany({
        where: {
          designCardId: card.id,
          assignedToId: null,
        },
        data: { assignedToId: designerId },
      })

      // Log audit for assignment
      await logAudit({
        action: "UPDATE",
        entity: "ProductDesignCard",
        entityId: card.id,
        field: "assignedDesignerId",
        oldValue: card.assignedDesignerId,
        newValue: designerId,
        metadata: JSON.stringify({
          designerName: designer.name,
          statusChange: card.status === "QUEUED" ? "QUEUED -> IN_PROGRESS" : null,
        }),
      })
    }

    revalidatePath("/design")

    return NextResponse.json(JSON.parse(JSON.stringify(updatedCards)))
  } catch (error) {
    console.error("Failed to assign designer:", error)
    return NextResponse.json({ error: "Failed to assign designer" }, { status: 500 })
  }
}
