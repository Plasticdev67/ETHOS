import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { BomEditorPage } from "@/components/design/bom-editor-page"

export const dynamic = 'force-dynamic'

export default async function BomPage({ params }: { params: Promise<{ designCardId: string }> }) {
  const { designCardId } = await params

  const designCard = await prisma.productDesignCard.findUnique({
    where: { id: designCardId },
    select: {
      id: true,
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
      bomLines: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  if (!designCard) {
    notFound()
  }

  const serialized = JSON.parse(JSON.stringify(designCard))

  return (
    <div className="space-y-4">
      <BomEditorPage
        designCardId={serialized.id}
        product={serialized.product}
        project={serialized.project}
        initialBomLines={serialized.bomLines}
      />
    </div>
  )
}
