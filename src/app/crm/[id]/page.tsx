import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Megaphone,
  PoundSterling,
  ExternalLink,
} from "lucide-react"
import {
  prettifyEnum,
  formatCurrency,
  formatDate,
  getOpportunityStatusColor,
  getLeadSourceColor,
  getProspectStatusColor,
} from "@/lib/utils"

export const dynamic = 'force-dynamic'

async function getProspect(id: string) {
  return prisma.prospect.findUnique({
    where: { id },
    include: {
      opportunities: {
        orderBy: { sortOrder: "asc" },
        include: {
          convertedProject: {
            select: { id: true, projectNumber: true, name: true },
          },
        },
      },
      convertedCustomer: {
        select: { id: true, name: true },
      },
    },
  })
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const prospect = await getProspect(id)

  if (!prospect) notFound()

  const totalValue = prospect.opportunities.reduce(
    (sum, o) => sum + (Number(o.estimatedValue) || 0),
    0
  )
  const wonOpps = prospect.opportunities.filter((o) => o.status === "WON")
  const wonValue = wonOpps.reduce(
    (sum, o) => sum + (Number(o.estimatedValue) || 0),
    0
  )
  const activeOpps = prospect.opportunities.filter(
    (o) => o.status === "ACTIVE_LEAD" || o.status === "QUOTED"
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/crm"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CRM Pipeline
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">
            {prospect.companyName}
          </h1>
          <Badge
            variant="secondary"
            className={getProspectStatusColor(prospect.status)}
          >
            {prettifyEnum(prospect.status)}
          </Badge>
          {prospect.convertedCustomer && (
            <Link
              href={`/customers/${prospect.convertedCustomer.id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              Customer: {prospect.convertedCustomer.name}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {prospect.contactName && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Building className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Contact</p>
                <p className="text-sm font-medium text-gray-900">
                  {prospect.contactName}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {prospect.contactEmail && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm">{prospect.contactEmail}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {prospect.contactPhone && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm">{prospect.contactPhone}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {prospect.sector && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Briefcase className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Sector</p>
                <p className="text-sm">{prospect.sector}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {prospect.address && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm">{prospect.address}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Megaphone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Lead Source</p>
              <p className="text-sm">{prettifyEnum(prospect.source)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PoundSterling className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Pipeline Value</p>
              <p className="text-sm font-mono font-medium">
                {formatCurrency(totalValue)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PoundSterling className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Won Value</p>
              <p className="text-sm font-mono font-medium text-green-700">
                {formatCurrency(wonValue)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary stats row */}
      <div className="flex gap-3">
        <div className="rounded-lg border border-border bg-white px-4 py-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            Total Opportunities
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {prospect.opportunities.length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white px-4 py-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            Active
          </div>
          <div className="text-xl font-semibold text-blue-600">
            {activeOpps.length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white px-4 py-2.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            Won
          </div>
          <div className="text-xl font-semibold text-green-600">
            {wonOpps.length}
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Opportunities ({prospect.opportunities.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Lead Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Close Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                    Est. Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Converted To
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prospect.opportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">
                        {opp.name}
                      </div>
                      {opp.description && (
                        <div className="text-xs text-gray-500 truncate max-w-[250px]">
                          {opp.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className={getOpportunityStatusColor(opp.status)}
                      >
                        {prettifyEnum(opp.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="secondary"
                        className={
                          getLeadSourceColor(opp.leadSource) +
                          " text-[10px] px-1.5 py-0"
                        }
                      >
                        {prettifyEnum(opp.leadSource)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {opp.contactPerson || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {formatDate(opp.expectedCloseDate)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      {opp.estimatedValue
                        ? formatCurrency(Number(opp.estimatedValue))
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {opp.convertedProject ? (
                        <Link
                          href={`/projects/${opp.convertedProject.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-mono"
                        >
                          #{opp.convertedProject.projectNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {prospect.opportunities.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No opportunities yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {prospect.notes && (
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium uppercase text-gray-500 mb-2">
              Notes
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {prospect.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
