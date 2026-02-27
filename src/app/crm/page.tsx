import { Suspense } from "react"
import { NewProspectDialog } from "@/components/crm/new-prospect-dialog"
import { NewLeadDialog } from "@/components/crm/new-lead-dialog"
import { CrmViewSwitcher } from "@/components/crm/view-switcher"
import { CrmBoardView } from "@/components/crm/board-view"
import { CrmTableView } from "@/components/crm/table-view"
import { CrmPipelineView } from "@/components/crm/pipeline-view"

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm text-gray-400">Loading...</div>
    </div>
  )
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const view = params.view || "pipeline"

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 shrink-0">CRM Pipeline</h1>
        <div className="flex items-center gap-2 shrink-0">
          <NewLeadDialog />
          <NewProspectDialog />
        </div>
      </div>

      {/* Notion-style view switcher */}
      <CrmViewSwitcher />

      {/* View content */}
      <Suspense fallback={<ViewFallback />}>
        {view === "board" && <CrmBoardView />}
        {view === "table" && <CrmTableView searchParams={params} />}
        {view === "pipeline" && <CrmPipelineView />}
      </Suspense>
    </div>
  )
}
