"use client"

const STEP_ORDER = [
  "BLOCKED",
  "READY",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "SIGNED_OFF",
] as const

const STEP_LABELS: Record<string, string> = {
  BLOCKED: "Blocked",
  READY: "Ready",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  SIGNED_OFF: "Signed Off",
}

function getStepIndex(status: string): number {
  const idx = STEP_ORDER.indexOf(status as (typeof STEP_ORDER)[number])
  // REJECTED maps to the SUBMITTED step position
  if (status === "REJECTED") return STEP_ORDER.indexOf("SUBMITTED")
  return idx >= 0 ? idx : 0
}

export function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const isRejected = currentStatus === "REJECTED"
  const currentIndex = getStepIndex(currentStatus)

  return (
    <div className="flex items-start w-full">
      {STEP_ORDER.map((step, index) => {
        const isCurrentStep = index === currentIndex
        const isPast = index < currentIndex
        const isRejectedStep = isRejected && step === "SUBMITTED"
        const isLast = index === STEP_ORDER.length - 1

        // Determine circle styles
        let circleClasses: string
        let innerContent: React.ReactNode

        if (isRejectedStep) {
          // Rejected: red circle with X
          circleClasses =
            "w-8 h-8 rounded-full bg-red-500 border-2 border-red-600 flex items-center justify-center shadow-sm"
          innerContent = (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        } else if (isPast) {
          // Past: green circle with checkmark
          circleClasses =
            "w-8 h-8 rounded-full bg-green-500 border-2 border-green-600 flex items-center justify-center shadow-sm"
          innerContent = (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )
        } else if (isCurrentStep && !isRejected) {
          // Current: blue circle with pulse
          circleClasses =
            "w-8 h-8 rounded-full bg-blue-500 border-2 border-blue-600 flex items-center justify-center shadow-sm ring-4 ring-blue-100 animate-pulse"
          innerContent = (
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          )
        } else {
          // Future: gray outline circle
          circleClasses =
            "w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center"
          innerContent = (
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          )
        }

        // Determine connector line color
        const lineColor = index < currentIndex ? "bg-green-500" : "bg-gray-200"

        // Label display: show "Rejected" instead of "Submitted" when rejected
        const label = isRejectedStep ? "Rejected" : STEP_LABELS[step]
        const labelColor = isRejectedStep
          ? "text-red-600 font-medium"
          : isCurrentStep && !isRejected
            ? "text-blue-700 font-medium"
            : isPast
              ? "text-green-700"
              : "text-gray-400"

        return (
          <div key={step} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div className={circleClasses}>{innerContent}</div>
              {/* Label */}
              <span className={`mt-2 text-[11px] text-center leading-tight ${labelColor}`}>
                {label}
              </span>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 flex items-center pt-4 px-1">
                <div className={`h-0.5 w-full rounded-full ${lineColor}`} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
