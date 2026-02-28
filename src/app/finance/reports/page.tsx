'use client'

import Link from 'next/link'
import {
  Scale,
  TrendingUp,
  Landmark,
  Users,
  Truck,
  Calculator,
  BookOpen,
  Briefcase,
} from 'lucide-react'

interface ReportCard {
  title: string
  description: string
  href: string
  icon: React.ElementType
}

const reports: ReportCard[] = [
  {
    title: 'Trial Balance',
    description: 'View account balances for any period. Verify that total debits equal total credits.',
    href: '/finance/reports/trial-balance',
    icon: Scale,
  },
  {
    title: 'Profit & Loss',
    description: 'Income and expenditure statement for a selected period or date range.',
    href: '/finance/reports/profit-and-loss',
    icon: TrendingUp,
  },
  {
    title: 'Balance Sheet',
    description: 'Statement of financial position showing assets, liabilities, and equity.',
    href: '/finance/reports/balance-sheet',
    icon: Landmark,
  },
  {
    title: 'Aged Debtors',
    description: 'Analysis of outstanding sales invoices grouped by ageing bands.',
    href: '/finance/sales/aged-debtors',
    icon: Users,
  },
  {
    title: 'Aged Creditors',
    description: 'Analysis of outstanding purchase invoices grouped by ageing bands.',
    href: '/finance/purchases/aged-creditors',
    icon: Truck,
  },
  {
    title: 'VAT Report',
    description: 'VAT summary for HMRC MTD submissions with box-by-box breakdown.',
    href: '/finance/vat',
    icon: Calculator,
  },
  {
    title: 'Nominal Activity',
    description: 'Transaction-level detail for any nominal account over a date range.',
    href: '/finance/reports/nominal-activity',
    icon: BookOpen,
  },
  {
    title: 'Job Costing',
    description: 'Revenue and cost analysis by project or job code.',
    href: '/finance/reports/job-costing',
    icon: Briefcase,
  },
]

export default function ReportsIndexPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Financial reports and analysis for HMRC-compliant accounting
        </p>
      </div>

      {/* Report cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map((report) => (
          <Link
            key={report.title}
            href={report.href}
            className="card p-6 transition-all hover:shadow-md hover:border-blue-200 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <report.icon size={22} />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{report.title}</h3>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
