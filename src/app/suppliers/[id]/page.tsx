import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Phone, Building, Truck } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDate, prettifyEnum } from "@/lib/utils"

export const revalidate = 60

async function getSupplier(id: string) {
  return prisma.supplier.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { isPrimary: "desc" } },
      purchaseOrders: {
        orderBy: { dateRaised: "desc" },
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
        },
      },
      plantHires: {
        orderBy: { createdAt: "desc" },
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
        },
      },
      subContracts: {
        orderBy: { createdAt: "desc" },
        include: {
          project: { select: { id: true, projectNumber: true, name: true } },
        },
      },
    },
  })
}

function getPoStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SENT: "bg-blue-100 text-blue-700",
    PARTIALLY_RECEIVED: "bg-amber-100 text-amber-700",
    COMPLETE: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  }
  return colors[status] || "bg-gray-100 text-gray-700"
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supplier = await getSupplier(id)

  if (!supplier) notFound()

  const totalPoValue = supplier.purchaseOrders.reduce((sum, po) => sum + (Number(po.totalValue) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/suppliers" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Suppliers
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{supplier.name}</h1>
        </div>
        {supplier.whatTheySupply && (
          <p className="mt-1 text-sm text-gray-500">{supplier.whatTheySupply}</p>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {supplier.email && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm">{supplier.email}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {supplier.phone && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm">{supplier.phone}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {supplier.paymentTerms && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Payment Terms</p>
                <p className="text-sm">{supplier.paymentTerms}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Truck className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">PO Total</p>
              <p className="text-sm font-mono font-medium">{formatCurrency(totalPoValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts */}
      {supplier.contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts ({supplier.contacts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Primary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplier.contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.role || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.email || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.phone || "—"}</td>
                      <td className="px-4 py-2.5">
                        {c.isPrimary && <Badge variant="secondary" className="bg-blue-100 text-blue-700">Primary</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase Orders ({supplier.purchaseOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">PO No.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Raised</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplier.purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-gray-700">{po.poNumber}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/projects/${po.project.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                        {po.project.projectNumber} — {po.project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="secondary" className={getPoStatusColor(po.status)}>
                        {prettifyEnum(po.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(po.dateRaised)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">{po.totalValue ? formatCurrency(Number(po.totalValue)) : "—"}</td>
                  </tr>
                ))}
                {supplier.purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No purchase orders for this supplier.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Plant Hires */}
      {supplier.plantHires.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plant Hire ({supplier.plantHires.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplier.plantHires.map((ph) => (
                    <tr key={ph.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-900">{ph.description}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/projects/${ph.project.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                          {ph.project.projectNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className={ph.status === "RETURNED" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                          {prettifyEnum(ph.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">{ph.totalCost ? formatCurrency(Number(ph.totalCost)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-Contracts */}
      {supplier.subContracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sub-Contract Work ({supplier.subContracts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Agreed Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {supplier.subContracts.map((sc) => (
                    <tr key={sc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-900">{sc.description}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/projects/${sc.project.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                          {sc.project.projectNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className={sc.status === "COMPLETE" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                          {prettifyEnum(sc.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm">{sc.agreedValue ? formatCurrency(Number(sc.agreedValue)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {supplier.notes && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase text-gray-500 mb-2">Notes</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{supplier.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
