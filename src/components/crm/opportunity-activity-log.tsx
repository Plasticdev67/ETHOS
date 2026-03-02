"use client"

import { useState, useRef, useEffect } from "react"

type OpportunityActivity = {
  id: string
  opportunityId: string
  userId: string | null
  userName: string
  type: string
  subject: string | null
  message: string
  pinned: boolean
  createdAt: string
}

type AuditEntry = {
  id: string
  userName: string | null
  action: string
  entity: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

type TimelineEntry = {
  id: string
  type: string
  userName: string
  subject: string | null
  message: string
  createdAt: string
  pinned?: boolean
}

const TYPE_STYLES: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  NOTE: { bg: "bg-blue-100", text: "text-blue-700", icon: "N", label: "Note" },
  CALL: { bg: "bg-green-100", text: "text-green-700", icon: "C", label: "Call" },
  EMAIL: { bg: "bg-purple-100", text: "text-purple-700", icon: "E", label: "Email" },
  MEETING: { bg: "bg-amber-100", text: "text-amber-700", icon: "M", label: "Meeting" },
  STATUS_CHANGE: { bg: "bg-gray-200", text: "text-gray-600", icon: "→", label: "Status" },
  TASK: { bg: "bg-red-100", text: "text-red-700", icon: "T", label: "Task" },
}

const ACTIVITY_TYPES = [
  { value: "NOTE", label: "Note" },
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "TASK", label: "Task" },
]

const TYPES_WITH_SUBJECT = new Set(["CALL", "EMAIL", "MEETING"])

function mergeTimeline(activities: OpportunityActivity[], audits: AuditEntry[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const activity of activities) {
    entries.push({
      id: activity.id,
      type: activity.type,
      userName: activity.userName,
      subject: activity.subject,
      message: activity.message,
      createdAt: activity.createdAt,
      pinned: activity.pinned,
    })
  }

  for (const audit of audits) {
    // Only include significant opportunity-level events
    const isSignificant =
      (audit.entity === "Opportunity" && audit.field === "status") ||
      (audit.entity === "Opportunity" && audit.action === "CREATE")

    if (!isSignificant) continue

    // Avoid duplicating status changes that are already logged as activities
    const isDuplicate = activities.some(
      (a) => a.type === "STATUS_CHANGE" && Math.abs(new Date(a.createdAt).getTime() - new Date(audit.createdAt).getTime()) < 5000
    )
    if (isDuplicate) continue

    let message = `${audit.action} ${audit.entity}`
    if (audit.field === "status") {
      message = `Status changed from ${audit.oldValue || "—"} to ${audit.newValue || "—"}`
    }
    if (audit.action === "CREATE") {
      message = "Opportunity created"
    }

    entries.push({
      id: `audit-${audit.id}`,
      type: "STATUS_CHANGE",
      userName: audit.userName || "System",
      subject: null,
      message,
      createdAt: audit.createdAt,
    })
  }

  // Pinned first, then newest first
  entries.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return entries
}

export function OpportunityActivityLog({
  opportunityId,
  initialActivities,
  auditEntries,
}: {
  opportunityId: string
  initialActivities: OpportunityActivity[]
  auditEntries: AuditEntry[]
}) {
  const [activities, setActivities] = useState<OpportunityActivity[]>(initialActivities)
  const [message, setMessage] = useState("")
  const [activityType, setActivityType] = useState("NOTE")
  const [subject, setSubject] = useState("")
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const timeline = mergeTimeline(activities, auditEntries)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [message])

  async function handleSubmit() {
    if (!message.trim() || sending) return
    setSending(true)

    try {
      let userName = "Unknown"
      let userId: string | null = null
      try {
        const sessionRes = await fetch("/api/auth/session")
        if (sessionRes.ok) {
          const session = await sessionRes.json()
          if (session?.user) {
            userName = session.user.name || "Unknown"
            userId = session.user.id || null
          }
        }
      } catch {
        // Fall through
      }

      const res = await fetch(`/api/opportunities/${opportunityId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          type: activityType,
          subject: TYPES_WITH_SUBJECT.has(activityType) ? subject.trim() || null : null,
          userName,
          userId,
        }),
      })

      if (res.ok) {
        const newActivity = await res.json()
        setActivities((prev) => [newActivity, ...prev])
        setMessage("")
        setSubject("")
        setActivityType("NOTE")
      }
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col border border-border rounded-lg bg-white overflow-hidden" style={{ minHeight: "500px" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Activity Timeline</h3>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Calls, emails, meetings, and notes — {timeline.length} entries
        </p>
      </div>

      {/* Timeline feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: "calc(100vh - 450px)", minHeight: "350px" }}>
        {timeline.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No activity yet</p>
            <p className="text-xs mt-0.5">Log a call, email, or note to get started</p>
          </div>
        )}

        {timeline.map((entry) => {
          const style = TYPE_STYLES[entry.type] || TYPE_STYLES.NOTE
          const date = new Date(entry.createdAt)
          const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

          return (
            <div
              key={entry.id}
              className={`flex gap-3 ${entry.type === "STATUS_CHANGE" ? "opacity-75" : ""}`}
            >
              {/* Type icon */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${style.bg} ${style.text}`}>
                {style.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{entry.userName}</span>
                  <span className="text-[10px] text-gray-400">{dateStr} {timeStr}</span>
                  {entry.pinned && (
                    <span className="text-[9px] text-amber-600 font-medium">Pinned</span>
                  )}
                </div>
                {entry.subject && (
                  <p className="mt-0.5 text-sm font-medium text-gray-900">{entry.subject}</p>
                )}
                <p className="mt-0.5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {entry.message}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-gray-50 px-4 py-3">
        <div className="flex gap-2 items-end">
          <select
            className="shrink-0 rounded-md border border-border px-2 py-2 text-xs bg-white focus:border-blue-500 focus:outline-none"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <div className="flex-1 flex flex-col gap-1">
            {TYPES_WITH_SUBJECT.has(activityType) && (
              <input
                className="w-full rounded-md border border-border px-3 py-1.5 text-sm bg-white focus:border-blue-500 focus:outline-none"
                placeholder={`${activityType === "CALL" ? "Call" : activityType === "EMAIL" ? "Email" : "Meeting"} subject...`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            )}
            <textarea
              ref={textareaRef}
              className="w-full rounded-md border border-border px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none resize-none overflow-hidden"
              placeholder="Add details... (Ctrl+Enter to send)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ minHeight: "38px", maxHeight: "120px" }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!message.trim() || sending}
            className="shrink-0 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Ctrl+Enter to send</p>
      </div>
    </div>
  )
}
