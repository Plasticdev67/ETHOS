import { prisma } from "@/lib/db"
import { logAudit } from "@/lib/audit"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId")
  const where = projectId ? { projectId } : {}

  const variations = await prisma.variation.findMany({
    where,
    include: { project: { select: { projectNumber: true, name: true } } },
    orderBy: { dateRaised: "desc" },
  })

  return NextResponse.json(JSON.parse(JSON.stringify(variations)))
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Auto-generate variation number
  const lastVar = await prisma.variation.findFirst({
    orderBy: { variationNumber: "desc" },
    select: { variationNumber: true },
  })
  let nextNum = 1
  if (lastVar) {
    const match = lastVar.variationNumber.match(/\d+$/)
    if (match) nextNum = parseInt(match[0], 10) + 1
  }
  const variationNumber = `VAR-${String(nextNum).padStart(4, "0")}`

  const variation = await prisma.variation.create({
    data: {
      variationNumber,
      projectId: body.projectId,
      title: body.title,
      description: body.description || null,
      type: body.type || "CLIENT_INSTRUCTION",
      costImpact: body.costImpact ? parseFloat(body.costImpact) : null,
      valueImpact: body.valueImpact ? parseFloat(body.valueImpact) : null,
      raisedBy: body.raisedBy || null,
      notes: body.notes || null,
    },
  })

  await logAudit({
    action: "CREATE",
    entity: "Variation",
    entityId: variation.id,
    newValue: `${variationNumber}: ${body.title}`,
  })

  revalidatePath("/finance")
  revalidatePath("/projects")

  return NextResponse.json(JSON.parse(JSON.stringify(variation)))
}
