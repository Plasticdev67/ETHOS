"use client"

import { Label } from "@/components/ui/label"
import type { CatalogueSpecField, CatalogueSpecDependency, SpecSelections } from "@/lib/catalogue-types"

/**
 * Dynamic form rendering spec fields as dropdowns/inputs.
 * Handles SpecDependency show/hide logic.
 */
export function SpecOptionsForm({
  specFields,
  selections,
  onChange,
}: {
  specFields: CatalogueSpecField[]
  selections: SpecSelections
  onChange: (selections: SpecSelections) => void
}) {
  // Collect all trigger choice IDs from currently selected values
  const selectedChoiceIds = new Set<string>()
  for (const field of specFields) {
    const selectedValue = selections[field.code]
    if (selectedValue) {
      const choice = field.choices.find((c) => c.value === selectedValue)
      if (choice) selectedChoiceIds.add(choice.id)
    }
  }

  // Determine visibility of each field
  function isFieldVisible(field: CatalogueSpecField): boolean {
    // Collect dependencies where this field is the dependent
    const deps: CatalogueSpecDependency[] = []
    for (const f of specFields) {
      for (const d of (f.dependencies || [])) {
        if (d.dependentFieldId === field.id) {
          deps.push(d)
        }
      }
    }
    // Also check the field's own dependencies array
    if (field.dependencies && field.dependencies.length > 0) {
      for (const d of field.dependencies) {
        if (!deps.find((existing) => existing.id === d.id)) {
          deps.push(d)
        }
      }
    }

    if (deps.length === 0) return true // No dependencies, always visible

    // SHOW deps: field is visible if ANY trigger choice is selected
    const showDeps = deps.filter((d) => d.action === "SHOW")
    if (showDeps.length > 0) {
      return showDeps.some((d) => selectedChoiceIds.has(d.triggerChoiceId))
    }

    // HIDE deps: field is hidden if ANY trigger choice is selected
    const hideDeps = deps.filter((d) => d.action === "HIDE")
    if (hideDeps.length > 0) {
      return !hideDeps.some((d) => selectedChoiceIds.has(d.triggerChoiceId))
    }

    return true
  }

  function handleChange(code: string, value: string) {
    const next = { ...selections, [code]: value }
    // Clear selections for fields that become hidden
    for (const field of specFields) {
      if (!isFieldVisible(field) && next[field.code]) {
        delete next[field.code]
      }
    }
    onChange(next)
  }

  const visibleFields = specFields.filter(isFieldVisible)

  return (
    <div className="grid grid-cols-2 gap-4">
      {visibleFields.map((field) => {
        const currentValue = selections[field.code] || ""

        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              {field.name}
              {field.required && <span className="text-red-500">*</span>}
            </Label>

            {field.fieldType === "SELECT" && (
              <select
                value={currentValue}
                onChange={(e) => handleChange(field.code, e.target.value)}
                className="w-full rounded border border-border bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select {field.name}...</option>
                {field.choices.map((choice) => (
                  <option key={choice.id} value={choice.value}>
                    {choice.label}
                    {choice.costModifier !== 0 &&
                      ` (${choice.costModifier > 0 ? "+" : ""}£${choice.costModifier})`}
                    {choice.costMultiplier !== 1 && ` (×${choice.costMultiplier})`}
                  </option>
                ))}
              </select>
            )}

            {field.fieldType === "NUMBER" && (
              <input
                type="number"
                value={currentValue}
                onChange={(e) => handleChange(field.code, e.target.value)}
                className="w-full rounded border border-border px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={field.helpText || `Enter ${field.name}`}
              />
            )}

            {field.fieldType === "TEXT" && (
              <input
                type="text"
                value={currentValue}
                onChange={(e) => handleChange(field.code, e.target.value)}
                className="w-full rounded border border-border px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={field.helpText || `Enter ${field.name}`}
              />
            )}

            {field.fieldType === "BOOLEAN" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentValue === "true"}
                  onChange={(e) => handleChange(field.code, e.target.checked ? "true" : "false")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">{field.helpText || "Yes"}</span>
              </div>
            )}

            {field.helpText && field.fieldType !== "BOOLEAN" && (
              <p className="text-[10px] text-gray-400">{field.helpText}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
