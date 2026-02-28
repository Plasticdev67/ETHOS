'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  ShoppingCart,
  Plus,
  Truck,
  Search,
  FileText,
  Receipt,
  AlertTriangle,
  Clock,
  PoundSterling,
  ClipboardList,
} from 'lucide-react'

interface Invoice {
  id: string
  invoiceNumber: string
  supplier: { id: string; name: string }
  invoiceDate: string
  dueDate: string
  subtotal: number
  vatAmount: number
  total: number
  paidAmount: number
  outstandingAmount: number
  status: string
  isCreditNote: boolean
}

interface Supplier {
  id: string
  code: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  outstandingBalance: number
  isActive: boolean
}

interface AgedCreditors {
  totals: {
    total: string
    current: string
    days30: string
    days60: string
    days90Plus: string
  }
}

const STATUS_BADGES: Record<string, string> = {
  ACC_DRAFT: 'badge-gray',
  ACC_APPROVED: 'badge-info',
  ACC_POSTED: 'badge-success',
  PARTIALLY_PAID: 'badge-warning',
  ACC_PAID: 'badge-success',
  ACC_CANCELLED: 'badge-danger',
}

export default function PurchaseLedgerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'invoices' | 'creditNotes' | 'suppliers'>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [creditNotes, setCreditNotes] = useState<Invoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [agedData, setAgedData] = useState<AgedCreditors | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const [invoiceRes, creditNoteRes, supplierRes, agedRes] = await Promise.all([
          fetch('/api/finance/purchase-invoices?isCreditNote=false'),
          fetch('/api/finance/purchase-invoices?isCreditNote=true'),
          fetch('/api/finance/suppliers'),
          fetch('/api/finance/purchase-invoices/aged'),
        ])

        if (!invoiceRes.ok) throw new Error('Failed to load invoices')
        if (!creditNoteRes.ok) throw new Error('Failed to load credit notes')
        if (!supplierRes.ok) throw new Error('Failed to load suppliers')

        const invoiceData = await invoiceRes.json()
        const creditNoteData = await creditNoteRes.json()
        const supplierData = await supplierRes.json()

        setInvoices(Array.isArray(invoiceData) ? invoiceData.slice(0, 20) : (invoiceData.data || []).slice(0, 20))
        setCreditNotes(Array.isArray(creditNoteData) ? creditNoteData.slice(0, 20) : (creditNoteData.data || []).slice(0, 20))
        setSuppliers(Array.isArray(supplierData) ? supplierData : supplierData.data || [])

        if (agedRes.ok) {
          const agedJson = await agedRes.json()
          setAgedData(agedJson)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const tabs = [
    { key: 'invoices' as const, label: 'Recent Invoices', icon: FileText },
    { key: 'creditNotes' as const, label: 'Credit Notes', icon: Receipt },
    { key: 'suppliers' as const, label: 'Suppliers', icon: Truck },
  ]

  const summaryCards = [
    {
      label: 'Total Outstanding',
      value: agedData?.totals?.total ?? '0.00',
      icon: PoundSterling,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Current (0-30 days)',
      value: agedData?.totals?.current ?? '0.00',
      icon: Clock,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Overdue 30-60 days',
      value: agedData?.totals?.days30 ?? '0.00',
      icon: AlertTriangle,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      label: 'Overdue 60+ days',
      value: (parseFloat(agedData?.totals?.days60 ?? '0') + parseFloat(agedData?.totals?.days90Plus ?? '0')).toFixed(2),
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Ledger</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage purchase invoices, credit notes, and suppliers
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/finance/purchases/orders" className="btn-secondary inline-flex items-center gap-2">
            <ClipboardList size={16} />
            Purchase Orders
          </Link>
          <Link href="/finance/purchases/suppliers/new" className="btn-secondary inline-flex items-center gap-2">
            <Truck size={16} />
            New Supplier
          </Link>
          <Link href="/finance/purchases/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-7 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          : summaryCards.map((card) => (
              <div key={card.label} className="card p-5">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.color)}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{card.label}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(card.value)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="card">
          <div className="animate-pulse p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="card overflow-hidden">
              {invoices.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText size={40} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No invoices yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Create your first purchase invoice to get started.</p>
                  <Link href="/finance/purchases/new" className="btn-primary inline-flex items-center gap-2">
                    <Plus size={16} />
                    New Invoice
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="table-header">Invoice #</th>
                        <th className="table-header">Supplier</th>
                        <th className="table-header">Invoice Date</th>
                        <th className="table-header">Due Date</th>
                        <th className="table-header text-right">Subtotal</th>
                        <th className="table-header text-right">VAT</th>
                        <th className="table-header text-right">Total</th>
                        <th className="table-header text-right">Paid</th>
                        <th className="table-header text-right">Outstanding</th>
                        <th className="table-header">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="table-cell">
                            <Link href={`/finance/purchases/${inv.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="table-cell">{inv.supplier?.name}</td>
                          <td className="table-cell">{formatDate(inv.invoiceDate)}</td>
                          <td className="table-cell">{formatDate(inv.dueDate)}</td>
                          <td className="table-cell text-right">{formatCurrency(inv.subtotal)}</td>
                          <td className="table-cell text-right">{formatCurrency(inv.vatAmount)}</td>
                          <td className="table-cell text-right font-medium">{formatCurrency(inv.total)}</td>
                          <td className="table-cell text-right">{formatCurrency(inv.paidAmount)}</td>
                          <td className="table-cell text-right">{formatCurrency(inv.outstandingAmount)}</td>
                          <td className="table-cell">
                            <span className={STATUS_BADGES[inv.status] || 'badge-gray'}>
                              {inv.status.replace('ACC_', '').replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Credit Notes Tab */}
          {activeTab === 'creditNotes' && (
            <div className="card overflow-hidden">
              {creditNotes.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt size={40} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No credit notes</h3>
                  <p className="text-sm text-gray-500">Credit notes will appear here when created against purchase invoices.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="table-header">Credit Note #</th>
                        <th className="table-header">Supplier</th>
                        <th className="table-header">Invoice Date</th>
                        <th className="table-header">Due Date</th>
                        <th className="table-header text-right">Subtotal</th>
                        <th className="table-header text-right">VAT</th>
                        <th className="table-header text-right">Total</th>
                        <th className="table-header text-right">Paid</th>
                        <th className="table-header text-right">Outstanding</th>
                        <th className="table-header">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {creditNotes.map((cn_item) => (
                        <tr key={cn_item.id} className="hover:bg-gray-50">
                          <td className="table-cell">
                            <Link href={`/finance/purchases/${cn_item.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                              {cn_item.invoiceNumber}
                            </Link>
                          </td>
                          <td className="table-cell">{cn_item.supplier?.name}</td>
                          <td className="table-cell">{formatDate(cn_item.invoiceDate)}</td>
                          <td className="table-cell">{formatDate(cn_item.dueDate)}</td>
                          <td className="table-cell text-right">{formatCurrency(cn_item.subtotal)}</td>
                          <td className="table-cell text-right">{formatCurrency(cn_item.vatAmount)}</td>
                          <td className="table-cell text-right font-medium">{formatCurrency(cn_item.total)}</td>
                          <td className="table-cell text-right">{formatCurrency(cn_item.paidAmount)}</td>
                          <td className="table-cell text-right">{formatCurrency(cn_item.outstandingAmount)}</td>
                          <td className="table-cell">
                            <span className={STATUS_BADGES[cn_item.status] || 'badge-gray'}>
                              {cn_item.status.replace('ACC_', '').replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && (
            <div className="card overflow-hidden">
              {suppliers.length === 0 ? (
                <div className="p-12 text-center">
                  <Truck size={40} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No suppliers yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Add your first supplier to start recording purchases.</p>
                  <Link href="/finance/purchases/suppliers/new" className="btn-primary inline-flex items-center gap-2">
                    <Truck size={16} />
                    New Supplier
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="table-header">Code</th>
                        <th className="table-header">Name</th>
                        <th className="table-header">Contact</th>
                        <th className="table-header">Phone</th>
                        <th className="table-header">Email</th>
                        <th className="table-header text-right">Outstanding</th>
                        <th className="table-header">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {suppliers.map((sup) => (
                        <tr
                          key={sup.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/finance/purchases/suppliers/${sup.id}`)}
                        >
                          <td className="table-cell font-mono text-sm">{sup.code}</td>
                          <td className="table-cell font-medium">{sup.name}</td>
                          <td className="table-cell">{sup.contactName || '-'}</td>
                          <td className="table-cell">{sup.phone || '-'}</td>
                          <td className="table-cell">{sup.email || '-'}</td>
                          <td className="table-cell text-right font-medium">
                            {formatCurrency(sup.outstandingBalance ?? 0)}
                          </td>
                          <td className="table-cell">
                            <span className={sup.isActive ? 'badge-success' : 'badge-gray'}>
                              {sup.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/finance/purchases/orders" className="btn-ghost inline-flex items-center gap-2 text-sm">
          <ClipboardList size={16} />
          Purchase Orders
        </Link>
        <Link href="/finance/purchases/aged-creditors" className="btn-ghost inline-flex items-center gap-2 text-sm">
          <AlertTriangle size={16} />
          Aged Creditors Report
        </Link>
        <Link href="/finance/purchases/suppliers" className="btn-ghost inline-flex items-center gap-2 text-sm">
          <Truck size={16} />
          All Suppliers
        </Link>
      </div>
    </div>
  )
}
