import { prisma } from "@/lib/db"
import { PendingHandovers } from "@/components/design/pending-handovers"

export const dynamic = "force-dynamic"

export default async function PendingHandoversPage() {
  const handovers = await prisma.designHandover.findMany({
    where: { status: "SUBMITTED" },
    include: {
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
          customer: { select: { name: true } },
          designCards: {
            select: {
              id: true,
              status: true,
              product: { select: { id: true, description: true, partCode: true } },
              jobCards: { select: { jobType: true, status: true } },
            },
          },
        },
      },
      initiatedBy: { select: { id: true, name: true } },
    },
    orderBy: { initiatedAt: "asc" },
  })

  // Annotate each handover with includedProductIds for partial handover display
  const annotated = handovers.map((h) => ({
    ...h,
    includedProductIds: (h.includedProductIds || []) as string[],
  }))

  const serialized = JSON.parse(JSON.stringify(annotated))
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Pending Handovers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Design handovers awaiting Production acknowledgement
        </p>
      </div>
      <PendingHandovers handovers={serialized} />
    </div>
  )
}
