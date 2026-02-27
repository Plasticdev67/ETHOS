"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

type TimelineCard = {
  id: string
  status: string
  targetStartDate: string | null
  targetEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  product: {
    id: string
    description: string
    partCode: string
    productJobNumber: string | null
  }
  project: {
    id: string
    projectNumber: string
    name: string
  }
  assignedDesigner: { id: string; name: string } | null
  jobCards: { id: string; jobType: string; status: string }[]
}

const DESIGNER_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-cyan-500", "bg-rose-500", "bg-lime-500", "bg-orange-500",
  "bg-teal-500", "bg-pink-500",
]

const DESIGNER_BORDER_COLORS = [
  "border-blue-500", "border-emerald-500", "border-violet-500", "border-amber-500",
  "border-cyan-500", "border-rose-500", "border-lime-500", "border-orange-500",
  "border-teal-500", "border-pink-500",
]

function getWeekDates(startDate: Date, weeks: number): Date[] {
  const dates: Date[] = []
  const d = new Date(startDate)
  d.setDate(d.getDate() - d.getDay() + 1) // Start from Monday
  for (let i = 0; i < weeks; i++) {
    dates.push(new Date(d))
    d.setDate(d.getDate() + 7)
  }
  return dates
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function getJobProgress(jobCards: { status: string }[]): number {
  if (jobCards.length === 0) return 0
  const done = jobCards.filter(
    (j) => j.status === "APPROVED" || j.status === "SIGNED_OFF"
  ).length
  return Math.round((done / jobCards.length) * 100)
}

function snapToDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

type DragState = {
  cardId: string
  designerId: string
  mode: "move" | "resize-left" | "resize-right"
  initialMouseX: number
  origStartMs: number
  origEndMs: number
  currentStartMs: number
  currentEndMs: number
  mouseX: number
  mouseY: number
}

export function DesignTimeline({ cards: serverCards }: { cards: TimelineCard[] }) {
  const router = useRouter()
  const [weeksToShow, setWeeksToShow] = useState(24)
  const [localCards, setLocalCards] = useState<TimelineCard[]>(serverCards)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [savingCardId, setSavingCardId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timelineAreaRef = useRef<HTMLDivElement>(null)
  const didDragRef = useRef(false)

  // Sync local cards when server data changes
  useEffect(() => { setLocalCards(serverCards) }, [serverCards])

  // Auto-clear toast after 3s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Group by designer
  const grouped = useMemo(() => {
    const map: Record<string, { designer: string; designerId: string; cards: TimelineCard[] }> = {}
    const unassigned: TimelineCard[] = []

    for (const card of localCards) {
      if (!card.assignedDesigner) {
        unassigned.push(card)
        continue
      }
      const key = card.assignedDesigner.id
      if (!map[key]) {
        map[key] = { designer: card.assignedDesigner.name, designerId: key, cards: [] }
      }
      map[key].cards.push(card)
    }

    const rows = Object.values(map).sort((a, b) => a.designer.localeCompare(b.designer))
    if (unassigned.length > 0) {
      rows.push({ designer: "Unassigned", designerId: "unassigned", cards: unassigned })
    }
    return rows
  }, [localCards])

  // Timeline range
  const now = useMemo(() => new Date(), [])
  const timelineStart = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - 14)
    d.setHours(0, 0, 0, 0)
    return d
  }, [now])
  const timelineEnd = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() + weeksToShow * 7)
    d.setHours(23, 59, 59, 999)
    return d
  }, [now, weeksToShow])
  const rangeMs = timelineEnd.getTime() - timelineStart.getTime()
  const weeks = useMemo(() => getWeekDates(timelineStart, weeksToShow + 2), [timelineStart, weeksToShow])
  const todayOffset = ((now.getTime() - timelineStart.getTime()) / rangeMs) * 100

  // --- Coordinate helpers ---
  function getTrackWidth(): number {
    return timelineAreaRef.current?.getBoundingClientRect().width ?? 1
  }

  function pxToMs(px: number): number {
    return (px / getTrackWidth()) * rangeMs
  }

  // --- Bar style computation (uses target dates, accounts for active drag) ---
  function getBarStyle(card: TimelineCard): { left: string; width: string } | null {
    let startMs: number
    let endMs: number

    if (dragState && dragState.cardId === card.id) {
      startMs = dragState.currentStartMs
      endMs = dragState.currentEndMs
    } else {
      if (!card.targetStartDate || !card.targetEndDate) return null
      startMs = new Date(card.targetStartDate).getTime()
      endMs = new Date(card.targetEndDate).getTime()
    }

    const left = Math.max(0, ((startMs - timelineStart.getTime()) / rangeMs) * 100)
    const right = Math.min(100, ((endMs - timelineStart.getTime()) / rangeMs) * 100)
    const width = Math.max(0.5, right - left)

    return { left: `${left}%`, width: `${width}%` }
  }

  // --- Overlap detection ---
  function checkOverlap(designerId: string, excludeCardId: string, newStartMs: number, newEndMs: number): TimelineCard | null {
    for (const card of localCards) {
      if (card.id === excludeCardId) continue
      if (card.assignedDesigner?.id !== designerId) continue
      if (card.status === "COMPLETE" || card.status === "ON_HOLD") continue
      if (!card.targetStartDate || !card.targetEndDate) continue
      const cStart = new Date(card.targetStartDate).getTime()
      const cEnd = new Date(card.targetEndDate).getTime()
      if (newStartMs < cEnd && newEndMs > cStart) return card
    }
    return null
  }

  // Is current drag position overlapping?
  const dragOverlap = dragState
    ? checkOverlap(dragState.designerId, dragState.cardId, dragState.currentStartMs, dragState.currentEndMs)
    : null

  // --- Drag handlers ---
  function handlePointerDown(
    e: React.PointerEvent,
    card: TimelineCard,
    mode: DragState["mode"]
  ) {
    if (card.status === "COMPLETE" || !card.assignedDesigner) return
    if (!card.targetStartDate || !card.targetEndDate) return
    e.preventDefault()
    e.stopPropagation()
    didDragRef.current = false

    const startMs = new Date(card.targetStartDate).getTime()
    const endMs = new Date(card.targetEndDate).getTime()

    setDragState({
      cardId: card.id,
      designerId: card.assignedDesigner.id,
      mode,
      initialMouseX: e.clientX,
      origStartMs: startMs,
      origEndMs: endMs,
      currentStartMs: startMs,
      currentEndMs: endMs,
      mouseX: e.clientX,
      mouseY: e.clientY,
    })
  }

  // Global listeners during drag
  useEffect(() => {
    if (!dragState) return

    function handleMove(e: PointerEvent) {
      didDragRef.current = true
      const deltaX = e.clientX - dragState!.initialMouseX
      const deltaMs = pxToMs(deltaX)

      let newStartMs: number
      let newEndMs: number

      if (dragState!.mode === "move") {
        newStartMs = dragState!.origStartMs + deltaMs
        newEndMs = dragState!.origEndMs + deltaMs
      } else if (dragState!.mode === "resize-right") {
        newStartMs = dragState!.origStartMs
        newEndMs = Math.max(dragState!.origStartMs + 86400000, dragState!.origEndMs + deltaMs)
      } else {
        // resize-left
        newStartMs = Math.min(dragState!.origEndMs - 86400000, dragState!.origStartMs + deltaMs)
        newEndMs = dragState!.origEndMs
      }

      setDragState((prev) =>
        prev ? { ...prev, currentStartMs: newStartMs, currentEndMs: newEndMs, mouseX: e.clientX, mouseY: e.clientY } : null
      )
    }

    function handleUp() {
      if (!dragState) return

      const { cardId, designerId, currentStartMs, currentEndMs, origStartMs, origEndMs } = dragState!

      setDragState(null)

      // If barely moved, treat as click (no-op)
      if (!didDragRef.current) return

      const newStart = snapToDay(new Date(currentStartMs))
      const newEnd = snapToDay(new Date(currentEndMs))
      // Ensure min 1 day
      if (newEnd.getTime() <= newStart.getTime()) {
        newEnd.setDate(newStart.getDate() + 1)
      }

      // No-op if dates didn't change
      if (newStart.getTime() === snapToDay(new Date(origStartMs)).getTime() &&
          newEnd.getTime() === snapToDay(new Date(origEndMs)).getTime()) return

      // Client-side overlap check
      const overlap = checkOverlap(designerId, cardId, newStart.getTime(), newEnd.getTime())
      if (overlap) {
        const label = overlap.product.productJobNumber || overlap.product.description
        setToast(`Schedule conflict: overlaps with "${overlap.project.name} — ${label}"`)
        return
      }

      // Optimistic update
      const previousCards = [...localCards]
      setLocalCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, targetStartDate: newStart.toISOString(), targetEndDate: newEnd.toISOString() }
            : c
        )
      )

      // Save to DB
      saveToDB(cardId, newStart, newEnd, previousCards)
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragState?.cardId, dragState?.mode, dragState?.initialMouseX])

  async function saveToDB(cardId: string, start: Date, end: Date, previousCards: TimelineCard[]) {
    setSavingCardId(cardId)
    try {
      const res = await fetch(`/api/design/cards/${cardId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStartDate: start.toISOString(),
          targetEndDate: end.toISOString(),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Save failed" }))
        setLocalCards(previousCards)
        setToast(data.error || "Failed to save schedule change")
      }
    } catch {
      setLocalCards(previousCards)
      setToast("Network error: schedule change was not saved")
    } finally {
      setSavingCardId(null)
    }
  }

  function handleBarClick(card: TimelineCard) {
    if (!didDragRef.current) {
      router.push(`/projects/${card.project.id}`)
    }
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Designer Timeline</h2>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
            value={weeksToShow}
            onChange={(e) => setWeeksToShow(Number(e.target.value))}
          >
            <option value={8}>8 weeks</option>
            <option value={12}>12 weeks</option>
            <option value={16}>16 weeks</option>
            <option value={24}>24 weeks</option>
            <option value={36}>36 weeks</option>
            <option value={52}>52 weeks (1 year)</option>
          </select>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="mb-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {toast}
        </div>
      )}

      <div className="rounded-lg border border-border bg-white overflow-hidden">
        {/* Header with week markers */}
        <div className="flex border-b border-border">
          <div className="w-[140px] shrink-0 px-3 py-2 bg-gray-50 border-r border-border">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">Designer</span>
          </div>
          <div className="flex-1 relative" ref={timelineAreaRef}>
            <div className="flex">
              {weeks.map((weekStart, i) => {
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekEnd.getDate() + 6)
                const isCurrentWeek = now >= weekStart && now <= weekEnd
                return (
                  <div
                    key={i}
                    className={`flex-1 px-1 py-2 text-center border-r border-border last:border-r-0 min-w-[60px] ${
                      isCurrentWeek ? "bg-blue-50" : "bg-gray-50"
                    }`}
                  >
                    <div className={`text-[9px] font-medium ${isCurrentWeek ? "text-blue-700" : "text-gray-500"}`}>
                      {formatShortDate(weekStart)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Designer rows */}
        {grouped.map((row, rowIdx) => (
          <div key={row.designerId} className="flex border-b border-border last:border-b-0">
            {/* Designer name */}
            <div className="w-[140px] shrink-0 px-3 py-3 border-r border-border bg-white">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${DESIGNER_COLORS[rowIdx % DESIGNER_COLORS.length]}`} />
                <span className="text-xs font-medium text-gray-800 truncate">
                  {row.designer}
                </span>
              </div>
              <div className="text-[9px] text-gray-400 mt-0.5 pl-4">
                {row.cards.length} product{row.cards.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Timeline bars — single lane per designer */}
            <div
              className="flex-1 relative"
              style={{ minHeight: "36px" }}
            >
              {/* Week grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {weeks.map((_, i) => (
                  <div key={i} className="flex-1 border-r border-gray-100 last:border-r-0" />
                ))}
              </div>

              {/* Today marker */}
              {todayOffset > 0 && todayOffset < 100 && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 z-20 pointer-events-none"
                  style={{ left: `${todayOffset}%` }}
                />
              )}

              {/* Product bars */}
              {(() => {
                const visibleCards = row.cards.filter((c) => getBarStyle(c))
                if (visibleCards.length === 0) {
                  return <div className="text-[9px] text-gray-300 py-3 text-center relative z-10">No dates set</div>
                }
                return visibleCards.map((card, barIdx) => {
                  const barStyle = getBarStyle(card)!
                  const progress = getJobProgress(card.jobCards)
                  const isDragging = dragState?.cardId === card.id
                  const isSaving = savingCardId === card.id
                  const isOverlapping = isDragging && !!dragOverlap
                  const isComplete = card.status === "COMPLETE"
                  const isDraggable = !isComplete && !!card.assignedDesigner && !!card.targetStartDate && !!card.targetEndDate

                  const barColor = isComplete
                    ? "bg-green-400"
                    : isOverlapping
                    ? "bg-red-400"
                    : DESIGNER_COLORS[rowIdx % DESIGNER_COLORS.length]
                  const borderColor = isComplete
                    ? "border-green-500"
                    : isOverlapping
                    ? "border-red-500"
                    : DESIGNER_BORDER_COLORS[rowIdx % DESIGNER_BORDER_COLORS.length]

                  const label = `${card.project.name} · ${card.product.productJobNumber || card.product.partCode}`
                  const tooltip = [
                    `${card.project.projectNumber} — ${card.project.name}`,
                    card.product.description,
                    card.product.productJobNumber || card.product.partCode,
                    `Progress: ${progress}%`,
                  ].join("\n")

                  return (
                    <div
                      key={card.id}
                      className={`absolute h-[24px] rounded-sm border ${borderColor} ${barColor} bg-opacity-80 flex items-center overflow-hidden z-10 ${
                        isDragging
                          ? "opacity-90 shadow-lg ring-2 ring-blue-300 z-30 cursor-grabbing"
                          : isSaving
                          ? "animate-pulse"
                          : isDraggable
                          ? "cursor-grab hover:bg-opacity-100 hover:shadow-md transition-shadow"
                          : "cursor-pointer hover:bg-opacity-100 transition-shadow"
                      }`}
                      style={{
                        left: barStyle.left,
                        width: barStyle.width,
                        top: "6px",
                      }}
                      title={tooltip}
                      onPointerDown={isDraggable ? (e) => handlePointerDown(e, card, "move") : undefined}
                      onClick={() => handleBarClick(card)}
                    >
                      {/* Left resize handle */}
                      {isDraggable && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/20"
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            handlePointerDown(e, card, "resize-left")
                          }}
                        />
                      )}

                      {/* Bar content */}
                      <div className="flex-1 min-w-0 px-2 pointer-events-none">
                        <span className="text-[8px] font-medium text-white truncate block drop-shadow-sm">
                          {label}
                        </span>
                      </div>

                      {/* Right resize handle */}
                      {isDraggable && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-[6px] cursor-col-resize z-20 hover:bg-white/20"
                          onPointerDown={(e) => {
                            e.stopPropagation()
                            handlePointerDown(e, card, "resize-right")
                          }}
                        />
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No design cards assigned to designers yet
          </div>
        )}
      </div>

      {/* Drag tooltip showing dates */}
      {dragState && didDragRef.current && (
        <div
          className="fixed z-50 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 rounded shadow-lg pointer-events-none"
          style={{ left: dragState.mouseX + 12, top: dragState.mouseY - 28 }}
        >
          {formatShortDate(snapToDay(new Date(dragState.currentStartMs)))} — {formatShortDate(snapToDay(new Date(dragState.currentEndMs)))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-px h-3 bg-red-400" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-green-400" />
          <span>Complete</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-blue-500 opacity-80" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          <span>Drag to reschedule</span>
        </div>
      </div>
    </div>
  )
}
