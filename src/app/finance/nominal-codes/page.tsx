import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NominalCodeManager } from "@/components/finance/nominal-code-manager"

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getNominalCodes() {
  return prisma.nominalCode.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: {
        select: {
          purchaseOrderLines: true,
          plantHires: true,
          subContracts: true,
          projectCostCategories: true,
        },
      },
    },
  })
}

export default async function NominalCodesPage() {
  const codes = await getNominalCodes()

  const categoryCounts = codes.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Finance
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Nominal Codes</h1>
        <p className="text-sm text-gray-500">Manage cost codes using the same format as your accounts system. Every cost is tagged with a nominal code.</p>
      </div>

      {/* Category summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryCounts).map(([cat, count]) => (
          <Badge key={cat} variant="outline" className="px-3 py-1">
            {cat.replace(/_/g, " ")} ({count})
          </Badge>
        ))}
        {codes.length === 0 && (
          <p className="text-sm text-gray-500">No nominal codes yet. Add your first one below.</p>
        )}
      </div>

      <NominalCodeManager codes={JSON.parse(JSON.stringify(codes))} />
    </div>
  )
}
