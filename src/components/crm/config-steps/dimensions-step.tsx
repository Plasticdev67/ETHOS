"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle } from "lucide-react"
import type { DimensionsConfig } from "@/lib/product-config-types"
import { calcClearOpening } from "@/lib/product-config-types"

export function DimensionsStep({
  config,
  onChange,
  defaultWidth,
  defaultHeight,
}: {
  config: DimensionsConfig
  onChange: (config: DimensionsConfig) => void
  defaultWidth?: number | null
  defaultHeight?: number | null
}) {
  function update(patch: Partial<DimensionsConfig>) {
    const next = { ...config, ...patch }
    // Auto-calculate clear opening
    next.clearOpening = calcClearOpening(next.width, next.leafConfig)
    onChange(next)
  }

  const isOversized =
    (config.width && config.width > 5000) || (config.height && config.height > 4000)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Enter product dimensions:</p>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Width (mm) *</Label>
          <Input
            type="number"
            value={config.width ?? ""}
            onChange={(e) => update({ width: e.target.value ? parseInt(e.target.value) : null })}
            placeholder={defaultWidth ? String(defaultWidth) : "e.g. 2400"}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Height (mm) *</Label>
          <Input
            type="number"
            value={config.height ?? ""}
            onChange={(e) => update({ height: e.target.value ? parseInt(e.target.value) : null })}
            placeholder={defaultHeight ? String(defaultHeight) : "e.g. 2100"}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Depth/Thickness (mm)</Label>
          <Input
            type="number"
            value={config.depth ?? ""}
            onChange={(e) => update({ depth: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="e.g. 60"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Leaf Configuration</Label>
          <Select
            value={config.leafConfig}
            onValueChange={(v) => update({ leafConfig: v as DimensionsConfig["leafConfig"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SINGLE">Single</SelectItem>
              <SelectItem value="DOUBLE">Double</SelectItem>
              <SelectItem value="SLIDING">Sliding</SelectItem>
              <SelectItem value="BI_FOLD">Bi-fold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Opening Direction</Label>
          <Select
            value={config.openingDirection || "none"}
            onValueChange={(v) => update({ openingDirection: v === "none" ? "" : v as DimensionsConfig["openingDirection"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not specified</SelectItem>
              <SelectItem value="INWARD">Inward</SelectItem>
              <SelectItem value="OUTWARD">Outward</SelectItem>
              <SelectItem value="LEFT">Left</SelectItem>
              <SelectItem value="RIGHT">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400">Clear Opening (auto)</Label>
          <Input
            type="number"
            value={config.clearOpening ?? ""}
            disabled
            className="bg-gray-50 text-gray-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Structural Opening (mm)</Label>
          <Input
            type="number"
            value={config.structuralOpening ?? ""}
            onChange={(e) => update({ structuralOpening: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Builder's opening"
          />
        </div>
      </div>

      {isOversized && (
        <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Dimensions exceed standard range — please verify
        </div>
      )}

      {defaultWidth && defaultHeight && (
        <p className="text-xs text-gray-400">
          Default: {defaultWidth}mm x {defaultHeight}mm. Costs scale proportionally.
        </p>
      )}
    </div>
  )
}
