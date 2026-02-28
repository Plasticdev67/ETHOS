import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, CalendarRange } from "lucide-react"
import { formatDate } from "@/lib/utils"

type DeadlineProject = {
  id: string
  projectNumber: string
  name: string
  targetCompletion: Date
  daysUntil: number
}

export function UpcomingDeadlines({ projects }: { projects: DeadlineProject[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-base font-semibold">Upcoming Deadlines</CardTitle>
          </div>
          <Link href="/planning/aggregated" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View Schedule <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {projects.length > 0 ? (
          <div className="space-y-1.5">
            {projects.map((project) => {
              const isOverdue = project.daysUntil < 0
              const isUrgent = project.daysUntil >= 0 && project.daysUntil <= 7

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 cursor-pointer hover:shadow-sm transition-shadow ${
                    isOverdue ? "border-red-200 bg-red-50/50" : isUrgent ? "border-amber-200 bg-amber-50/50" : "border-border"
                  }`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-900 truncate">{project.name}</div>
                      <div className="text-[10px] text-gray-500">{project.projectNumber}</div>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <div className="text-[10px] text-gray-500">{formatDate(project.targetCompletion)}</div>
                      <div className={`text-[10px] font-semibold ${
                        isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-gray-600"
                      }`}>
                        {isOverdue
                          ? `${Math.abs(project.daysUntil)}d overdue`
                          : project.daysUntil === 0
                            ? "Today"
                            : `${project.daysUntil}d`}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">No upcoming deadlines</p>
        )}
      </CardContent>
    </Card>
  )
}
