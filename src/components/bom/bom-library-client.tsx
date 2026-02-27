"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Package, ListTree, Wrench, ChevronDown, ChevronRight } from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────

interface StockItem {
  id: string
  stockCode: string
  name: string
  description: string | null
  productGroup: string | null
  productFamily: string | null
  itemSetType: string | null
  operationType: string | null
  materialComposition: string | null
  bomItemType: number | null
  defaultMake: boolean | null
  supplierRef: string | null
  supplierLeadTime: number | null
  supplierLeadTimeUnit: string | null
}

interface BomComponent {
  id: string
  stockCode: string
  description: string | null
  sequenceNo: number
  quantity: number
  unitOfMeasure: string | null
}

interface BomOperation {
  id: string
  sequenceNo: number
  operationRef: string
  operationDescription: string | null
  labourRef: string | null
  totalRunTimeMinutes: number
  totalLabourMinutes: number
}

interface BomHeader {
  id: string
  headerRef: string
  description: string | null
  components: BomComponent[]
  operations: BomOperation[]
  _count: { components: number; operations: number }
}

interface OperationSummary {
  operationRef: string
  count: number
  totalHours: number
}

interface FamilyCount {
  family: string
  count: number
}

interface Props {
  stockItems: StockItem[]
  bomHeaders: BomHeader[]
  operationSummary: OperationSummary[]
  familyCounts: FamilyCount[]
}

// ─── Helpers ───────────────────────────────────────────────────

const groupColors: Record<string, string> = {
  "FG-FD": "bg-blue-100 text-blue-800",
  "FG-FG": "bg-indigo-100 text-indigo-800",
  "FG-FGW": "bg-violet-100 text-violet-800",
  "FG-BUG": "bg-cyan-100 text-cyan-800",
  "RM-PP": "bg-amber-100 text-amber-800",
  "RM-EX": "bg-orange-100 text-orange-800",
  "RM-LP": "bg-yellow-100 text-yellow-800",
  "RM-MP": "bg-lime-100 text-lime-800",
  "SUB-AS": "bg-teal-100 text-teal-800",
  SG: "bg-pink-100 text-pink-800",
  DH: "bg-rose-100 text-rose-800",
}

const opColors: Record<string, string> = {
  CUTTING: "bg-red-100 text-red-700",
  WELDING: "bg-orange-100 text-orange-700",
  ASSEMBLY: "bg-blue-100 text-blue-700",
  PREPARATION: "bg-yellow-100 text-yellow-700",
  PAINTING: "bg-green-100 text-green-700",
  SHOTBLAST: "bg-purple-100 text-purple-700",
  PACKING: "bg-gray-100 text-gray-700",
  "NDT-SUB": "bg-pink-100 text-pink-700",
}

function formatMinutes(mins: number): string {
  if (mins === 0) return "-"
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ─── Stock Items Tab ──────────────────────────────────────────

function StockItemsTab({ stockItems, familyCounts }: { stockItems: StockItem[]; familyCounts: FamilyCount[] }) {
  const [search, setSearch] = useState("")
  const [familyFilter, setFamilyFilter] = useState<string | null>(null)
  const [groupFilter, setGroupFilter] = useState<string | null>(null)

  const productGroups = useMemo(() => {
    const groups = new Set<string>()
    stockItems.forEach((s) => { if (s.productGroup) groups.add(s.productGroup) })
    return Array.from(groups).sort()
  }, [stockItems])

  const filtered = useMemo(() => {
    let items = stockItems
    if (familyFilter) items = items.filter((s) => s.productFamily === familyFilter)
    if (groupFilter) items = items.filter((s) => s.productGroup === groupFilter)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (s) =>
          s.stockCode.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      )
    }
    return items
  }, [stockItems, search, familyFilter, groupFilter])

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {familyCounts.slice(0, 6).map((f) => (
          <Card
            key={f.family}
            className={`cursor-pointer transition-shadow hover:shadow-md ${familyFilter === f.family ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setFamilyFilter(familyFilter === f.family ? null : f.family)}
          >
            <CardContent className="p-3">
              <p className="text-xs text-gray-500 truncate">{f.family}</p>
              <p className="text-lg font-semibold">{f.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search stock code, name, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-9 rounded-md border border-gray-200 px-3 text-sm"
          value={groupFilter || ""}
          onChange={(e) => setGroupFilter(e.target.value || null)}
        >
          <option value="">All Groups</option>
          {productGroups.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        {(familyFilter || groupFilter || search) && (
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => { setSearch(""); setFamilyFilter(null); setGroupFilter(null) }}
          >
            Clear filters
          </button>
        )}
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} items</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[80px]">Group</TableHead>
                  <TableHead className="w-[120px]">Family</TableHead>
                  <TableHead className="w-[100px]">Material</TableHead>
                  <TableHead className="w-[80px]">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.stockCode}</TableCell>
                    <TableCell>
                      <div className="text-sm">{item.name}</div>
                      {item.description && item.description !== item.name && (
                        <div className="text-xs text-gray-400 truncate max-w-[300px]">{item.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.productGroup && (
                        <Badge variant="secondary" className={`text-[10px] ${groupColors[item.productGroup] || "bg-gray-100 text-gray-700"}`}>
                          {item.productGroup}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">{item.productFamily || "-"}</TableCell>
                    <TableCell className="text-xs text-gray-600">{item.materialComposition || "-"}</TableCell>
                    <TableCell>
                      {item.bomItemType === 3 ? (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px]">BOM</Badge>
                      ) : item.defaultMake ? (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 text-[10px]">Make</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-50 text-gray-600 text-[10px]">Buy</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 200 && (
            <p className="text-xs text-gray-400 text-center py-2">
              Showing 200 of {filtered.length} — use search to narrow down
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── BOM Explorer Tab ─────────────────────────────────────────

function BomExplorerTab({ bomHeaders }: { bomHeaders: BomHeader[] }) {
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return bomHeaders
    const q = search.toLowerCase()
    return bomHeaders.filter(
      (h) =>
        h.headerRef.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q))
    )
  }, [bomHeaders, search])

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search BOM reference or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">{filtered.length} BOMs</span>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 50).map((bom) => {
          const isOpen = expanded === bom.headerRef
          const totalLabour = bom.operations.reduce((s, o) => s + o.totalLabourMinutes, 0)

          return (
            <Card key={bom.id} className="overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : bom.headerRef)}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{bom.headerRef}</span>
                    <span className="text-sm text-gray-600 truncate">{bom.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {bom._count.components} parts
                  </span>
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {bom._count.operations} ops
                  </span>
                  {totalLabour > 0 && (
                    <span className="font-medium text-gray-700">
                      {formatMinutes(totalLabour)}
                    </span>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="border-t bg-gray-50/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x">
                    {/* Components */}
                    <div className="p-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Components ({bom.components.length})
                      </h4>
                      <div className="max-h-[300px] overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left pb-1 font-medium">#</th>
                              <th className="text-left pb-1 font-medium">Code</th>
                              <th className="text-left pb-1 font-medium">Description</th>
                              <th className="text-right pb-1 font-medium">Qty</th>
                              <th className="text-left pb-1 pl-2 font-medium">Unit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bom.components.map((c) => (
                              <tr key={c.id} className="border-t border-gray-100">
                                <td className="py-1 text-gray-400">{c.sequenceNo}</td>
                                <td className="py-1 font-mono">{c.stockCode}</td>
                                <td className="py-1 text-gray-600 truncate max-w-[200px]">{c.description}</td>
                                <td className="py-1 text-right font-medium">{c.quantity}</td>
                                <td className="py-1 pl-2 text-gray-400">{c.unitOfMeasure || "ea"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Operations */}
                    <div className="p-4 border-t lg:border-t-0">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Operations ({bom.operations.length})
                      </h4>
                      <div className="space-y-2">
                        {bom.operations.map((op) => (
                          <div key={op.id} className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] shrink-0 ${opColors[op.operationRef] || "bg-gray-100 text-gray-700"}`}
                            >
                              {op.operationRef}
                            </Badge>
                            <span className="text-xs text-gray-600 flex-1 truncate">
                              {op.operationDescription}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">{op.labourRef}</span>
                            <span className="text-xs font-medium shrink-0 w-14 text-right">
                              {formatMinutes(op.totalLabourMinutes)}
                            </span>
                          </div>
                        ))}
                        {bom.operations.length > 0 && (
                          <div className="border-t pt-2 flex justify-end text-xs font-semibold text-gray-700">
                            Total: {formatMinutes(bom.operations.reduce((s, o) => s + o.totalLabourMinutes, 0))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {filtered.length > 50 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Showing 50 of {filtered.length} — use search to narrow down
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Operations Tab ───────────────────────────────────────────

function OperationsTab({ operationSummary, bomHeaders }: { operationSummary: OperationSummary[]; bomHeaders: BomHeader[] }) {
  const sorted = useMemo(
    () => [...operationSummary].sort((a, b) => b.totalHours - a.totalHours),
    [operationSummary]
  )
  const maxHours = Math.max(...sorted.map((o) => o.totalHours), 1)

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Total Labour Hours by Operation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sorted.map((op) => (
              <div key={op.operationRef} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${opColors[op.operationRef] || "bg-gray-100 text-gray-700"}`}
                  >
                    {op.operationRef}
                  </Badge>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max((op.totalHours / maxHours) * 100, 8)}%` }}
                  >
                    <span className="text-[10px] font-medium text-white">{op.totalHours}h</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-20 text-right">{op.count} entries</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top products by labour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Products by Total Labour</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Operations</TableHead>
                <TableHead className="text-right">Total Labour</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bomHeaders
                .map((h) => ({
                  ...h,
                  totalLabour: h.operations.reduce((s, o) => s + o.totalLabourMinutes, 0),
                }))
                .sort((a, b) => b.totalLabour - a.totalLabour)
                .slice(0, 15)
                .map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs">{h.headerRef}</TableCell>
                    <TableCell className="text-sm">{h.description}</TableCell>
                    <TableCell className="text-right">{h._count.operations}</TableCell>
                    <TableCell className="text-right font-medium">{formatMinutes(h.totalLabour)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export function BomLibraryClient({ stockItems, bomHeaders, operationSummary, familyCounts }: Props) {
  return (
    <Tabs defaultValue="stock-items">
      <TabsList>
        <TabsTrigger value="stock-items" className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          Stock Items
        </TabsTrigger>
        <TabsTrigger value="bom-explorer" className="flex items-center gap-1.5">
          <ListTree className="h-3.5 w-3.5" />
          BOM Explorer
        </TabsTrigger>
        <TabsTrigger value="operations" className="flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Operations
        </TabsTrigger>
      </TabsList>

      <TabsContent value="stock-items">
        <StockItemsTab stockItems={stockItems} familyCounts={familyCounts} />
      </TabsContent>

      <TabsContent value="bom-explorer">
        <BomExplorerTab bomHeaders={bomHeaders} />
      </TabsContent>

      <TabsContent value="operations">
        <OperationsTab operationSummary={operationSummary} bomHeaders={bomHeaders} />
      </TabsContent>
    </Tabs>
  )
}
