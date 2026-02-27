"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function SyncFromSageButton() {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{
    message: string
    synced?: { families: number; types: number; variants: number; bomItems: number }
    error?: string
  } | null>(null)

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch("/api/catalogue/sync-from-sage", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setResult({ message: data.error || "Sync failed", error: data.details })
      } else {
        setResult(data)
        router.refresh()
      }
    } catch (err) {
      setResult({ message: "Network error", error: String(err) })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
        <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync from BOM Library"}
      </Button>
      {result && !result.error && result.synced && (
        <span className="text-xs text-green-600">
          Synced {result.synced.families} families, {result.synced.types} types, {result.synced.variants} variants, {result.synced.bomItems} BOM items
        </span>
      )}
      {result?.error && (
        <span className="text-xs text-red-600">
          {result.message}: {result.error}
        </span>
      )}
    </div>
  )
}
