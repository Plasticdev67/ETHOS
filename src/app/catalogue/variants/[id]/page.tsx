import { prisma } from "@/lib/db"
import Link from "next/link"
import { notFound } from "next/navigation"
import BomEditorTable from "@/components/catalogue/bom-editor-table"

export const dynamic = "force-dynamic"

async function getVariant(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma.productVariant as any).findUnique({
    where: { id },
    include: {
      type: { include: { family: true } },
      baseBomItems: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })
}

export default async function VariantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const variant = await getVariant(id)
  if (!variant) notFound()

  const serialized = JSON.parse(JSON.stringify(variant))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/catalogue/families" className="hover:text-blue-600">Families</Link>
        <span>/</span>
        <Link href={`/catalogue/types/${serialized.type.id}`} className="hover:text-blue-600">
          {serialized.type.family.name}
        </Link>
        <span>/</span>
        <Link href={`/catalogue/types/${serialized.type.id}`} className="hover:text-blue-600">
          {serialized.type.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{serialized.code}</span>
      </div>

      <BomEditorTable
        variantId={serialized.id}
        variantCode={serialized.code}
        variantName={serialized.name}
        familyName={`${serialized.type.family.name} > ${serialized.type.name}`}
        initialItems={serialized.baseBomItems.map((item: { id: string; description: string; category: string; stockCode: string | null; quantity: string; unitCost: string; scalesWithSize: boolean; sortOrder: number }) => ({
          id: item.id,
          description: item.description,
          category: item.category,
          stockCode: item.stockCode,
          quantity: String(item.quantity),
          unitCost: String(item.unitCost),
          scalesWithSize: item.scalesWithSize,
          sortOrder: item.sortOrder,
        }))}
      />
    </div>
  )
}
