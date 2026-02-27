"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  jobCard: {
    id: string
    status: string
    rejectionReason?: string | null
  }
}

export function TaskActionButtons({ jobCard }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  async function callApi(endpoint: string, body?: Record<string, unknown>) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/design/jobs/${jobCard.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      setShowRejectInput(false)
      setRejectReason("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  // Render based on current status
  switch (jobCard.status) {
    case "READY":
      return (
        <div className="inline-flex flex-col items-end gap-1">
          <button
            onClick={() => callApi("start")}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Spinner />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            )}
            Start
          </button>
          {error && <ErrorText message={error} />}
        </div>
      )

    case "IN_PROGRESS":
      return (
        <div className="inline-flex flex-col items-end gap-1">
          <button
            onClick={() => callApi("submit-review")}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Spinner />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            Submit for Review
          </button>
          {error && <ErrorText message={error} />}
        </div>
      )

    case "SUBMITTED":
      if (showRejectInput) {
        return (
          <div className="inline-flex flex-col items-end gap-1.5 w-full max-w-[220px]">
            <textarea
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full rounded-md border border-red-300 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
              rows={2}
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => { setShowRejectInput(false); setRejectReason("") }}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => callApi("reject", { rejectionReason: rejectReason })}
                disabled={loading || !rejectReason.trim()}
                className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "..." : "Confirm Reject"}
              </button>
            </div>
            {error && <ErrorText message={error} />}
          </div>
        )
      }
      return (
        <div className="inline-flex flex-col items-end gap-1">
          <div className="flex gap-1.5">
            <button
              onClick={() => callApi("approve")}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Spinner />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              Approve
            </button>
            <button
              onClick={() => setShowRejectInput(true)}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </button>
          </div>
          {error && <ErrorText message={error} />}
        </div>
      )

    case "REJECTED":
      return (
        <div className="inline-flex flex-col items-end gap-1">
          {jobCard.rejectionReason && (
            <p className="text-[10px] text-red-600 max-w-[200px] text-right truncate" title={jobCard.rejectionReason}>
              {jobCard.rejectionReason}
            </p>
          )}
          <button
            onClick={() => callApi("start")}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Spinner />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Re-work
          </button>
          {error && <ErrorText message={error} />}
        </div>
      )

    case "APPROVED":
      return (
        <div className="inline-flex flex-col items-end gap-1">
          <button
            onClick={() => callApi("sign-off")}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Spinner />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
            Sign Off
          </button>
          {error && <ErrorText message={error} />}
        </div>
      )

    case "SIGNED_OFF":
      return (
        <span className="inline-flex items-center gap-1 text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )

    default:
      return null
  }
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function ErrorText({ message }: { message: string }) {
  return <p className="text-[10px] text-red-600">{message}</p>
}
