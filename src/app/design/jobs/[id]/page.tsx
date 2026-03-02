import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { JobCardDetail } from "@/components/design/job-card-detail"

export const dynamic = 'force-dynamic'

export default async function JobCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const jobCard = await prisma.designJobCard.findUnique({
    where: { id },
    include: {
      designCard: {
        include: {
          product: {
            select: {
              id: true,
              description: true,
              partCode: true,
              productJobNumber: true,
            },
          },
          project: {
            select: {
              id: true,
              projectNumber: true,
              name: true,
              customer: { select: { name: true } },
            },
          },
          assignedDesigner: {
            select: { id: true, name: true },
          },
        },
      },
      assignedTo: {
        select: { id: true, name: true },
      },
      reviewer: {
        select: { id: true, name: true },
      },
    },
  })

  if (!jobCard) {
    notFound()
  }

  // Fetch audit trail for this job card
  const auditLog = await prisma.auditLog.findMany({
    where: {
      entity: "DesignJobCard",
      entityId: id,
    },
    orderBy: { createdAt: "desc" },
  })

  // Serialize dates and Decimals for client component
  const serializedJobCard = JSON.parse(JSON.stringify(jobCard))
  const serializedAuditLog = JSON.parse(JSON.stringify(auditLog))

  return (
    <div className="space-y-4">
      <JobCardDetail jobCard={serializedJobCard} auditLog={serializedAuditLog} />
    </div>
  )
}
