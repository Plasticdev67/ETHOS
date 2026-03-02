import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  PoundSterling,
  Calendar,
  User,
  Target,
  FileText,
  ExternalLink,
} from "lucide-react"
import {
  prettifyEnum,
  formatCurrency,
  formatDate,
  getOpportunityStatusColor,
  getLeadSourceColor,
} from "@/lib/utils"
import { OpportunityStagePath } from "@/components/crm/opportunity-stage-path"
import { OpportunityActivityLog } from "@/components/crm/opportunity-activity-log"

export const revalidate = 60

async function getOpportunity(id: string) {
  return prisma.opportunity.findUnique({
    where: { id },
    include: {
      prospect: true,
      quoteLines: { orderBy: { sortOrder: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 100 },
      convertedProject: { select: { id: true, projectNumber: true, name: true } },
    },
  })
}

async function getAuditEntries(id: string) {
  return prisma.auditLog.findMany({
    where: { entityId: id, entity: "Opportunity" },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [opportunity, auditEntries] = await Promise.all([
    getOpportunity(id),
    getAuditEntries(id),
  ])

  if (!opportunity) notFound()

  const prospect = opportunity.prospect
  const weightedValue =
    (Number(opportunity.estimatedValue) || 0) * (opportunity.winProbability / 100)
  const lineTotals = opportunity.quoteLines.reduce(
    (sum, l) => sum + Number(l.totalCost),
    0
  )

  // Serialize for client components (Decimal → number, Date → string)
  const serializedActivities = JSON.parse(JSON.stringify(opportunity.activities))
  const serializedAuditEntries = JSON.parse(JSON.stringify(auditEntries))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/crm"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CRM Pipeline
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900">
              {opportunity.name}
            </h1>
            <Badge
              variant="secondary"
              className={getOpportunityStatusColor(opportunity.status)}
            >
              {prettifyEnum(opportunity.status)}
            </Badge>
            <Badge
              variant="secondary"
              className={getLeadSourceColor(opportunity.leadSource) + " text-[10px]"}
            >
              {prettifyEnum(opportunity.leadSource)}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
            <Link
              href={`/crm/${prospect.id}`}
              className="hover:text-blue-600 transition-colors"
            >
              {prospect.companyName}
            </Link>
            {opportunity.quoteNumber && (
              <span className="font-mono text-xs">{opportunity.quoteNumber}</span>
            )}
            {opportunity.convertedProject && (
              <Link
                href={`/projects/${opportunity.convertedProject.id}`}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-mono"
              >
                Project #{opportunity.convertedProject.projectNumber}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/crm/quote/${opportunity.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Quote Builder
          </Link>
        </div>
      </div>

      {/* Stage Path */}
      <OpportunityStagePath currentStatus={opportunity.status} />

      {/* Highlights Panel */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PoundSterling className="h-5 w-5 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Est. Value</p>
              <p className="text-lg font-mono font-semibold text-gray-900 truncate">
                {formatCurrency(Number(opportunity.estimatedValue))}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="h-5 w-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Win Probability</p>
              <p className={`text-lg font-semibold ${
                opportunity.winProbability >= 70 ? "text-green-600" :
                opportunity.winProbability >= 40 ? "text-amber-600" :
                "text-gray-600"
              }`}>
                {opportunity.winProbability}%
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PoundSterling className="h-5 w-5 text-green-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Weighted Value</p>
              <p className="text-lg font-mono font-semibold text-green-700 truncate">
                {formatCurrency(weightedValue)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <User className="h-5 w-5 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Contact</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {opportunity.contactPerson || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Close Date</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(opportunity.expectedCloseDate)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Quote Status</p>
              <p className="text-sm font-medium text-gray-900">
                {prettifyEnum(opportunity.quoteApproval)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quote-lines">
            Quote Lines ({opportunity.quoteLines.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Activity ({opportunity.activities.length})
          </TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Description + Quote Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description & Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {opportunity.description ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {opportunity.description}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">No description.</p>
                  )}
                  {opportunity.notes && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-medium uppercase text-gray-500 mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {opportunity.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quote summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quote Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        {opportunity.quoteLines.length} line item{opportunity.quoteLines.length !== 1 ? "s" : ""}
                      </p>
                      {opportunity.quotedPrice && (
                        <p className="text-lg font-mono font-semibold text-gray-900 mt-1">
                          {formatCurrency(Number(opportunity.quotedPrice))}
                        </p>
                      )}
                      {!opportunity.quotedPrice && lineTotals > 0 && (
                        <p className="text-lg font-mono font-semibold text-gray-500 mt-1">
                          {formatCurrency(lineTotals)} (line items)
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/crm/quote/${opportunity.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Open Quote Builder
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  {opportunity.quoteNumber && (
                    <p className="mt-2 text-xs text-gray-500">
                      Quote: {opportunity.quoteNumber}
                      {opportunity.quoteSentAt && (
                        <> &middot; Sent {formatDate(opportunity.quoteSentAt)}</>
                      )}
                      {opportunity.quoteSentTo && (
                        <> to {opportunity.quoteSentTo}</>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Prospect & Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prospect & Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Company</p>
                    <Link
                      href={`/crm/${prospect.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {prospect.companyName}
                    </Link>
                  </div>
                </div>
                {(opportunity.contactPerson || prospect.contactName) && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Contact</p>
                      <p className="text-sm font-medium text-gray-900">
                        {opportunity.contactPerson || prospect.contactName}
                      </p>
                    </div>
                  </div>
                )}
                {prospect.contactEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <a
                        href={`mailto:${prospect.contactEmail}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {prospect.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
                {prospect.contactPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <a
                        href={`tel:${prospect.contactPhone}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {prospect.contactPhone}
                      </a>
                    </div>
                  </div>
                )}
                {prospect.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm text-gray-700">{prospect.address}</p>
                    </div>
                  </div>
                )}
                {prospect.sector && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Sector</p>
                      <p className="text-sm text-gray-700">{prospect.sector}</p>
                    </div>
                  </div>
                )}
                {prospect.notes && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-medium uppercase text-gray-500 mb-1">
                      Prospect Notes
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {prospect.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quote Lines Tab */}
        <TabsContent value="quote-lines" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Classification
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {opportunity.quoteLines.map((line) => (
                      <tr key={line.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900">{line.description}</p>
                          {line.width && line.height && (
                            <p className="text-xs text-gray-500">
                              {line.width}mm x {line.height}mm
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {prettifyEnum(line.type)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="secondary"
                            className={
                              line.classification === "ENGINEER_TO_ORDER"
                                ? "bg-orange-100 text-orange-800 text-[10px]"
                                : line.classification === "CTO"
                                ? "bg-blue-100 text-blue-800 text-[10px]"
                                : "bg-gray-100 text-gray-600 text-[10px]"
                            }
                          >
                            {prettifyEnum(line.classification)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-700">
                          {line.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">
                          {formatCurrency(Number(line.unitCost))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium text-gray-900">
                          {formatCurrency(Number(line.totalCost))}
                        </td>
                      </tr>
                    ))}
                    {opportunity.quoteLines.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No quote lines yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {opportunity.quoteLines.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border bg-gray-50/50">
                        <td colSpan={5} className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Line Items Total
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                          {formatCurrency(lineTotals)}
                        </td>
                      </tr>
                      {opportunity.quotedPrice && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={5} className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                            Quoted Price (incl. R&D, risk, margin)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-lg text-gray-900">
                            {formatCurrency(Number(opportunity.quotedPrice))}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Link
              href={`/crm/quote/${opportunity.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Open Full Quote Builder
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <OpportunityActivityLog
            opportunityId={opportunity.id}
            initialActivities={serializedActivities}
            auditEntries={serializedAuditEntries}
          />
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Opportunity Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Opportunity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Status" value={prettifyEnum(opportunity.status)} />
                <DetailRow label="Lead Source" value={prettifyEnum(opportunity.leadSource)} />
                <DetailRow label="Win Probability" value={`${opportunity.winProbability}%`} />
                <DetailRow label="Estimated Value" value={formatCurrency(Number(opportunity.estimatedValue))} />
                <DetailRow label="Quoted Price" value={opportunity.quotedPrice ? formatCurrency(Number(opportunity.quotedPrice)) : "—"} />
                <DetailRow label="Quote Approval" value={prettifyEnum(opportunity.quoteApproval)} />
                <DetailRow label="Expected Close" value={formatDate(opportunity.expectedCloseDate)} />
                <DetailRow label="Contact Person" value={opportunity.contactPerson || "—"} />
                <DetailRow label="Has ETO Lines" value={opportunity.hasEtoLines ? "Yes" : "No"} />
                <DetailRow label="Created" value={formatDate(opportunity.createdAt)} />
                <DetailRow label="Updated" value={formatDate(opportunity.updatedAt)} />
              </CardContent>
            </Card>

            {/* Pricing & Margin */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pricing & Margin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DetailRow label="R&D Cost" value={opportunity.rdCost ? formatCurrency(Number(opportunity.rdCost)) : "—"} />
                  <DetailRow label="Risk Cost" value={opportunity.riskCost ? formatCurrency(Number(opportunity.riskCost)) : "—"} />
                  <DetailRow label="Margin %" value={opportunity.marginPercent ? `${Number(opportunity.marginPercent)}%` : "—"} />
                  <DetailRow label="Quoted Price" value={opportunity.quotedPrice ? formatCurrency(Number(opportunity.quotedPrice)) : "—"} />
                  {opportunity.quoteSentAt && (
                    <>
                      <DetailRow label="Quote Sent" value={formatDate(opportunity.quoteSentAt)} />
                      <DetailRow label="Sent To" value={opportunity.quoteSentTo || "—"} />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Dead Lead History */}
              {opportunity.deadReason && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-red-700">Dead Lead Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow label="Reason" value={opportunity.deadReason} />
                    <DetailRow label="Dead Notes" value={opportunity.deadNotes || "—"} />
                    <DetailRow label="Dead At" value={formatDate(opportunity.deadAt)} />
                    {opportunity.revivedAt && (
                      <DetailRow label="Revived At" value={formatDate(opportunity.revivedAt)} />
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Lifting Plan */}
              {opportunity.liftingPlanRequired && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Lifting Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow label="Status" value={opportunity.liftingPlanStatus || "TBC"} />
                    <DetailRow label="Crane Required" value={opportunity.craneRequired || "TBC"} />
                    <DetailRow label="Est. Weight" value={opportunity.estimatedWeight ? `${Number(opportunity.estimatedWeight)} kg` : "—"} />
                    <DetailRow label="Max Lift Height" value={opportunity.maxLiftHeight ? `${Number(opportunity.maxLiftHeight)} m` : "—"} />
                    <DetailRow label="Lifting Cost" value={opportunity.liftingPlanCost ? formatCurrency(Number(opportunity.liftingPlanCost)) : "—"} />
                    {opportunity.siteAccessNotes && (
                      <DetailRow label="Site Access" value={opportunity.siteAccessNotes} />
                    )}
                    {opportunity.deliveryNotes && (
                      <DetailRow label="Delivery Notes" value={opportunity.deliveryNotes} />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}
