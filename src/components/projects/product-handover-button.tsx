"use client"

import { useState } from "react"

type Props = {
  projectId: string
  productId: string
  designStatus: string | null  // null = no design card, "COMPLETE" = ready
  productionStatus: string | null
}

export function ProductHandoverButton({ projectId, productId, designStatus, productionStatus }: Props) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already in production — show status
  if (productionStatus) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        In Production
      </span>
    )
  }

  // Successfully sent
  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Proposed
      </span>
    )
  }

  // Design not complete — disabled button
  const isReady = designStatus === "COMPLETE"

  async function handleHandover() {
    if (!isReady) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/design/handover/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includedProductIds: [productId] }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed")
      }
    } catch {
      setError("Network error")
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleHandover}
        disabled={!isReady || sending}
        title={!isReady ? "Design must be complete before handover" : "Send to production handover"}
        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
          isReady
            ? "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        {sending ? "Sending..." : "Handover"}
      </button>
      {error && <p className="text-[9px] text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
