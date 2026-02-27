"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { FinishConfig } from "@/lib/product-config-types"
import { COATING_STANDARDS, COMMON_RAL_COLOURS } from "@/lib/product-config-types"

const PAINT_SYSTEMS: Record<string, string[]> = {
  C1: ["Alkyd primer + topcoat (2-coat)"],
  C2: ["Alkyd primer + topcoat (2-coat)", "Powder coat"],
  C3: ["Epoxy primer + polyurethane topcoat (2-coat)", "Powder coat", "Hot-dip galv + powder coat"],
  C4: ["Zinc epoxy primer + MIO + polyurethane (3-coat)", "Hot-dip galv + powder coat"],
  C5: [
    "Zinc primer + MIO intermediate + polyurethane topcoat (3-coat)",
    "Hot-dip galvanised + powder coat",
    "Zinc-rich epoxy + polyurethane (2-coat)",
  ],
  CX: [
    "Zinc-rich epoxy + MIO + polyurethane (3-coat)",
    "Hot-dip galvanised + epoxy + polyurethane (3-coat)",
  ],
}

export function FinishStep({
  config,
  onChange,
  surfaceArea,
}: {
  config: FinishConfig
  onChange: (config: FinishConfig) => void
  surfaceArea: number | null
}) {
  const [ralSearch, setRalSearch] = useState("")

  const standard = COATING_STANDARDS.find((s) => s.value === config.coatingStandard)
  const availableSystems = PAINT_SYSTEMS[config.coatingStandard] || []

  const filteredRals = COMMON_RAL_COLOURS.filter(
    (r) =>
      !ralSearch ||
      r.code.toLowerCase().includes(ralSearch.toLowerCase()) ||
      r.name.toLowerCase().includes(ralSearch.toLowerCase())
  )

  function update(patch: Partial<FinishConfig>) {
    const next = { ...config, ...patch }
    // Auto-set DFT from standard
    if (patch.coatingStandard && !patch.dft) {
      const std = COATING_STANDARDS.find((s) => s.value === patch.coatingStandard)
      if (std) next.dft = std.defaultDft
    }
    // Auto-calc surface area
    if (surfaceArea) next.estimatedSurfaceArea = surfaceArea
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Configure finish and coating:</p>

      {/* Coating Standard */}
      <div className="space-y-1.5">
        <Label className="text-xs">Coating Standard</Label>
        <Select
          value={config.coatingStandard || "none"}
          onValueChange={(v) =>
            update({ coatingStandard: v === "none" ? "" : v, paintSystem: "" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select standard..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select standard...</SelectItem>
            {COATING_STANDARDS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {standard && (
          <p className="text-[10px] text-gray-400">{standard.description}</p>
        )}
      </div>

      {/* Paint System */}
      {config.coatingStandard && availableSystems.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Paint System</Label>
          <Select
            value={config.paintSystem || "none"}
            onValueChange={(v) => update({ paintSystem: v === "none" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select system..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select system...</SelectItem>
              {availableSystems.map((sys) => (
                <SelectItem key={sys} value={sys}>
                  {sys}
                </SelectItem>
              ))}
              <SelectItem value="OTHER">Other / Specify</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* RAL Colour */}
      <div className="space-y-1.5">
        <Label className="text-xs">RAL Colour</Label>
        <Input
          placeholder="Search RAL colours..."
          value={ralSearch}
          onChange={(e) => setRalSearch(e.target.value)}
          className="mb-2"
        />
        <div className="grid grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto rounded border border-border p-2">
          {filteredRals.map((ral) => (
            <button
              key={ral.code}
              type="button"
              onClick={() => {
                update({ ralColour: ral.code })
                setRalSearch("")
              }}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1 text-left text-[10px] transition-colors",
                config.ralColour === ral.code
                  ? "bg-indigo-100 ring-1 ring-indigo-400"
                  : "hover:bg-gray-100"
              )}
            >
              <span
                className="h-4 w-4 rounded-sm border border-gray-300 shrink-0"
                style={{ backgroundColor: ral.hex }}
              />
              <span className="truncate">
                <span className="font-mono font-medium">{ral.code.replace("RAL ", "")}</span>
                <br />
                <span className="text-gray-500">{ral.name}</span>
              </span>
            </button>
          ))}
        </div>
        {config.ralColour && (
          <div className="flex items-center gap-2 mt-1">
            <span
              className="h-5 w-5 rounded border border-gray-300"
              style={{
                backgroundColor: COMMON_RAL_COLOURS.find((r) => r.code === config.ralColour)?.hex,
              }}
            />
            <span className="text-xs font-medium">{config.ralColour}</span>
            <button
              type="button"
              onClick={() => update({ ralColour: "" })}
              className="text-[10px] text-red-500 hover:text-red-600 ml-2"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Finish Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Finish Type</Label>
          <Select
            value={config.finishType || "none"}
            onValueChange={(v) => update({ finishType: v === "none" ? "" : v as FinishConfig["finishType"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select...</SelectItem>
              <SelectItem value="GLOSS">Gloss</SelectItem>
              <SelectItem value="SEMI_GLOSS">Semi-gloss</SelectItem>
              <SelectItem value="SATIN">Satin</SelectItem>
              <SelectItem value="MATT">Matt</SelectItem>
              <SelectItem value="TEXTURED">Textured</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* DFT */}
        <div className="space-y-1.5">
          <Label className="text-xs">DFT (microns)</Label>
          <Input
            type="number"
            value={config.dft ?? ""}
            onChange={(e) => update({ dft: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="Auto from standard"
          />
        </div>
      </div>

      {/* Galvanised */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Switch
            checked={config.galvanised}
            onCheckedChange={(galvanised) => update({ galvanised })}
          />
          <Label className="text-xs">Galvanised?</Label>
        </div>
        {config.galvanised && (
          <Select
            value={config.galvType || "none"}
            onValueChange={(v) => update({ galvType: v === "none" ? "" : v as FinishConfig["galvType"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Select type...</SelectItem>
              <SelectItem value="HOT_DIP">Hot-dip</SelectItem>
              <SelectItem value="ELECTRO">Electro</SelectItem>
              <SelectItem value="SHERARDISED">Sherardised</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Surface area info */}
      {surfaceArea !== null && surfaceArea > 0 && (
        <div className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Estimated surface area: <span className="font-mono font-medium">{surfaceArea.toFixed(2)} m²</span>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs">Coating Notes</Label>
        <Textarea
          value={config.coatingNotes}
          onChange={(e) => update({ coatingNotes: e.target.value })}
          placeholder="Any special requirements..."
          rows={2}
        />
      </div>
    </div>
  )
}
