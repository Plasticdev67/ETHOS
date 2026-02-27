"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"
import { Settings2, AlertTriangle, TrendingUp, Users, Calendar, Clock, ExternalLink, Pencil } from "lucide-react"

// ───────────────────────── Types ─────────────────────────

type DeptCapacity = {
  id: string
  department: string
  displayName: string
  hoursPerWeek: number | string
  headcount: number
  notes: string | null
}

type LoadProduct = {
  id: string
  partCode: string
  description: string
  quantity: number
  currentDepartment: string
  // Design
  designPlannedStart: string | null
  designTargetDate: string | null
  designCompletionDate: string | null
  designEstimatedHours: number | string | null
  // Ops
  opsPlannedStart: string | null
  opsTargetDate: string | null
  opsCompletionDate: string | null
  opsEstimatedHours: number | string | null
  // Production
  productionPlannedStart: string | null
  productionTargetDate: string | null
  productionCompletionDate: string | null
  productionEstimatedHours: number | string | null
  // Installation
  installPlannedStart: string | null
  installTargetDate: string | null
  installCompletionDate: string | null
  installEstimatedHours: number | string | null
  // Project
  project: {
    id: string
    projectNumber: string
    name: string
    projectStatus: string
    customer: { name: string } | null
  }
}

type UnestimatedProduct = {
  id: string
  partCode: string
  description: string
  currentDepartment: string
  project: { id: string; projectNumber: string; name: string }
}

// ───────────────────────── Constants ─────────────────────────

const DEPARTMENTS = [
  { key: "DESIGN", label: "Design", color: "bg-blue-500", lightColor: "bg-blue-100", textColor: "text-blue-700", startField: "designPlannedStart", endField: "designTargetDate", hoursField: "designEstimatedHours", doneField: "designCompletionDate" },
  { key: "OPS", label: "Ops", color: "bg-purple-500", lightColor: "bg-purple-100", textColor: "text-purple-700", startField: "opsPlannedStart", endField: "opsTargetDate", hoursField: "opsEstimatedHours", doneField: "opsCompletionDate" },
  { key: "PRODUCTION", label: "Production", color: "bg-amber-500", lightColor: "bg-amber-100", textColor: "text-amber-700", startField: "productionPlannedStart", endField: "productionTargetDate", hoursField: "productionEstimatedHours", doneField: "productionCompletionDate" },
  { key: "INSTALLATION", label: "Installation", color: "bg-green-500", lightColor: "bg-green-100", textColor: "text-green-700", startField: "installPlannedStart", endField: "installTargetDate", hoursField: "installEstimatedHours", doneField: "installCompletionDate" },
] as const

const DEFAULT_CAPACITIES = [
  { department: "DESIGN", displayName: "Design", hoursPerWeek: 120, headcount: 3 },
  { department: "OPS", displayName: "Ops", hoursPerWeek: 80, headcount: 2 },
  { department: "PRODUCTION", displayName: "Production", hoursPerWeek: 200, headcount: 5 },
  { department: "INSTALLATION", displayName: "Installation", hoursPerWeek: 160, headcount: 4 },
]

// ───────────────────────── Helpers ─────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
}

function getWeeksBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)))
}

// ───────────────────────── Page ─────────────────────────

export default function CapacityPlanningPage() {
  const [capacities, setCapacities] = useState<DeptCapacity[]>([])
  const [products, setProducts] = useState<LoadProduct[]>([])
  const [unestimated, setUnestimated] = useState<UnestimatedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [weeksToShow, setWeeksToShow] = useState(12)
  const [showCapacityDialog, setShowCapacityDialog] = useState(false)

  // Capacity form
  const [capDept, setCapDept] = useState("DESIGN")
  const [capHours, setCapHours] = useState("")
  const [capHeadcount, setCapHeadcount] = useState("")

  // Product hours edit
  const [editProduct, setEditProduct] = useState<LoadProduct | null>(null)
  const [editHours, setEditHours] = useState<Record<string, string>>({})
  const [editDates, setEditDates] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const [capRes, loadRes] = await Promise.all([
      fetch("/api/capacity"),
      fetch("/api/capacity/load"),
    ])
    if (capRes.ok) setCapacities(await capRes.json())
    if (loadRes.ok) {
      const data = await loadRes.json()
      setProducts(data.products || [])
      setUnestimated(data.unestimated || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // ────── Timeline calculations ──────

  const today = useMemo(() => getWeekStart(new Date()), [])

  const weeks = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < weeksToShow; i++) {
      arr.push(addWeeks(today, i))
    }
    return arr
  }, [today, weeksToShow])

  // Build load data from products — for each department+week, sum hours
  const loadByDeptWeek = useMemo(() => {
    const map: Record<string, Record<number, { hours: number; products: string[] }>> = {}
    DEPARTMENTS.forEach((d) => {
      map[d.key] = {}
      weeks.forEach((_, i) => {
        map[d.key][i] = { hours: 0, products: [] }
      })
    })

    products.forEach((prod) => {
      DEPARTMENTS.forEach((dept) => {
        const hours = Number((prod as Record<string, unknown>)[dept.hoursField]) || 0
        const startStr = (prod as Record<string, unknown>)[dept.startField] as string | null
        const endStr = (prod as Record<string, unknown>)[dept.endField] as string | null
        const doneStr = (prod as Record<string, unknown>)[dept.doneField] as string | null

        // Skip if completed or no hours/dates
        if (doneStr || !hours || !startStr || !endStr) return

        const start = new Date(startStr)
        const end = new Date(endStr)
        const totalWeeks = getWeeksBetween(start, end)
        const hoursPerWeek = hours / totalWeeks

        weeks.forEach((weekStart, i) => {
          const weekEnd = addWeeks(weekStart, 1)
          if (start < weekEnd && end > weekStart) {
            map[dept.key][i].hours += hoursPerWeek
            const label = `${prod.project.projectNumber}/${prod.partCode}`
            if (!map[dept.key][i].products.includes(label)) {
              map[dept.key][i].products.push(label)
            }
          }
        })
      })
    })

    return map
  }, [products, weeks])

  // Capacity lookup
  const capacityMap = useMemo(() => {
    const map: Record<string, number> = {}
    capacities.forEach((c) => { map[c.department] = Number(c.hoursPerWeek) })
    return map
  }, [capacities])

  // Summary stats — next 4 weeks
  const summaryStats = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const cap = capacityMap[dept.key] || 0
      const next4WeeksLoad = [0, 1, 2, 3].reduce(
        (sum, i) => sum + (loadByDeptWeek[dept.key]?.[i]?.hours || 0), 0
      )
      const next4WeeksCap = cap * 4
      const utilisation = next4WeeksCap > 0 ? (next4WeeksLoad / next4WeeksCap) * 100 : 0
      return { ...dept, cap, next4WeeksLoad, next4WeeksCap, utilisation, overloaded: utilisation > 100 }
    })
  }, [capacityMap, loadByDeptWeek])

  // Group products by project for Gantt view
  const projectGroups = useMemo(() => {
    const map = new Map<string, { project: LoadProduct["project"]; products: LoadProduct[] }>()
    products.forEach((prod) => {
      const key = prod.project.id
      if (!map.has(key)) map.set(key, { project: prod.project, products: [] })
      map.get(key)!.products.push(prod)
    })
    return Array.from(map.values())
  }, [products])

  // Total hours across all products
  const totalHours = useMemo(() => {
    let total = 0
    products.forEach((p) => {
      DEPARTMENTS.forEach((d) => {
        total += Number((p as Record<string, unknown>)[d.hoursField]) || 0
      })
    })
    return Math.round(total)
  }, [products])

  // ────── Handlers ──────

  async function handleSaveCapacity() {
    const dept = DEPARTMENTS.find((d) => d.key === capDept)
    await fetch("/api/capacity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        department: capDept,
        displayName: dept?.label || capDept,
        hoursPerWeek: parseFloat(capHours),
        headcount: parseInt(capHeadcount) || 1,
      }),
    })
    setShowCapacityDialog(false)
    setCapHours("")
    setCapHeadcount("")
    loadData()
  }

  async function seedDefaults() {
    for (const cap of DEFAULT_CAPACITIES) {
      await fetch("/api/capacity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cap),
      })
    }
    loadData()
  }

  function openEditProduct(prod: LoadProduct) {
    setEditProduct(prod)
    const hours: Record<string, string> = {}
    const dates: Record<string, string> = {}
    DEPARTMENTS.forEach((d) => {
      const h = (prod as Record<string, unknown>)[d.hoursField]
      hours[d.key] = h ? String(Number(h)) : ""
      const start = (prod as Record<string, unknown>)[d.startField] as string | null
      const end = (prod as Record<string, unknown>)[d.endField] as string | null
      dates[`${d.key}_start`] = start ? start.slice(0, 10) : ""
      dates[`${d.key}_end`] = end ? end.slice(0, 10) : ""
    })
    setEditHours(hours)
    setEditDates(dates)
  }

  async function handleSaveProductHours() {
    if (!editProduct) return
    setSaving(true)
    const body: Record<string, unknown> = {}
    DEPARTMENTS.forEach((d) => {
      body[d.hoursField] = editHours[d.key] ? parseFloat(editHours[d.key]) : null
      body[d.startField] = editDates[`${d.key}_start`] || null
      body[d.endField] = editDates[`${d.key}_end`] || null
    })
    await fetch(`/api/products/${editProduct.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setEditProduct(null)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading capacity data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Rough-Cut Capacity Plan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Driven by product estimated hours and planned dates from the Tracker
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(weeksToShow)} onValueChange={(v) => setWeeksToShow(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8">8 weeks</SelectItem>
              <SelectItem value="12">12 weeks</SelectItem>
              <SelectItem value="16">16 weeks</SelectItem>
              <SelectItem value="24">24 weeks</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={showCapacityDialog} onOpenChange={setShowCapacityDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" /> Capacity
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Department Capacity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Department</label>
                  <Select value={capDept} onValueChange={setCapDept}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Hours / Week</label>
                    <Input type="number" value={capHours} onChange={(e) => setCapHours(e.target.value)} placeholder="e.g. 120" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Headcount</label>
                    <Input type="number" value={capHeadcount} onChange={(e) => setCapHeadcount(e.target.value)} placeholder="e.g. 3" />
                  </div>
                </div>
                <Button onClick={handleSaveCapacity} className="w-full" disabled={!capHours}>Save Capacity</Button>
              </div>
              {capacities.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">Current Settings</div>
                  {capacities.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1">
                      <span className="font-medium">{c.displayName}</span>
                      <span className="text-gray-600">{Number(c.hoursPerWeek)} hrs/wk ({c.headcount} people)</span>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seed defaults */}
      {capacities.length === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-blue-900">No capacity data yet</div>
              <div className="text-sm text-blue-700">
                Set up default capacities? Design 120h, Ops 80h, Production 200h, Installation 160h per week.
              </div>
            </div>
            <Button size="sm" onClick={seedDefaults}>Set Defaults</Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <Card key={stat.key} className={stat.overloaded ? "border-red-300" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                  <span className="text-sm font-medium text-gray-900">{stat.label}</span>
                </div>
                {stat.overloaded && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <div className="text-[10px] text-gray-500">Cap/wk</div>
                  <div className="text-xs font-mono font-medium">{stat.cap}h</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">4wk load</div>
                  <div className="text-xs font-mono font-medium">{Math.round(stat.next4WeeksLoad)}h</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Util.</div>
                  <div className={`text-xs font-mono font-semibold ${
                    stat.utilisation > 100 ? "text-red-600" : stat.utilisation > 80 ? "text-amber-600" : "text-green-600"
                  }`}>
                    {Math.round(stat.utilisation)}%
                  </div>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    stat.utilisation > 100 ? "bg-red-500" : stat.utilisation > 80 ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, stat.utilisation)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline Heatmap — Department rows */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Weekly Load vs. Capacity</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> &lt;80%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> 80-100%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> &gt;100%
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-36 sticky left-0 bg-gray-50 z-10">
                    Department
                  </th>
                  {weeks.map((w, i) => (
                    <th key={i} className={`px-1 py-2 text-center text-xs font-medium min-w-[56px] ${i === 0 ? "text-blue-700 bg-blue-50/50" : "text-gray-500"}`}>
                      {formatWeekLabel(w)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map((dept) => {
                  const cap = capacityMap[dept.key] || 0
                  return (
                    <tr key={dept.key} className="border-b">
                      <td className="px-4 py-2.5 font-medium text-gray-900 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${dept.color}`} />
                          {dept.label}
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal">{cap} hrs/wk</div>
                      </td>
                      {weeks.map((_, i) => {
                        const cell = loadByDeptWeek[dept.key]?.[i]
                        const hours = cell?.hours || 0
                        const pct = cap > 0 ? (hours / cap) * 100 : 0
                        const bgClass = hours === 0 ? "bg-gray-50" : pct > 100 ? "bg-red-100" : pct > 80 ? "bg-amber-100" : "bg-green-100"
                        const textClass = hours === 0 ? "text-gray-300" : pct > 100 ? "text-red-700 font-semibold" : pct > 80 ? "text-amber-700" : "text-green-700"

                        return (
                          <td
                            key={i}
                            className={`px-1 py-2.5 text-center ${bgClass}`}
                            title={cell?.products.length ? `${Math.round(hours)}h (${Math.round(pct)}%)\n${cell.products.join(", ")}` : "No load"}
                          >
                            <div className={`text-xs font-mono ${textClass}`}>
                              {hours > 0 ? Math.round(hours) : "—"}
                            </div>
                            {hours > 0 && (
                              <div className={`text-[10px] ${textClass} opacity-70`}>{Math.round(pct)}%</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Project / Product Gantt Timeline */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-gray-900">Project &amp; Product Timeline</h3>
            <p className="text-xs text-gray-500">Bars show planned duration per stage — colour = department</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-52 sticky left-0 bg-gray-50 z-10">
                    Project / Product
                  </th>
                  {weeks.map((w, i) => (
                    <th key={i} className={`px-1 py-2 text-center text-xs font-medium min-w-[56px] ${i === 0 ? "text-blue-700 bg-blue-50/50" : "text-gray-500"}`}>
                      {formatWeekLabel(w)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projectGroups.map(({ project, products: prods }) => (
                  <>
                    {/* Project header row */}
                    <tr key={project.id} className="bg-gray-50/80 border-b">
                      <td className="px-4 py-2 sticky left-0 bg-gray-50/80 z-10" colSpan={weeksToShow + 1}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-xs">{project.projectNumber}</span>
                          <span className="text-xs text-gray-500 truncate">{project.name}</span>
                          {project.customer && (
                            <span className="text-[10px] text-gray-400">({project.customer.name})</span>
                          )}
                          <Link href={`/projects/${project.id}`} className="text-blue-500 hover:text-blue-700">
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                    {/* Product rows */}
                    {prods.map((prod) => (
                      <tr key={prod.id} className="border-b hover:bg-gray-50/50 cursor-pointer" onClick={() => openEditProduct(prod)}>
                        <td className="px-4 pl-8 py-2 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-gray-700">{prod.partCode}</span>
                            <Pencil className="h-2.5 w-2.5 text-gray-300" />
                          </div>
                          <div className="text-[10px] text-gray-400 truncate max-w-[170px]">{prod.description}</div>
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {DEPARTMENTS.map((dept) => {
                              const h = Number((prod as Record<string, unknown>)[dept.hoursField]) || 0
                              if (!h) return null
                              return (
                                <span key={dept.key} className={`text-[9px] px-1 rounded ${dept.lightColor} ${dept.textColor}`}>
                                  {dept.label[0]}: {h}h
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        {weeks.map((weekStart, i) => {
                          const weekEnd = addWeeks(weekStart, 1)
                          const activeBars: { color: string; label: string }[] = []

                          DEPARTMENTS.forEach((dept) => {
                            const h = Number((prod as Record<string, unknown>)[dept.hoursField]) || 0
                            const startStr = (prod as Record<string, unknown>)[dept.startField] as string | null
                            const endStr = (prod as Record<string, unknown>)[dept.endField] as string | null
                            const doneStr = (prod as Record<string, unknown>)[dept.doneField] as string | null
                            if (!h || !startStr || !endStr || doneStr) return

                            const start = new Date(startStr)
                            const end = new Date(endStr)
                            if (start < weekEnd && end > weekStart) {
                              activeBars.push({ color: dept.color, label: dept.label })
                            }
                          })

                          if (activeBars.length === 0) return <td key={i} className="px-0.5 py-2" />

                          return (
                            <td key={i} className="px-0.5 py-2">
                              <div className="flex flex-col gap-0.5">
                                {activeBars.map((bar) => (
                                  <div
                                    key={bar.label}
                                    className={`${bar.color} rounded h-2 opacity-60`}
                                    title={bar.label}
                                  />
                                ))}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={weeksToShow + 1} className="px-6 py-12 text-center text-gray-400">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div className="font-medium">No products with estimated hours yet</div>
                      <div className="text-xs mt-1">
                        Add estimated hours and planned dates to products in the Tracker to populate this view.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Unestimated products warning */}
      {unestimated.length > 0 && (
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-900">
                {unestimated.length} product{unestimated.length !== 1 ? "s" : ""} with dates but no estimated hours
              </span>
            </div>
            <p className="text-xs text-amber-700 mb-3">
              These products have planned dates but no estimated hours — they won&apos;t appear in the capacity plan until hours are set.
            </p>
            <div className="divide-y divide-amber-100">
              {unestimated.slice(0, 10).map((p) => (
                <div key={p.id} className="py-1.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-gray-700">{p.project.projectNumber}</span>
                    <span className="text-xs text-gray-400 mx-1">/</span>
                    <span className="text-xs text-gray-600">{p.partCode} — {p.description}</span>
                  </div>
                  <Link
                    href={`/projects/${p.project.id}`}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Link>
                </div>
              ))}
              {unestimated.length > 10 && (
                <div className="pt-1.5 text-xs text-amber-600">
                  ...and {unestimated.length - 10} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <div className="text-xs text-gray-500">Total Estimated Hours</div>
            <div className="text-lg font-mono font-semibold">{totalHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <div className="text-xs text-gray-500">Products Planned</div>
            <div className="text-lg font-mono font-semibold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <div className="text-xs text-gray-500">Weekly Capacity</div>
            <div className="text-lg font-mono font-semibold">
              {capacities.reduce((s, c) => s + Number(c.hoursPerWeek), 0)}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <div className="text-xs text-gray-500">Overloaded Weeks</div>
            <div className="text-lg font-mono font-semibold">
              {(() => {
                let count = 0
                DEPARTMENTS.forEach((dept) => {
                  const cap = capacityMap[dept.key] || 0
                  weeks.forEach((_, i) => {
                    if ((loadByDeptWeek[dept.key]?.[i]?.hours || 0) > cap && cap > 0) count++
                  })
                })
                return count
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Hours Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => { if (!open) setEditProduct(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Set Estimated Hours — {editProduct?.partCode}
            </DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4">
              <div className="text-xs text-gray-500">
                {editProduct.project.projectNumber} / {editProduct.description}
              </div>
              {DEPARTMENTS.map((dept) => (
                <div key={dept.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${dept.color}`} />
                    <span className="text-sm font-medium">{dept.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">Est. Hours</label>
                      <Input
                        type="number"
                        value={editHours[dept.key] || ""}
                        onChange={(e) => setEditHours({ ...editHours, [dept.key]: e.target.value })}
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Start</label>
                      <Input
                        type="date"
                        value={editDates[`${dept.key}_start`] || ""}
                        onChange={(e) => setEditDates({ ...editDates, [`${dept.key}_start`]: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Target</label>
                      <Input
                        type="date"
                        value={editDates[`${dept.key}_end`] || ""}
                        onChange={(e) => setEditDates({ ...editDates, [`${dept.key}_end`]: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button onClick={handleSaveProductHours} className="w-full" disabled={saving}>
                {saving ? "Saving..." : "Save Hours & Dates"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
