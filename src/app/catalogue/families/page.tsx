export const dynamic = 'force-dynamic'
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SyncFromSageButton } from "@/components/catalogue/sync-from-sage-button"

async function getFamilies() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma.productFamily as any).findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      types: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { variants: true, specFields: true } },
        },
      },
    },
  })
}

export default async function FamiliesPage() {
  const families = await getFamilies()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Product Families</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage product hierarchy — Families → Types → Variants
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SyncFromSageButton />
          <Link
            href="/catalogue"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Flat Catalogue
          </Link>
        </div>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {families.map((family: any) => (
        <Card key={family.id}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{family.name}</span>
                <Badge variant="secondary" className="text-[10px]">{family.code}</Badge>
                {family.sageProductGroup && (
                  <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">Sage: {family.sageProductGroup}</Badge>
                )}
                {!family.active && <Badge variant="outline" className="text-[10px] text-red-500">Inactive</Badge>}
              </div>
              <span className="text-xs text-gray-500">{family.types.length} type{family.types.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-border">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {family.types.map((type: any) => (
                <Link
                  key={type.id}
                  href={`/catalogue/types/${type.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700">{type.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{type.code}</Badge>
                    {type.sageTypePrefix && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">Sage</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{type._count.variants} variant{type._count.variants !== 1 ? "s" : ""}</span>
                    <span>{type._count.specFields} spec field{type._count.specFields !== 1 ? "s" : ""}</span>
                    <span className="text-gray-400">→</span>
                  </div>
                </Link>
              ))}
              {family.types.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-gray-400">
                  No types defined yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {families.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            No product families found. Run the seed to populate catalogue data.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
