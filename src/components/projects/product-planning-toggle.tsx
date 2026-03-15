"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function ProductPlanningToggle({
  productId,
  enabled,
}: {
  productId: string
  enabled: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(enabled)
  const [updating, setUpdating] = useState(false)

  async function toggle() {
    const newValue = !value
    setUpdating(true)
    try {
      const res = await fetch(`/api/products/${productId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productionPlanningEnabled: newValue }),
      })
      if (res.ok) {
        setValue(newValue)
        router.refresh()
      }
    } finally {
      setUpdating(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={updating}
      title={value ? "Production planning enabled — click to disable" : "Production planning disabled — click to enable"}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:opacity-50 ${
        value ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
          value ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  )
}
