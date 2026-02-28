import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Auto-generate project number
  const lastProject = await prisma.project.findFirst({
    orderBy: { projectNumber: "desc" },
    select: { projectNumber: true },
  })

  let nextNumber = 100001
  if (lastProject) {
    const lastNum = parseInt(lastProject.projectNumber, 10)
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1
    }
  }

  const project = await prisma.project.create({
    data: {
      projectNumber: String(nextNumber),
      name: body.name,
      customerId: body.customerId || null,
      coordinatorId: body.coordinatorId || null,
      projectManagerId: body.projectManagerId || null,
      installManagerId: body.installManagerId || null,
      projectType: body.projectType || "STANDARD",
      workStream: body.workStream || "BESPOKE",
      salesStage: body.salesStage || "OPPORTUNITY",
      projectStatus: body.projectStatus || "OPPORTUNITY",
      contractType: body.contractType || "STANDARD",
      priority: body.priority || "NORMAL",
      classification: body.classification || "NORMAL",
      estimatedValue: body.estimatedValue ? parseFloat(body.estimatedValue) : null,
      contractValue: body.contractValue ? parseFloat(body.contractValue) : null,
      siteLocation: body.siteLocation || null,
      deliveryType: body.deliveryType || null,
      projectRegion: body.projectRegion || null,
      notes: body.notes || null,
      enquiryReceived: body.enquiryReceived ? new Date(body.enquiryReceived) : null,
      targetCompletion: body.targetCompletion ? new Date(body.targetCompletion) : null,
    },
  })

  // If created from a quote, link it and carry quote lines through as products
  if (body.quoteId) {
    await prisma.quote.update({
      where: { id: body.quoteId },
      data: { projectId: project.id },
    })

    // Fetch all non-optional quote lines and create products from them
    const quoteLines = await prisma.quoteLine.findMany({
      where: { quoteId: body.quoteId, isOptional: false },
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
}

export async function GET() {
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
      classification: true,
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
}
