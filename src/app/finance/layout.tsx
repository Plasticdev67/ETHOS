'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  ShoppingCart,
  Building2,
  Calculator,
  BarChart3,
  Calendar,
  Settings,
  HardHat,
  PiggyBank,
  Wand2,
  RefreshCw,
  ShieldAlert,
  CalendarCheck,
  Package,
  ArrowRightLeft,
  FolderTree,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
  Briefcase,
  CreditCard,
  ClipboardList,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

interface NavSection {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', href: '/finance', icon: LayoutDashboard },
      { name: 'Invoicing', href: '/finance/invoicing', icon: Receipt },
      { name: 'Job Costing', href: '/finance/job-costing', icon: Briefcase },
      { name: 'Nominal Codes', href: '/finance/nominal-codes', icon: BookOpen },
    ],
  },
  {
    label: 'Sales',
    icon: Receipt,
    items: [
      { name: 'Sales Ledger', href: '/finance/sales', icon: Receipt },
      { name: 'Credit Control', href: '/finance/credit-control', icon: ShieldAlert },
    ],
  },
  {
    label: 'Purchases',
    icon: ShoppingCart,
    items: [
      { name: 'Purchase Invoices', href: '/finance/purchases', icon: ShoppingCart },
      { name: 'Enquiries', href: '/purchasing/enquiries', icon: ClipboardList },
    ],
  },
  {
    label: 'Banking',
    icon: Building2,
    items: [
      { name: 'Bank & Payments', href: '/finance/bank', icon: Building2 },
      { name: 'Bank Rules', href: '/finance/bank-rules', icon: Wand2 },
    ],
  },
  {
    label: 'Accounting',
    icon: BookOpen,
    items: [
      { name: 'Chart of Accounts', href: '/finance/chart-of-accounts', icon: BookOpen },
      { name: 'Journal Entries', href: '/finance/journals', icon: FileText },
      { name: 'Contracts', href: '/finance/contracts', icon: HardHat },
      { name: 'Fixed Assets', href: '/finance/fixed-assets', icon: Package },
      { name: 'Prepayments', href: '/finance/prepayments', icon: ArrowRightLeft },
      { name: 'Recurring Entries', href: '/finance/recurring', icon: RefreshCw },
      { name: 'Cost Centres', href: '/finance/cost-centres', icon: FolderTree },
    ],
  },
  {
    label: 'Tax & Compliance',
    icon: Calculator,
    items: [
      { name: 'VAT Returns', href: '/finance/vat', icon: Calculator },
      { name: 'Budgets', href: '/finance/budgets', icon: PiggyBank },
      { name: 'Reports', href: '/finance/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Administration',
    icon: Settings,
    items: [
      { name: 'Periods', href: '/finance/periods', icon: Calendar },
      { name: 'Year-End', href: '/finance/year-end', icon: CalendarCheck },
      { name: 'Import Data', href: '/finance/import', icon: Upload },
      { name: 'Sage Export', href: '/finance/exports', icon: Download },
      { name: 'Settings', href: '/finance/settings', icon: Settings },
    ],
  },
]

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navSections.forEach((s) => { initial[s.label] = true })
    return initial
  })

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="flex h-full -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      {/* Finance sub-navigation sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Finance & Accounting</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">HMRC MTD Compliant</p>
        </div>
        <nav className="py-2">
          {navSections.map((section) => {
            const isOpen = openSections[section.label]
            const hasActiveItem = section.items.some((item) =>
              item.href === '/finance'
                ? pathname === '/finance'
                : pathname.startsWith(item.href)
            )

            return (
              <div key={section.label} className="mb-0.5">
                <button
                  onClick={() => toggleSection(section.label)}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    hasActiveItem ? 'text-blue-700' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <span>{section.label}</span>
                  {isOpen ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </button>
                {isOpen && (
                  <ul className="space-y-0.5 px-2 pb-1">
                    {section.items.map((item) => {
                      const isActive =
                        item.href === '/finance'
                          ? pathname === '/finance'
                          : item.href === '/finance/purchases'
                            ? pathname === '/finance/purchases' || pathname.match(/^\/finance\/purchases\/(?!orders)/)
                            : pathname.startsWith(item.href) && pathname !== '/finance'

                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <item.icon size={15} className="shrink-0" />
                            <span>{item.name}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
