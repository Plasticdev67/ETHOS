"use client"

import { Badge } from "@/components/ui/badge"
import { getDepartmentColor, prettifyEnum } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"

const departments = ["PLANNING", "DESIGN", "PRODUCTION", "INSTALLATION", "REVIEW", "COMPLETE"]

export function ProductStatusActions({
  productId,
  currentDepartment,
  currentProductionStage,
}: {
  productId: string
  currentDepartment: string
  currentProductionStage: string | null
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  async function updateDepartment(newDepartment: string) {
    setUpdating(true)
    setOpen(false)
    try {
      await fetch(`/api/products/${productId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentDepartment: newDepartment }),
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
        className={`cursor-pointer ${getDepartmentColor(currentDepartment)} ${updating ? "opacity-50" : ""}`}
        onClick={() => !updating && setOpen(!open)}
      >
        {prettifyEnum(currentDepartment)}
      </Badge>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1">
          <div className="rounded-lg border border-border bg-white p-1 shadow-lg">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => updateDepartment(dept)}
                disabled={updating || dept === currentDepartment}
                className={`block w-full whitespace-nowrap rounded px-3 py-1.5 text-left text-xs transition-colors ${
                  dept === currentDepartment
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {prettifyEnum(dept)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
