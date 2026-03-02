import { cn } from "@/lib/utils"

const STAGES = [
  { id: "ACTIVE_LEAD", label: "Active Lead" },
  { id: "PENDING_APPROVAL", label: "Pending Approval" },
  { id: "QUOTED", label: "Quoted" },
  { id: "WON", label: "Won" },
]

export function OpportunityStagePath({ currentStatus }: { currentStatus: string }) {
  // Terminal states get a special banner
  if (currentStatus === "DEAD_LEAD") {
    return (
      <div className="rounded-full bg-gray-100 text-gray-600 px-4 py-2 text-xs font-medium text-center">
        Dead Lead
      </div>
    )
  }
  if (currentStatus === "LOST") {
    return (
      <div className="rounded-full bg-red-100 text-red-700 px-4 py-2 text-xs font-medium text-center">
        Lost
      </div>
    )
  }

  const stageIndex = STAGES.findIndex((s) => s.id === currentStatus)

  return (
    <div className="flex items-center">
      {STAGES.map((stage, i) => {
        const isPast = stageIndex > i
        const isCurrent = stageIndex === i
        const isFuture = stageIndex < i

        return (
          <div
            key={stage.id}
            className={cn(
              "relative flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium flex-1 text-center transition-colors",
              isPast && "bg-green-100 text-green-700",
              isCurrent && "bg-blue-600 text-white",
              isFuture && "bg-gray-100 text-gray-400",
              i === 0 && "rounded-l-full",
              i === STAGES.length - 1 && "rounded-r-full",
            )}
          >
            {isPast && (
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="truncate">{stage.label}</span>
          </div>
        )
      })}
    </div>
  )
}
