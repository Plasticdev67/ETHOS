import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { prettifyEnum } from "@/lib/utils"
import { NewCustomerDialog } from "@/components/customers/new-customer-dialog"

export const revalidate = 60

async function getCustomers() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { projects: true, contacts: true } },
    },
  })
  return customers
}

const customerTypeColors: Record<string, string> = {
  MAIN_CONTRACTOR: "bg-blue-100 text-blue-800",
  UTILITY: "bg-purple-100 text-purple-800",
  COUNCIL: "bg-green-100 text-green-800",
  DIRECT: "bg-amber-100 text-amber-800",
  DEFENCE: "bg-red-100 text-red-800",
  OTHER: "bg-gray-100 text-gray-800",
}

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} customers</p>
        </div>
        <NewCustomerDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Projects</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Contacts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/customers/${customer.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {customer.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={customerTypeColors[customer.customerType] || "bg-gray-100 text-gray-800"}>
                        {prettifyEnum(customer.customerType)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{customer.email || "—"}</td>
                    <td className="px-6 py-3 text-gray-500">{customer.phone || "—"}</td>
                    <td className="px-6 py-3 text-center font-mono text-gray-600">{customer._count.projects}</td>
                    <td className="px-6 py-3 text-center font-mono text-gray-600">{customer._count.contacts}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No customers yet. Add your first customer to get started.
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
