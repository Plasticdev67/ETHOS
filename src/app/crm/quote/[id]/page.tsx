import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { QuoteBuilder } from "@/components/crm/quote-builder"

export const revalidate = 60

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const userRole = (session?.user as { role?: string })?.role || "STAFF"

  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      prospect: { select: { id: true, companyName: true } },
      quoteLines: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!opportunity) notFound()

  const serialized = JSON.parse(JSON.stringify(opportunity))

  return (
    <div className="space-y-4">
      <QuoteBuilder opportunity={serialized} userRole={userRole} />
    </div>
  )
}
