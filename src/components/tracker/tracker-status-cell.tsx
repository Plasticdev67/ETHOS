"use client"

import { Badge } from "@/components/ui/badge"
import { getDepartmentColor, getProductionStageColor, prettifyEnum } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"

const departments = ["PLANNING", "DESIGN", "PRODUCTION", "INSTALLATION", "REVIEW", "COMPLETE"]
const productionStages = [
  "AWAITING", "CUTTING", "FABRICATION", "FITTING", "SHOTBLASTING",
  "PAINTING", "PACKING", "DISPATCHED", "STORAGE", "REWORK", "SUB_CONTRACT", "COMPLETED", "N_A",
]

export function TrackerStatusCell({
  productId,
  type,
  currentValue,
}: {
  productId: string
  type: "department" | "production"
  currentValue: string
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const options = type === "department" ? departments : productionStages
  const colorFn = type === "department" ? getDepartmentColor : getProductionStageColor

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  async function updateStatus(newValue: string) {
    setUpdating(true)
    setOpen(false)
    try {
      const body = type === "department"
        ? { currentDepartment: newValue }
        : { productionStatus: newValue }

      await fetch(`/api/products/${productId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      router.refresh()
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Badge
        variant="secondary"
        className={`cursor-pointer text-xs ${colorFn(currentValue)} ${updating ? "opacity-50" : ""}`}
        onClick={() => !updating && setOpen(!open)}
      >
        {prettifyEnum(currentValue)}
      </Badge>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1">
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-white p-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => updateStatus(opt)}
                disabled={updating || opt === currentValue}
                className={`block w-full whitespace-nowrap rounded px-3 py-1.5 text-left text-xs transition-colors ${
                  opt === currentValue
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {prettifyEnum(opt)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
