"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  designCardIds: string[]
  designers: { id: string; name: string }[]
}

export function AssignDesignerDialog({ open, onOpenChange, designCardIds, designers }: Props) {
  const router = useRouter()
  const [selectedDesigner, setSelectedDesigner] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  async function handleAssign() {
    if (!selectedDesigner) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/design/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designCardIds,
          designerId: selectedDesigner,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to assign designer")
        return
      }

      onOpenChange(false)
      setSelectedDesigner("")
      router.refresh()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl border border-border w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Assign Designer</h3>
        <p className="text-sm text-gray-500 mb-4">
          Assigning {designCardIds.length} design card{designCardIds.length !== 1 ? "s" : ""}
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Select Designer</label>
        <select
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          value={selectedDesigner}
          onChange={(e) => setSelectedDesigner(e.target.value)}
        >
          <option value="">Choose a designer...</option>
          {designers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => {
              onOpenChange(false)
              setSelectedDesigner("")
              setError("")
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedDesigner || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  )
}
