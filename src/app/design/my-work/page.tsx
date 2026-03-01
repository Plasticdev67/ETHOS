import { prisma } from "@/lib/db"
import { MyWorkBoard } from "@/components/design/my-work-board"

export const revalidate = 60

export default async function MyWorkPage() {
  // Fetch all assigned cards (including QUEUED, IN_PROGRESS, REVIEW, COMPLETE)
  // Later this will be filtered by the logged-in user's ID.
  const cards = await prisma.productDesignCard.findMany({
    where: {
      assignedDesignerId: { not: null },
    },
    include: {
      product: {
        select: {
          id: true,
          description: true,
          partCode: true,
          productJobNumber: true,
          productionStatus: true,
        },
      },
      project: {
        select: {
          id: true,
          projectNumber: true,
          name: true,
        },
      },
      assignedDesigner: { select: { id: true, name: true } },
      jobCards: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  })

  // Serialize to strip Prisma Decimal/Date objects for client component
  const serialized = JSON.parse(JSON.stringify(cards))

  const activeCount = cards.filter((c) => c.status !== "COMPLETE").length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">My Design Work</h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeCount} active product{activeCount !== 1 ? "s" : ""} across your assigned design tasks
        </p>
      </div>
      <MyWorkBoard cards={serialized} />
    </div>
  )
}
