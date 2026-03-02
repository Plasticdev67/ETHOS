import { prisma } from "@/lib/db"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

async function getVariant(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma.productVariant as any).findUnique({
    where: { id },
    include: {
      type: { include: { family: true } },
      baseBomItems: {
        orderBy: { sortOrder: "asc" },
        include: {
          modifiers: {
            include: { choice: { include: { field: true } } },
          },
        },
      },
    },
  })
}

function formatCurrency(val: number | string) {
  return `£${parseFloat(String(val)).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`
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
  const totalBaseCost = serialized.baseBomItems.reduce(
    (sum: number, item: { unitCost: string; quantity: string }) =>
      sum + parseFloat(item.unitCost) * parseFloat(item.quantity),
    0
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/catalogue/families" className="hover:text-blue-600">Families</Link>
          <span>/</span>
          <Link href={`/catalogue/types/${serialized.type.id}`} className="hover:text-blue-600">{serialized.type.family.name}</Link>
          <span>/</span>
          <Link href={`/catalogue/types/${serialized.type.id}`} className="hover:text-blue-600">{serialized.type.name}</Link>
          <span>/</span>
          <span className="text-gray-900">{serialized.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{serialized.name}</h1>
          <Badge variant="secondary">{serialized.code}</Badge>
          {serialized.defaultWidth && serialized.defaultHeight && (
            <span className="text-sm text-gray-500">
              {serialized.defaultWidth}mm × {serialized.defaultHeight}mm
            </span>
          )}
        </div>
      </div>

      {/* Base BOM */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b border-border">
            <span className="text-sm font-semibold text-gray-700">
              Base BOM ({serialized.baseBomItems.length} items)
            </span>
            <span className="text-sm font-mono font-semibold text-gray-900">
              {formatCurrency(totalBaseCost)}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Unit Cost</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Total</th>
                <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">Scales</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Modifiers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {serialized.baseBomItems.map((item: { id: string; description: string; category: string; quantity: string; unitCost: string; scalesWithSize: boolean; modifiers: { id: string; action: string; value: string; description: string | null; choice: { label: string; field: { name: string } } }[] }) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{item.description}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-500">{item.quantity}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(item.unitCost)}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">
                    {formatCurrency(parseFloat(item.unitCost) * parseFloat(item.quantity))}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {item.scalesWithSize && <span className="text-[10px] text-blue-600">↕ Yes</span>}
                  </td>
                  <td className="px-4 py-2">
                    {item.modifiers.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        {item.modifiers.map((mod) => (
                          <span key={mod.id} className="text-[10px] text-gray-500">
                            {mod.choice.field.name}={mod.choice.label} → {mod.action}
                            {mod.value !== "0" && ` (${mod.value})`}
                            {mod.description && ` "${mod.description}"`}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
