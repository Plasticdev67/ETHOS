import { prisma } from "@/lib/db"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

async function getType(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma.productType as any).findUnique({
    where: { id },
    include: {
      family: true,
      variants: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { baseBomItems: true } } },
      },
      specFields: {
        orderBy: { sortOrder: "asc" },
        include: {
          choices: { orderBy: { sortOrder: "asc" } },
          dependencies: { include: { triggerChoice: { include: { field: true } } } },
        },
      },
    },
  })
}

export default async function TypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const type = await getType(id)
  if (!type) notFound()

  const serialized = JSON.parse(JSON.stringify(type))

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/catalogue/families" className="hover:text-blue-600">Families</Link>
          <span>/</span>
          <span>{serialized.family.name}</span>
          <span>/</span>
          <span className="text-gray-900">{serialized.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{serialized.name}</h1>
          <Badge variant="secondary">{serialized.code}</Badge>
        </div>
      </div>

      {/* Variants */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 bg-gray-50/50 border-b border-border">
            <span className="text-sm font-semibold text-gray-700">
              Variants ({serialized.variants.length})
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Code</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Default W</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Default H</th>
                <th className="px-4 py-2 text-center text-xs font-medium uppercase text-gray-500">BOM Items</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {serialized.variants.map((v: { id: string; name: string; code: string; defaultWidth: number | null; defaultHeight: number | null; _count: { baseBomItems: number } }) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{v.name}</td>
                  <td className="px-4 py-2"><Badge variant="secondary" className="text-[10px]">{v.code}</Badge></td>
                  <td className="px-4 py-2 text-right font-mono text-gray-500">{v.defaultWidth ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-500">{v.defaultHeight ?? "—"}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{v._count.baseBomItems}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/catalogue/variants/${v.id}`} className="text-xs text-blue-600 hover:text-blue-800">
                      View BOM →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Spec Fields */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 bg-gray-50/50 border-b border-border">
            <span className="text-sm font-semibold text-gray-700">
              Specification Fields ({serialized.specFields.length})
            </span>
          </div>
          <div className="divide-y divide-border">
            {serialized.specFields.map((field: { id: string; name: string; code: string; fieldType: string; required: boolean; choices: { id: string; label: string; value: string; isDefault: boolean; costModifier: string; costMultiplier: string }[]; dependencies: { id: string; action: string; triggerChoice: { field: { name: string }; label: string } }[] }) => (
              <div key={field.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-900">{field.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{field.code}</Badge>
                  <Badge variant="outline" className="text-[10px]">{field.fieldType}</Badge>
                  {field.required && <Badge className="text-[10px] bg-red-50 text-red-600">Required</Badge>}
                  {field.dependencies.length > 0 && (
                    <span className="text-[10px] text-amber-600">
                      Shows when: {field.dependencies.map((d) => `${d.triggerChoice.field.name}=${d.triggerChoice.label}`).join(" or ")}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {field.choices.map((choice) => (
                    <span
                      key={choice.id}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] border ${
                        choice.isDefault ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      {choice.label}
                      {parseFloat(choice.costModifier) !== 0 && (
                        <span className="text-[9px] text-green-700">
                          {parseFloat(choice.costModifier) > 0 ? "+" : ""}£{choice.costModifier}
                        </span>
                      )}
                      {parseFloat(choice.costMultiplier) !== 1 && (
                        <span className="text-[9px] text-orange-600">×{choice.costMultiplier}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
