'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatCurrency, formatDate, formatDateISO } from '@/lib/utils'
import {
  Briefcase,
  Printer,
  Download,
  Search,
  TrendingUp,
  PoundSterling,
  Percent,
  Clock,
} from 'lucide-react'

interface JobCostProject {
  projectId: string
  contractRef: string
  clientName: string
  contractValue: number
  revenue: number
  costs: number
  profit: number
  margin: number
  status: string
}

interface JobCostingData {
  generatedAt: string
  summary: {
    totalRevenue: number
    totalCosts: number
    totalProfit: number
    overallMargin: number
  }
  projects: JobCostProject[]
}

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'badge-gray',
  ACTIVE: 'badge-success',
  PRACTICAL_COMPLETION: 'badge-info',
  DEFECTS_LIABILITY: 'badge-warning',
  FINAL_ACCOUNT: 'badge-warning',
  CLOSED: 'badge-gray',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PRACTICAL_COMPLETION: 'Practical Completion',
  DEFECTS_LIABILITY: 'Defects Liability',
  FINAL_ACCOUNT: 'Final Account',
  CLOSED: 'Closed',
}

export default function JobCostingPage() {
  const [data, setData] = useState<JobCostingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectFilter, setProjectFilter] = useState('')

  // Auto-fetch on load
  useEffect(() => {
    fetchReport()
  }, [])

  async function fetchReport() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/finance/reports/job-costing')
      if (!res.ok) throw new Error('Failed to load job costing report')
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleExport() {
    if (!data) return
    const lines: string[] = [
      'Project ID,Contract Ref,Client,Contract Value,Revenue,Costs,Profit,Margin %,Status',
    ]

    data.projects.forEach((p) => {
      lines.push(
        `"${p.projectId}","${p.contractRef}","${p.clientName}",${p.contractValue},${p.revenue},${p.costs},${p.profit},${p.margin.toFixed(1)},"${p.status}"`
      )
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `job-costing-${formatDateISO(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter projects by search term
  const filteredProjects = data?.projects.filter((p) => {
    if (!projectFilter.trim()) return true
    const term = projectFilter.toLowerCase()
    return (
      p.contractRef.toLowerCase().includes(term) ||
      p.clientName.toLowerCase().includes(term) ||
      p.projectId.toLowerCase().includes(term)
    )
  }) || []

  function getMarginBadge(margin: number): string {
    if (margin >= 20) return 'text-green-700 bg-green-50'
    if (margin >= 10) return 'text-yellow-700 bg-yellow-50'
    return 'text-red-700 bg-red-50'
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/finance/reports" className="hover:text-gray-700">
            Reports
          </Link>
          <span>/</span>
          <span className="text-gray-900">Job Costing</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Costing Report</h1>
            <p className="mt-1 text-sm text-gray-500">
              Revenue and cost analysis by project or job code
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <>
                <button onClick={handleExport} className="btn-secondary">
                  <Download size={16} className="mr-2" />
                  Export CSV
                </button>
                <button onClick={handlePrint} className="btn-secondary">
                  <Printer size={16} className="mr-2" />
                  Print
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={fetchReport}
            className="mt-2 text-sm text-red-700 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : data ? (
          <>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-green-50 text-green-600">
                  <PoundSterling size={14} />
                </div>
                <p className="text-xs text-gray-500">Total Revenue</p>
              </div>
              <p className="text-lg font-semibold text-gray-900 font-mono">
                {formatCurrency(data.summary.totalRevenue)}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-red-50 text-red-600">
                  <PoundSterling size={14} />
                </div>
                <p className="text-xs text-gray-500">Total Costs</p>
              </div>
              <p className="text-lg font-semibold text-gray-900 font-mono">
                {formatCurrency(data.summary.totalCosts)}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
                  <TrendingUp size={14} />
                </div>
                <p className="text-xs text-gray-500">Total Profit</p>
              </div>
              <p
                className={cn(
                  'text-lg font-semibold font-mono',
                  data.summary.totalProfit >= 0 ? 'text-green-700' : 'text-red-700'
                )}
              >
                {formatCurrency(data.summary.totalProfit)}
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-600">
                  <Percent size={14} />
                </div>
                <p className="text-xs text-gray-500">Overall Margin</p>
              </div>
              <p
                className={cn(
                  'text-lg font-semibold',
                  data.summary.overallMargin >= 20
                    ? 'text-green-700'
                    : data.summary.overallMargin >= 10
                    ? 'text-yellow-700'
                    : 'text-red-700'
                )}
              >
                {data.summary.overallMargin.toFixed(1)}%
              </p>
            </div>
          </>
        ) : null}
      </div>

      {/* Filter */}
      {data && (
        <div className="card p-4 mb-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by project ID, contract ref, or client..."
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>
      )}

      {/* Projects Table */}
      <div className="card overflow-hidden" id="job-costing-report">
        {loading ? (
          <div className="p-6 animate-pulse space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-14 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : !data || filteredProjects.length === 0 ? (
          <div className="py-16 text-center">
            <Briefcase size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {projectFilter ? 'No matching projects' : 'No project data available'}
            </h3>
            <p className="text-sm text-gray-500">
              {projectFilter
                ? 'Try adjusting your search filter.'
                : 'Job costing data will appear once contracts have transactions posted.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Project ID</th>
                  <th className="table-header">Contract Ref</th>
                  <th className="table-header">Client</th>
                  <th className="table-header text-right">Contract Value</th>
                  <th className="table-header text-right">Revenue</th>
                  <th className="table-header text-right">Costs</th>
                  <th className="table-header text-right">Profit</th>
                  <th className="table-header text-right">Margin</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map((project, idx) => (
                  <tr
                    key={project.projectId}
                    className={cn(
                      'hover:bg-gray-50 transition-colors cursor-pointer',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    )}
                  >
                    <td className="table-cell">
                      <span className="font-mono text-sm text-blue-600 font-medium">
                        {project.projectId}
                      </span>
                    </td>
                    <td className="table-cell font-medium text-sm">{project.contractRef}</td>
                    <td className="table-cell text-sm">{project.clientName}</td>
                    <td className="table-cell text-right font-mono text-sm">
                      {formatCurrency(project.contractValue)}
                    </td>
                    <td className="table-cell text-right font-mono text-sm">
                      {formatCurrency(project.revenue)}
                    </td>
                    <td className="table-cell text-right font-mono text-sm">
                      {formatCurrency(project.costs)}
                    </td>
                    <td className="table-cell text-right font-mono text-sm">
                      <span
                        className={cn(
                          'font-medium',
                          project.profit >= 0 ? 'text-green-700' : 'text-red-700'
                        )}
                      >
                        {formatCurrency(project.profit)}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          getMarginBadge(project.margin)
                        )}
                      >
                        {project.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="table-cell">
                      <span
                        className={cn(
                          'text-xs',
                          STATUS_BADGES[project.status] || 'badge-gray'
                        )}
                      >
                        {STATUS_LABELS[project.status] || project.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals Footer */}
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td className="table-cell" colSpan={3}>
                    <span className="text-gray-900">Totals ({filteredProjects.length} projects)</span>
                  </td>
                  <td className="table-cell text-right font-mono text-sm text-gray-700">
                    {formatCurrency(
                      filteredProjects.reduce((sum, p) => sum + p.contractValue, 0)
                    )}
                  </td>
                  <td className="table-cell text-right font-mono text-sm text-gray-700">
                    {formatCurrency(
                      filteredProjects.reduce((sum, p) => sum + p.revenue, 0)
                    )}
                  </td>
                  <td className="table-cell text-right font-mono text-sm text-gray-700">
                    {formatCurrency(
                      filteredProjects.reduce((sum, p) => sum + p.costs, 0)
                    )}
                  </td>
                  <td className="table-cell text-right font-mono text-sm">
                    <span
                      className={cn(
                        'font-bold',
                        filteredProjects.reduce((sum, p) => sum + p.profit, 0) >= 0
                          ? 'text-green-700'
                          : 'text-red-700'
                      )}
                    >
                      {formatCurrency(
                        filteredProjects.reduce((sum, p) => sum + p.profit, 0)
                      )}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    {(() => {
                      const totalRev = filteredProjects.reduce((sum, p) => sum + p.revenue, 0)
                      const totalProfit = filteredProjects.reduce((sum, p) => sum + p.profit, 0)
                      const avgMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0
                      return (
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold',
                            getMarginBadge(avgMargin)
                          )}
                        >
                          {avgMargin.toFixed(1)}%
                        </span>
                      )
                    })()}
                  </td>
                  <td className="table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Generated timestamp */}
      {data && (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <Clock size={12} />
          Generated at {formatDate(data.generatedAt)}{' '}
          {new Date(data.generatedAt).toLocaleTimeString('en-GB')}
        </div>
      )}
    </div>
  )
}
