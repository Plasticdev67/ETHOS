import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { NewSupplierDialog } from "@/components/suppliers/new-supplier-dialog"

async function getSuppliers() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { purchaseOrders: true, contacts: true } },
    },
  })
}

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500">{suppliers.length} suppliers</p>
        </div>
        <NewSupplierDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Supplies</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Payment Terms</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">POs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      <Link href={`/suppliers/${supplier.id}`} className="hover:text-blue-600">{supplier.name}</Link>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{supplier.whatTheySupply || "—"}</td>
                    <td className="px-6 py-3 text-gray-500">{supplier.email || "—"}</td>
                    <td className="px-6 py-3 text-gray-500">{supplier.phone || "—"}</td>
                    <td className="px-6 py-3 text-gray-500">{supplier.paymentTerms || "—"}</td>
                    <td className="px-6 py-3 text-center font-mono text-gray-600">{supplier._count.purchaseOrders}</td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No suppliers yet. Add your first supplier.
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
