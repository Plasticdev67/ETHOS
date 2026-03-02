import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = 'force-dynamic'
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building, Mail, Phone, PoundSterling } from "lucide-react"
import Link from "next/link"
import { prettifyEnum, getProjectStatusColor, getSalesStageColor, formatCurrency, formatDate } from "@/lib/utils"
import { NewProjectForCustomerDialog } from "@/components/customers/new-project-for-customer-dialog"
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button"

function getQuoteStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SUBMITTED: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-green-100 text-green-700",
    DECLINED: "bg-red-100 text-red-700",
    REVISED: "bg-amber-100 text-amber-700",
  }
  return colors[status] || "bg-gray-100 text-gray-700"
}

async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { isPrimary: "desc" } },
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          coordinator: { select: { name: true } },
          _count: { select: { products: true } },
        },
      },
      quotes: {
        orderBy: { dateCreated: "desc" },
        include: {
          project: { select: { id: true, projectNumber: true } },
          _count: { select: { quoteLines: true } },
        },
      },
    },
  })
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const customer = await getCustomer(id)

  if (!customer) notFound()

  const totalQuoteValue = customer.quotes.reduce((sum, q) => sum + (Number(q.totalSell) || 0), 0)
  const acceptedQuotes = customer.quotes.filter((q) => q.status === "ACCEPTED")
  const acceptedValue = acceptedQuotes.reduce((sum, q) => sum + (Number(q.totalSell) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
            <Badge variant="secondary">{prettifyEnum(customer.customerType)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <NewProjectForCustomerDialog customerId={customer.id} customerName={customer.name} />
            <DeleteCustomerButton
              customerId={customer.id}
              customerName={customer.name}
              projectCount={customer.projects.length}
            />
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {customer.email && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm">{customer.email}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {customer.phone && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm">{customer.phone}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {customer.paymentTerms && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Payment Terms</p>
                <p className="text-sm">{customer.paymentTerms}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PoundSterling className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Total Quoted</p>
              <p className="text-sm font-mono font-medium">{formatCurrency(totalQuoteValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts */}
      {customer.contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts ({customer.contacts.length})</CardTitle>
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
                  {customer.contacts.map((c) => (
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

      {/* Quotes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quotes ({customer.quotes.length})</CardTitle>
            {acceptedQuotes.length > 0 && (
              <span className="text-xs text-gray-500">
                {acceptedQuotes.length} accepted — {formatCurrency(acceptedValue)} won
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Quote No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Lines</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customer.quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-sm font-semibold">
                      <Link href={`/quotes/${quote.id}`} className="text-blue-600 hover:text-blue-700">
                        {quote.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/quotes/${quote.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {quote.subject || "—"}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={getQuoteStatusColor(quote.status)}>
                        {prettifyEnum(quote.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {quote.project ? (
                        <Link href={`/projects/${quote.project.id}`} className="text-blue-600 hover:text-blue-700 font-mono text-xs">
                          {quote.project.projectNumber}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{formatDate(quote.dateCreated)}</td>
                    <td className="px-6 py-3 text-center font-mono text-gray-600">{quote._count.quoteLines}</td>
                    <td className="px-6 py-3 text-right font-mono text-sm">
                      {quote.totalSell ? formatCurrency(Number(quote.totalSell)) : "—"}
                    </td>
                  </tr>
                ))}
                {customer.quotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No quotes for this customer.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Projects for this customer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects ({customer.projects.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Coordinator</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Products</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customer.projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-sm font-medium text-blue-600">
                      <Link href={`/projects/${project.id}`}>{project.projectNumber}</Link>
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/projects/${project.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={getProjectStatusColor(project.projectStatus)}>
                        {prettifyEnum(project.projectStatus)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={getSalesStageColor(project.salesStage)}>
                        {prettifyEnum(project.salesStage)}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{project.coordinator?.name || "—"}</td>
                    <td className="px-6 py-3 text-center font-mono">{project._count.products}</td>
                  </tr>
                ))}
                {customer.projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No projects for this customer.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase text-gray-500 mb-2">Notes</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
