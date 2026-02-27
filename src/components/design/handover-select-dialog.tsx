"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

type HandoverProduct = {
  productId: string
  designCardId: string
  partCode: string
  productJobNumber: string | null
  description: string
  inProduction: boolean
}

type HandoverSelectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectNumber: string
  projectName: string
  products: HandoverProduct[]
  onSubmitted: () => void
}

export function HandoverSelectDialog({
  open,
  onOpenChange,
  projectId,
  projectNumber,
  projectName,
  products,
  onSubmitted,
}: HandoverSelectDialogProps) {
  const handoverable = products.filter((p) => !p.inProduction)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(handoverable.map((p) => p.productId)))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const allSelected = handoverable.length > 0 && selected.size === handoverable.length
  const noneSelected = selected.size === 0

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(handoverable.map((p) => p.productId)))
    }
  }

  function toggle(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  async function handleSubmit() {
    if (noneSelected) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/design/handover/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includedProductIds: Array.from(selected) }),
      })
      if (res.ok) {
        onSubmitted()
        onOpenChange(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Failed to submit handover")
      }
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Propose Handover</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-mono">{projectNumber}</span> — {projectName}
          </p>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-600">
              Select products to hand over ({selected.size} of {handoverable.length})
            </span>
            <button
              onClick={toggleAll}
              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="space-y-1.5">
            {products.map((p) => {
              const isHandoverable = !p.inProduction
              const isChecked = selected.has(p.productId)

              return (
                <label
                  key={p.productId}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all",
                    p.inProduction
                      ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                      : isChecked
                      ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200/50"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isHandoverable}
                    onChange={() => toggle(p.productId)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.description}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{p.productJobNumber || p.partCode}</div>
                  </div>
                  {p.inProduction ? (
                    <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      In Production
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      Ready
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 px-3 py-2 rounded bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={noneSelected || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {submitting
              ? "Submitting..."
              : `Propose Handover (${selected.size} product${selected.size !== 1 ? "s" : ""})`}
          </button>
        </div>
      </div>
    </div>
  )
}
