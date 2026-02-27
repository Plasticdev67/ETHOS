import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ViewSwitcher } from "@/components/projects/view-switcher"
import { BoardView } from "@/components/projects/board-view"
import { TableView } from "@/components/projects/table-view"
import { TrackerView } from "@/components/projects/tracker-view"
import { ByCustomerView } from "@/components/projects/by-customer-view"
import { TimelineView } from "@/components/projects/timeline-view"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm text-gray-400">Loading...</div>
    </div>
  )
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const view = params.view || "board"

  return (
    <div className="space-y-4">
      <DashboardTabs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Notion-style view switcher */}
      <ViewSwitcher />

      {/* View content */}
      <Suspense fallback={<ViewFallback />}>
        {view === "board" && <BoardView />}
        {view === "table" && <TableView searchParams={params} />}
        {view === "tracker" && <TrackerView searchParams={params} />}
        {view === "by-customer" && <ByCustomerView />}
        {view === "timeline" && <TimelineView />}
      </Suspense>
    </div>
  )
}
