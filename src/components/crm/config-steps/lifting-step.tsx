"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LiftingConfig } from "@/lib/product-config-types"
import { LIFTING_PLAN_WEIGHT_THRESHOLD } from "@/lib/product-config-types"

export function LiftingStep({
  config,
  onChange,
  estimatedWeight,
}: {
  config: LiftingConfig
  onChange: (config: LiftingConfig) => void
  estimatedWeight: number | null
}) {
  const weightExceedsThreshold = (estimatedWeight || 0) >= LIFTING_PLAN_WEIGHT_THRESHOLD

  function update(patch: Partial<LiftingConfig>) {
    onChange({ ...config, ...patch })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Delivery and installation requirements:</p>

      {/* Lifting Plan */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Lifting Plan Required?</Label>
          <Select
            value={config.required}
            onValueChange={(v) => update({ required: v as LiftingConfig["required"] })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="YES">Yes</SelectItem>
              <SelectItem value="NO">No</SelectItem>
              <SelectItem value="TBC">TBC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {weightExceedsThreshold && config.required !== "YES" && (
          <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Lifting plan likely required based on estimated weight ({estimatedWeight}kg exceeds {LIFTING_PLAN_WEIGHT_THRESHOLD}kg threshold)
            </span>
          </div>
        )}

        {estimatedWeight && (
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs text-gray-400">Estimated Weight (auto)</Label>
              <Input
                type="number"
                value={estimatedWeight}
                disabled
                className="bg-gray-50 text-gray-500"
              />
            </div>
            <span className="text-xs text-gray-400 pt-5">kg</span>
          </div>
        )}

        {(config.required === "YES" || weightExceedsThreshold) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Max Lift Height (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.maxLiftHeight ?? ""}
                  onChange={(e) =>
                    update({ maxLiftHeight: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  placeholder="e.g. 12.5"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Crane Required?</Label>
                <Select
                  value={config.craneRequired}
                  onValueChange={(v) => update({ craneRequired: v as LiftingConfig["craneRequired"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="NO">No</SelectItem>
                    <SelectItem value="TBC">TBC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Site Access Notes</Label>
              <Textarea
                value={config.siteAccessNotes}
                onChange={(e) => update({ siteAccessNotes: e.target.value })}
                placeholder="e.g. restricted access, HIAB required..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Lifting Plan Cost (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={config.liftingPlanCost ?? ""}
                onChange={(e) =>
                  update({ liftingPlanCost: e.target.value ? parseFloat(e.target.value) : null })
                }
                placeholder="Added to quote total"
              />
            </div>
          </>
        )}
      </div>

      {/* Delivery Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs">Special Delivery Requirements</Label>
        <Textarea
          value={config.deliveryNotes}
          onChange={(e) => update({ deliveryNotes: e.target.value })}
          placeholder="e.g. restricted access, HIAB, specific delivery window..."
          rows={3}
        />
      </div>
    </div>
  )
}
