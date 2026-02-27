"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TransomeConfig, VentConfig } from "@/lib/product-config-types"
import { VENT_SIZES } from "@/lib/product-config-types"

export function TransomeVentStep({
  transome,
  vent,
  onTransomeChange,
  onVentChange,
}: {
  transome: TransomeConfig
  vent: VentConfig
  onTransomeChange: (config: TransomeConfig) => void
  onVentChange: (config: VentConfig) => void
}) {
  return (
    <div className="space-y-6">
      {/* Transome */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Transome</Label>
            <p className="text-xs text-gray-500">Horizontal bar dividing the door/gate</p>
          </div>
          <Switch
            checked={transome.enabled}
            onCheckedChange={(enabled) =>
              onTransomeChange({ ...transome, enabled })
            }
          />
        </div>

        {transome.enabled && (
          <div className="pl-4 border-l-2 border-indigo-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={transome.type || "none"}
                  onValueChange={(v) => onTransomeChange({ ...transome, type: v === "none" ? "" : v as TransomeConfig["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    <SelectItem value="SINGLE">Single</SelectItem>
                    <SelectItem value="DOUBLE">Double</SelectItem>
                    <SelectItem value="GLAZED">Glazed</SelectItem>
                    <SelectItem value="SOLID">Solid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Position</Label>
                <Select
                  value={transome.position || "none"}
                  onValueChange={(v) => onTransomeChange({ ...transome, position: v === "none" ? "" : v as TransomeConfig["position"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    <SelectItem value="TOP">Top</SelectItem>
                    <SelectItem value="MIDDLE">Middle</SelectItem>
                    <SelectItem value="TOP_AND_MIDDLE">Top + Middle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={transome.height ?? ""}
                  onChange={(e) =>
                    onTransomeChange({ ...transome, height: e.target.value ? parseInt(e.target.value) : null })
                  }
                  placeholder="e.g. 400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Material</Label>
                <Select
                  value={transome.material || "none"}
                  onValueChange={(v) => onTransomeChange({ ...transome, material: v === "none" ? "" : v as TransomeConfig["material"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    <SelectItem value="STEEL">Steel</SelectItem>
                    <SelectItem value="ALUMINIUM">Aluminium</SelectItem>
                    <SelectItem value="STAINLESS_STEEL">Stainless Steel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Vent */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Vent</Label>
            <p className="text-xs text-gray-500">Ventilation opening in the door/gate</p>
          </div>
          <Switch
            checked={vent.enabled}
            onCheckedChange={(enabled) =>
              onVentChange({ ...vent, enabled })
            }
          />
        </div>

        {vent.enabled && (
          <div className="pl-4 border-l-2 border-indigo-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select
                  value={vent.type || "none"}
                  onValueChange={(v) => onVentChange({ ...vent, type: v === "none" ? "" : v as VentConfig["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    <SelectItem value="LOUVRED">Louvred</SelectItem>
                    <SelectItem value="MESH">Mesh</SelectItem>
                    <SelectItem value="INTUMESCENT">Intumescent</SelectItem>
                    <SelectItem value="ACOUSTIC">Acoustic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Size</Label>
                <Select
                  value={vent.size || "none"}
                  onValueChange={(v) => {
                    const size = v === "none" ? "" : v as VentConfig["size"]
                    const preset = size && size !== "CUSTOM" ? VENT_SIZES[size as keyof typeof VENT_SIZES] : null
                    onVentChange({
                      ...vent,
                      size,
                      customWidth: preset ? preset.width : vent.customWidth,
                      customHeight: preset ? preset.height : vent.customHeight,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    <SelectItem value="SMALL">{VENT_SIZES.SMALL.label}</SelectItem>
                    <SelectItem value="MEDIUM">{VENT_SIZES.MEDIUM.label}</SelectItem>
                    <SelectItem value="LARGE">{VENT_SIZES.LARGE.label}</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {vent.size === "CUSTOM" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Custom Width (mm)</Label>
                  <Input
                    type="number"
                    value={vent.customWidth ?? ""}
                    onChange={(e) =>
                      onVentChange({ ...vent, customWidth: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="Width"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Custom Height (mm)</Label>
                  <Input
                    type="number"
                    value={vent.customHeight ?? ""}
                    onChange={(e) =>
                      onVentChange({ ...vent, customHeight: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="Height"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Position</Label>
                <Select
                  value={vent.position || "none"}
                  onValueChange={(v) => onVentChange({ ...vent, position: v === "none" ? "" : v as VentConfig["position"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select...</SelectItem>
                    <SelectItem value="TOP">Top</SelectItem>
                    <SelectItem value="BOTTOM">Bottom</SelectItem>
                    <SelectItem value="CENTRE">Centre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={vent.quantity}
                  onChange={(e) =>
                    onVentChange({ ...vent, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fire Rated?</Label>
                <div className="pt-1.5">
                  <Switch
                    checked={vent.fireRated}
                    onCheckedChange={(fireRated) => {
                      onVentChange({
                        ...vent,
                        fireRated,
                        type: fireRated && vent.type !== "INTUMESCENT" ? "INTUMESCENT" : vent.type,
                      })
                    }}
                  />
                </div>
              </div>
            </div>

            {vent.fireRated && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Fire rated vent selected — intumescent variant will be used
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
