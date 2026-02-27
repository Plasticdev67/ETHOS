"use client"

import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LockConfig } from "@/lib/product-config-types"

const LOCK_TYPES = [
  { value: "NONE", label: "None" },
  { value: "SINGLE_DEADLOCK", label: "Single-point deadlock" },
  { value: "3PT_MULTIPOINT", label: "3-point multipoint lock" },
  { value: "5PT_MULTIPOINT", label: "5-point multipoint lock" },
  { value: "PANIC_BAR_SINGLE", label: "Panic bar (single point)" },
  { value: "PANIC_BAR_MULTI", label: "Panic bar + multipoint" },
  { value: "SLAM_LOCK", label: "Slam lock" },
  { value: "MAG_LOCK", label: "Mag lock (electronic)" },
  { value: "PADLOCK_HASP", label: "Padlock hasp only" },
  { value: "BESPOKE", label: "Bespoke / TBC" },
]

const LOCK_BRANDS: Record<string, string[]> = {
  "3PT_MULTIPOINT": ["Winkhaus", "Maco", "Yale Doormaster", "Other"],
  "5PT_MULTIPOINT": ["Winkhaus", "Maco", "Yale Doormaster", "Other"],
  PANIC_BAR_SINGLE: ["Briton", "Dorma", "CISA", "Other"],
  PANIC_BAR_MULTI: ["Briton", "Dorma", "CISA", "Other"],
  MAG_LOCK: ["Deedlock", "Eaton", "Paxton", "Other"],
  SLAM_LOCK: ["Abloy", "Adams Rite", "Other"],
}

const CYLINDER_TYPES = [
  { value: "EURO", label: "Euro cylinder" },
  { value: "OVAL", label: "Oval cylinder" },
  { value: "THUMBTURN", label: "Thumbturn" },
  { value: "KEY_BOTH_SIDES", label: "Key both sides" },
  { value: "KEYED_ALIKE", label: "Keyed alike" },
  { value: "NONE", label: "None / N/A" },
]

const HANDLE_TYPES = [
  { value: "LEVER", label: "Lever handle" },
  { value: "PULL_D_BAR", label: "Pull handle (D-bar)" },
  { value: "PUSH_PLATE", label: "Push plate" },
  { value: "FLUSH_PULL", label: "Flush pull" },
  { value: "NONE", label: "None" },
  { value: "BESPOKE", label: "Bespoke / TBC" },
]

export function LockStep({
  config,
  onChange,
}: {
  config: LockConfig
  onChange: (config: LockConfig) => void
}) {
  const availableBrands = LOCK_BRANDS[config.lockType] || []

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Configure lock and hardware:</p>

      <div className="space-y-1.5">
        <Label className="text-xs">Lock Type</Label>
        <Select
          value={config.lockType || "none"}
          onValueChange={(v) =>
            onChange({ ...config, lockType: v === "none" ? "" : v, lockBrand: "", lockModel: "" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select lock type..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select lock type...</SelectItem>
            {LOCK_TYPES.map((lt) => (
              <SelectItem key={lt.value} value={lt.value}>
                {lt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config.lockType && config.lockType !== "NONE" && (
        <>
          {availableBrands.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Lock Brand/Model</Label>
              <Select
                value={config.lockBrand || "none"}
                onValueChange={(v) => onChange({ ...config, lockBrand: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select brand...</SelectItem>
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cylinder Type</Label>
              <Select
                value={config.cylinderType || "none"}
                onValueChange={(v) => onChange({ ...config, cylinderType: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {CYLINDER_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Handle Type</Label>
              <Select
                value={config.handleType || "none"}
                onValueChange={(v) => onChange({ ...config, handleType: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select...</SelectItem>
                  {HANDLE_TYPES.map((ht) => (
                    <SelectItem key={ht.value} value={ht.value}>
                      {ht.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={config.keyedAlike}
              onCheckedChange={(keyedAlike) => onChange({ ...config, keyedAlike })}
            />
            <Label className="text-xs">Keyed Alike?</Label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Lock Notes</Label>
            <Textarea
              value={config.lockNotes}
              onChange={(e) => onChange({ ...config, lockNotes: e.target.value })}
              placeholder="Any special requirements..."
              rows={2}
            />
          </div>
        </>
      )}
    </div>
  )
}
