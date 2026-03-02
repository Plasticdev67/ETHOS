import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { EditCatalogueRow } from "@/components/catalogue/edit-catalogue-row"

export const dynamic = 'force-dynamic'

async function getCatalogue() {
  return prisma.productCatalogue.findMany({
    orderBy: { partCode: "asc" },
    include: {
      _count: { select: { products: true } },
    },
  })
}

export default async function CataloguePage() {
  const items = await getCatalogue()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Product Catalogue</h1>
        <p className="text-sm text-gray-500">{items.length} products — click the pencil to set guide pricing</p>
      </div>

      {/* Navigation to hierarchical catalogue */}
      <div className="flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3">
        <div className="flex-1">
          <span className="text-sm font-medium text-blue-900">Product Hierarchy</span>
          <p className="text-xs text-blue-600 mt-0.5">
            Manage families, types, variants, spec fields, and BOM templates
          </p>
        </div>
        <Link
          href="/catalogue/families"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Manage Families →
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Part Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Guide Unit Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Guide Margin %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Units</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Used</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <EditCatalogueRow key={item.id} item={item as Parameters<typeof EditCatalogueRow>[0]["item"]} />
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No catalogue items. Add products to your catalogue to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
