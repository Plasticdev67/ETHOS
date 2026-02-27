"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { WorkshopTask } from "./workshop-view"

type NcrData = {
  ncrTitle: string
  ncrDescription: string
  ncrSeverity: string
  ncrRootCause: string
  ncrCostImpact: number | null
  inspectedBy: string
}

export function NcrRejectDialog({
  task,
  onSubmit,
  onCancel,
}: {
  task: WorkshopTask
  onSubmit: (data: NcrData) => Promise<void>
  onCancel: () => void
}) {
  const [data, setData] = useState<NcrData>({
    ncrTitle: `Production NCR - ${task.product.description}`,
    ncrDescription: "",
    ncrSeverity: "MINOR",
    ncrRootCause: "PRODUCTION_ERROR",
    ncrCostImpact: null,
    inspectedBy: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(data)
    setSubmitting(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onCancel} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">
              Reject — Create NCR
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-3">
            <div className="text-xs text-gray-500">
              Product: <span className="font-medium text-gray-700">{task.product.description}</span>
              {" | "}
              Project: <span className="font-medium text-gray-700">{task.project.projectNumber}</span>
            </div>

            <Field label="NCR Title">
              <input
                type="text"
                value={data.ncrTitle}
                onChange={(e) => setData({ ...data, ncrTitle: e.target.value })}
                required
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </Field>

            <Field label="Description">
              <textarea
                value={data.ncrDescription}
                onChange={(e) => setData({ ...data, ncrDescription: e.target.value })}
                rows={3}
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Severity">
                <select
                  value={data.ncrSeverity}
                  onChange={(e) => setData({ ...data, ncrSeverity: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="MINOR">Minor</option>
                  <option value="MAJOR">Major</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </Field>

              <Field label="Root Cause">
                <select
                  value={data.ncrRootCause}
                  onChange={(e) => setData({ ...data, ncrRootCause: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="PRODUCTION_ERROR">Production Error</option>
                  <option value="DESIGN_ERROR">Design Error</option>
                  <option value="MATERIAL_DEFECT">Material Defect</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cost Impact (£)">
                <input
                  type="number"
                  value={data.ncrCostImpact ?? ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      ncrCostImpact: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  step="0.01"
                  min="0"
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </Field>

              <Field label="Inspector">
                <input
                  type="text"
                  value={data.inspectedBy}
                  onChange={(e) => setData({ ...data, inspectedBy: e.target.value })}
                  placeholder="Inspector name"
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </Field>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={onCancel}
              className="rounded px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !data.ncrTitle}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? "Creating NCR..." : "Reject & Create NCR"}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}
