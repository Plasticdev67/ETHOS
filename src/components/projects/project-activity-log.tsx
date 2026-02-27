"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

type ProjectNote = {
  id: string
  projectId: string
  userId: string | null
  userName: string
  message: string
  category: string
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
  metadata: string | null
  createdAt: string
}

type TimelineEntry = {
  id: string
  type: "note" | "milestone"
  userName: string
  message: string
  category: string
  createdAt: string
  pinned?: boolean
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  NOTE: { bg: "bg-blue-100", text: "text-blue-700", icon: "N" },
  MILESTONE: { bg: "bg-purple-100", text: "text-purple-700", icon: "M" },
  DECISION: { bg: "bg-amber-100", text: "text-amber-700", icon: "D" },
  ISSUE: { bg: "bg-red-100", text: "text-red-700", icon: "!" },
}

const CATEGORIES = [
  { value: "NOTE", label: "Note" },
  { value: "DECISION", label: "Decision" },
  { value: "ISSUE", label: "Issue" },
]

function formatAuditAsMessage(entry: AuditEntry): string {
  const entity = entry.entity
  const field = entry.field
  const action = entry.action

  if (entity === "Project" && field === "projectStatus") {
    return `Project status changed from ${entry.oldValue || "—"} to ${entry.newValue || "—"}`
  }
  if (entity === "Project" && field === "departmentStatus") {
    return `Department status updated to ${entry.newValue || "—"}`
  }
  if (entity === "DesignHandover" && field === "status") {
    if (entry.newValue === "SUBMITTED") return "Design handover submitted for review"
    if (entry.newValue === "ACKNOWLEDGED") return "Design handover accepted by production"
    if (entry.newValue === "REJECTED") return "Design handover returned by production"
    return `Design handover status changed to ${entry.newValue}`
  }
  if (entity === "Project" && field === "partialHandover") {
    return `Partial handover: ${entry.newValue}`
  }
  if (entity === "ProductDesignCard" && field === "status") {
    return `Design card status changed to ${entry.newValue}`
  }
  if (entity === "ProductionTask" && field === "status") {
    return `Production task ${field}: ${entry.oldValue || "—"} → ${entry.newValue || "—"}`
  }
  if (action === "CREATE" && entity === "Project") {
    return "Project created"
  }

  // Generic fallback
  if (field) {
    return `${entity} ${field} changed${entry.oldValue ? ` from ${entry.oldValue}` : ""}${entry.newValue ? ` to ${entry.newValue}` : ""}`
  }
  return `${action} ${entity}`
}

function mergeTimeline(notes: ProjectNote[], audits: AuditEntry[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const note of notes) {
    entries.push({
      id: note.id,
      type: "note",
      userName: note.userName,
      message: note.message,
      category: note.category,
      createdAt: note.createdAt,
      pinned: note.pinned,
    })
  }

  for (const audit of audits) {
    // Only include significant project-level events
    const isSignificant =
      (audit.entity === "Project" && audit.field === "projectStatus") ||
      (audit.entity === "Project" && audit.action === "CREATE") ||
      (audit.entity === "DesignHandover" && audit.field === "status") ||
      (audit.entity === "Project" && audit.field === "partialHandover")

    if (!isSignificant) continue

    entries.push({
      id: `audit-${audit.id}`,
      type: "milestone",
      userName: audit.userName || "System",
      message: formatAuditAsMessage(audit),
      category: "MILESTONE",
      createdAt: audit.createdAt,
    })
  }

  // Sort chronologically (newest first)
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return entries
}

export function ProjectActivityLog({
  projectId,
  initialNotes,
  auditEntries,
}: {
  projectId: string
  initialNotes: ProjectNote[]
  auditEntries: AuditEntry[]
}) {
  const router = useRouter()
  const [notes, setNotes] = useState<ProjectNote[]>(initialNotes)
  const [message, setMessage] = useState("")
  const [category, setCategory] = useState("NOTE")
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const timeline = mergeTimeline(notes, auditEntries)

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
      // Get user session
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

      const res = await fetch(`/api/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), category, userName, userId }),
      })

      if (res.ok) {
        const newNote = await res.json()
        setNotes((prev) => [newNote, ...prev])
        setMessage("")
        setCategory("NOTE")
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
        <h3 className="text-sm font-semibold text-gray-900">Project Activity Log</h3>
        <p className="text-[10px] text-gray-500 mt-0.5">
          Milestones, notes, and key decisions — {timeline.length} entries
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
            <p className="text-xs mt-0.5">Add a note to get started</p>
          </div>
        )}

        {timeline.map((entry) => {
          const style = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.NOTE
          const date = new Date(entry.createdAt)
          const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

          return (
            <div
              key={entry.id}
              className={`flex gap-3 ${entry.type === "milestone" ? "opacity-75" : ""}`}
            >
              {/* Category icon */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${style.bg} ${style.text}`}>
                {style.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${style.bg} ${style.text}`}>
                    {entry.category}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{entry.userName}</span>
                  <span className="text-[10px] text-gray-400">{dateStr} {timeStr}</span>
                </div>
                <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
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
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <textarea
            ref={textareaRef}
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none resize-none overflow-hidden"
            placeholder="Add a note, decision, or key info... (Ctrl+Enter to send)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ minHeight: "38px", maxHeight: "120px" }}
          />

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
