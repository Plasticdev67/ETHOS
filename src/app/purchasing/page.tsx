import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { CreatePoDialog } from "@/components/purchasing/create-po-dialog"
import { PoTableRow } from "@/components/purchasing/po-row-expand"

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    orderBy: { dateRaised: "desc" },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      supplier: { select: { name: true } },
      _count: { select: { poLines: true } },
    },
  })
}

async function getFormData() {
  const [projects, suppliers] = await Promise.all([
    prisma.project.findMany({
      where: { projectStatus: { not: "COMPLETE" } },
      orderBy: { projectNumber: "desc" },
      select: { id: true, projectNumber: true, name: true },
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])
  return { projects, suppliers }
}

export default async function PurchasingPage() {
  const [pos, formData] = await Promise.all([getPurchaseOrders(), getFormData()])

  const totalValue = pos.reduce((sum, po) => sum + (Number(po.totalValue) || 0), 0)
  const openPOs = pos.filter((po) => po.status !== "COMPLETE" && po.status !== "CANCELLED").length

  // Serialize for client component
  const serializedPos = JSON.parse(JSON.stringify(pos))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500">
            {pos.length} orders — {openPOs} open — {formatCurrency(totalValue)} total value
          </p>
        </div>
        <CreatePoDialog projects={formData.projects} suppliers={formData.suppliers} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-2 py-3 w-8"></th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">PO No.</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Supplier</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Raised</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">Expected</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase text-gray-500">Value</th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase text-gray-500">Lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {serializedPos.map((po: typeof serializedPos[number]) => (
                  <PoTableRow key={po.id} po={po} />
                ))}
                {pos.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      No purchase orders yet. Create your first PO above.
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
