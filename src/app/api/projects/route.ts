import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"
import { validateBody, isValidationError, projectCreateSchema } from "@/lib/api-validation"
import { toDecimal } from "@/lib/api-utils"
import { getNextSequenceNumber } from "@/lib/finance/sequences"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("projects:create")
    if (denied) return denied

    const data = await validateBody(request, projectCreateSchema)
    if (isValidationError(data)) return data

    // Concurrency-safe project number generation
    const projectNumber = await getNextSequenceNumber("project")

    const project = await prisma.project.create({
      data: {
        projectNumber,
        name: data.name,
        customerId: data.customerId || null,
        coordinatorId: data.coordinatorId || null,
        projectManagerId: data.projectManagerId || null,
        installManagerId: data.installManagerId || null,
        projectType: data.projectType || "STANDARD",
        workStream: data.workStream || "BESPOKE",
        salesStage: data.salesStage || "OPPORTUNITY",
        projectStatus: data.projectStatus || "OPPORTUNITY",
        contractType: data.contractType || "STANDARD",
        priority: data.priority || "NORMAL",
        estimatedValue: toDecimal(data.estimatedValue),
        contractValue: toDecimal(data.contractValue),
        siteLocation: data.siteLocation || null,
        deliveryType: data.deliveryType || null,
        projectRegion: data.projectRegion || null,
        notes: data.notes || null,
        enquiryReceived: data.enquiryReceived ? new Date(data.enquiryReceived) : null,
        targetCompletion: data.targetCompletion ? new Date(data.targetCompletion) : null,
      },
    })

    // If created from a quote, link it and carry quote lines through as products
    if (data.quoteId) {
      await prisma.quote.update({
        where: { id: data.quoteId },
        data: { projectId: project.id },
      })

      // Fetch all non-optional quote lines and create products from them
      const quoteLines = await prisma.quoteLine.findMany({
        where: { quoteId: data.quoteId, isOptional: false },
        include: { catalogueItem: { select: { partCode: true } } },
        orderBy: { sortOrder: "asc" },
      })

      if (quoteLines.length > 0) {
        await prisma.product.createMany({
          data: quoteLines.map((line) => ({
            projectId: project.id,
            catalogueItemId: line.catalogueItemId,
            partCode: line.catalogueItem?.partCode || line.description.substring(0, 30),
            description: line.description,
            additionalDetails: line.dimensions || null,
            quantity: line.quantity,
            currentDepartment: "PLANNING" as const,
          })),
        })

        // Link quote lines to their new products by matching order
        const createdProducts = await prisma.product.findMany({
          where: { projectId: project.id },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        })

        for (let i = 0; i < quoteLines.length && i < createdProducts.length; i++) {
          await prisma.quoteLine.update({
            where: { id: quoteLines[i].id },
            data: { productId: createdProducts[i].id },
          })
        }
      }
    }

    revalidatePath("/projects")
    revalidatePath("/")

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Failed to create project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        projectNumber: true,
        name: true,
        customerId: true,
        coordinatorId: true,
        projectManagerId: true,
        installManagerId: true,
        projectType: true,
        workStream: true,
        salesStage: true,
        projectStatus: true,
        contractType: true,
        lifecycleStage: true,
        departmentStatus: true,
        priority: true,
        isICUFlag: true,
        ragStatus: true,
        projectSubStatus: true,
        estimatedValue: true,
        contractValue: true,
        siteLocation: true,
        deliveryType: true,
        projectRegion: true,
        enquiryReceived: true,
        quoteSubmitted: true,
        orderReceived: true,
        targetCompletion: true,
        actualCompletion: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { name: true } },
        coordinator: { select: { name: true } },
        _count: { select: { products: true } },
      },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Failed to fetch projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}
