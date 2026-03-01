"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatDate } from "@/lib/utils"
import { Plus, Search, FileText, ArrowRight } from "lucide-react"

type Enquiry = {
  id: string
  enquiryNumber: string
  subject: string
  status: string
  createdAt: string
  sentAt: string | null
  project: { id: string; projectNumber: string; name: string }
  createdBy: { id: string; name: string } | null
  _count: { lines: number; responses: number }
  responses: { id: string; status: string; supplier: { id: string; name: string } }[]
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PARTIALLY_RESPONDED: "bg-amber-100 text-amber-700",
  ALL_RESPONDED: "bg-green-100 text-green-700",
  AWARDED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
}

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_RESPONDED: "Partial Response",
  ALL_RESPONDED: "All Responded",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
}

export default function EnquiriesListPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    fetchEnquiries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function fetchEnquiries() {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "ALL") params.set("status", statusFilter)
    if (search) params.set("search", search)

    const res = await fetch(`/api/finance/enquiries?${params}`)
    if (res.ok) {
      const data = await res.json()
      setEnquiries(data)
    }
    setLoading(false)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchEnquiries()
  }

  const selectClass =
    "rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Procurement Enquiries</h1>
          <p className="text-sm text-gray-500">
            {enquiries.length} enquiries —{" "}
            {enquiries.filter((e) => e.status === "SENT" || e.status === "PARTIALLY_RESPONDED").length} awaiting response
          </p>
        </div>
        <Link href="/purchasing/enquiries/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Enquiry
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search enquiries..."
              className="pl-9 w-64"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PARTIALLY_RESPONDED">Partial Response</option>
          <option value="ALL_RESPONDED">All Responded</option>
          <option value="AWARDED">Awarded</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Enquiry No.
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Project
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Subject
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase text-gray-500">
                    Suppliers
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase text-gray-500">
                    Lines
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Created
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      Loading enquiries...
                    </td>
                  </tr>
                ) : enquiries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                      <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      No enquiries found. Create your first enquiry above.
                    </td>
                  </tr>
                ) : (
                  enquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-3">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {enq.enquiryNumber}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-gray-900">
                          {enq.project.projectNumber}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                          {enq.project.name}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-gray-900 truncate max-w-[250px] block">
                          {enq.subject}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm text-gray-700">{enq._count.responses}</span>
                        <div className="text-xs text-gray-400">
                          {enq.responses.filter((r) => r.status === "QUOTED").length} quoted
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-sm text-gray-700">{enq._count.lines}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[enq.status] || "bg-gray-100 text-gray-700"}`}
                        >
                          {statusLabels[enq.status] || enq.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        {formatDate(enq.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Link href={`/purchasing/enquiries/${enq.id}`}>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
