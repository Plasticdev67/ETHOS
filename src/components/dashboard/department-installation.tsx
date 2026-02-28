import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, HardHat } from "lucide-react"
import { formatDate } from "@/lib/utils"

type InstallationData = {
  activeInstalls: number
  upcoming: {
    id: string
    projectNumber: string
    name: string
    targetCompletion: Date | null
    customer: string
  }[]
}

export function DepartmentInstallation({ data }: { data: InstallationData }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-teal-600" />
            <CardTitle className="text-base font-semibold">Installation</CardTitle>
          </div>
          <Link href="/installation" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View Installs <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active count */}
        <div className="rounded-lg bg-teal-50 p-2.5">
          <div className="text-[10px] font-medium text-teal-600 uppercase">Active Installs</div>
          <div className="text-lg font-semibold text-gray-900">{data.activeInstalls} projects</div>
        </div>

        {/* Upcoming */}
        {data.upcoming.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-medium text-gray-400 uppercase">Upcoming (30 days)</div>
            {data.upcoming.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="flex items-center justify-between rounded-lg border border-border px-2.5 py-1.5 cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 truncate">{project.name}</div>
                    <div className="text-[10px] text-gray-500">{project.projectNumber} — {project.customer}</div>
                  </div>
                  {project.targetCompletion && (
                    <div className="text-[10px] font-medium text-gray-600 ml-2 shrink-0">
                      {formatDate(project.targetCompletion)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {data.activeInstalls === 0 && data.upcoming.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No active installations</p>
        )}
      </CardContent>
    </Card>
  )
}
