import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { HandoverForm } from "@/components/design/handover-form"

export const dynamic = "force-dynamic"

export default async function HandoverPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      customer: { select: { name: true } },
      designCards: {
        include: {
          product: {
            select: {
              id: true,
              description: true,
              partCode: true,
              productJobNumber: true,
            },
          },
          jobCards: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, jobType: true, status: true },
          },
        },
      },
      designHandover: {
        include: {
          initiatedBy: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!project) notFound()

  const serialized = JSON.parse(JSON.stringify(project))
  return <HandoverForm project={serialized} />
}
