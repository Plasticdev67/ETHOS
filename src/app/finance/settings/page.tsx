'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatDate } from '@/lib/utils'
import {
  Settings,
  Building2,
  BookOpen,
  Receipt,
  Hash,
  Info,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  ToggleLeft,
  ToggleRight,
  Server,
  Database,
  Code2,
  Landmark,
  CircleDot,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CompanyInfo {
  companyName: string
  tradingName: string
  companyRegNumber: string
  vatRegNumber: string
  addressLine1: string
  addressLine2: string
  city: string
  county: string
  postcode: string
  phone: string
  email: string
  website: string
  financialYearStart: string
  baseCurrency: string
}

interface AccountMapping {
  label: string
  description: string
  code: string
}

interface VATConfig {
  vatScheme: string
  returnFrequency: string
  mtdConnected: boolean
  sandboxMode: boolean
  nextReturnDue: string
}

interface NumberSequence {
  name: string
  prefix: string
  currentNumber: number
  nextNumber: number
}

// ─── Defaults ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ethos-finance-settings'

const DEFAULT_COMPANY: CompanyInfo = {
  companyName: 'MM Engineered Solutions Ltd',
  tradingName: 'MME',
  companyRegNumber: '',
  vatRegNumber: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  county: 'Wales',
  postcode: '',
  phone: '',
  email: '',
  website: '',
  financialYearStart: '4',
  baseCurrency: 'GBP',
}

const DEFAULT_ACCOUNT_MAPPINGS: AccountMapping[] = [
  { label: 'Trade Debtors Control', description: 'Customer balances owed to the business', code: '1100' },
  { label: 'Trade Creditors Control', description: 'Supplier balances owed by the business', code: '2100' },
  { label: 'VAT Control', description: 'Net VAT position with HMRC', code: '2200' },
  { label: 'VAT Input (Purchase VAT)', description: 'VAT reclaimable on purchases', code: '2201' },
  { label: 'VAT Output (Sales VAT)', description: 'VAT collected on sales', code: '2202' },
  { label: 'Bank Current Account', description: 'Main business bank account', code: '1200' },
  { label: 'Sales Revenue', description: 'Income from sales of goods and services', code: '4000' },
  { label: 'Cost of Sales', description: 'Direct costs of delivering services', code: '5000' },
  { label: 'Retained Earnings', description: 'Accumulated profits retained in the business', code: '3200' },
  { label: 'CIS Deductions Payable', description: 'Construction Industry Scheme deductions held', code: '2210' },
  { label: 'Retention Held', description: 'Contract retentions held against defects', code: '2300' },
]

const DEFAULT_VAT_CONFIG: VATConfig = {
  vatScheme: 'Standard Accrual',
  returnFrequency: 'Quarterly',
  mtdConnected: false,
  sandboxMode: true,
  nextReturnDue: '',
}

const DEFAULT_SEQUENCES: NumberSequence[] = [
  { name: 'Journal Entries', prefix: 'JNL', currentNumber: 0, nextNumber: 1 },
  { name: 'Sales Invoices', prefix: 'INV', currentNumber: 0, nextNumber: 1 },
  { name: 'Purchase Invoices', prefix: 'PUR', currentNumber: 0, nextNumber: 1 },
  { name: 'Credit Notes', prefix: 'CRN', currentNumber: 0, nextNumber: 1 },
  { name: 'Bank Receipts', prefix: 'REC', currentNumber: 0, nextNumber: 1 },
  { name: 'Payment References', prefix: 'PAY', currentNumber: 0, nextNumber: 1 },
]

const MODULE_PHASES = [
  { phase: 'Phase 1', name: 'Core Accounting', status: 'Complete' },
  { phase: 'Phase 2', name: 'Sales Ledger', status: 'Complete' },
  { phase: 'Phase 3', name: 'Purchase Ledger', status: 'Complete' },
  { phase: 'Phase 4', name: 'Bank & Payments', status: 'Complete' },
  { phase: 'Phase 5', name: 'VAT & MTD', status: 'Complete' },
  { phase: 'Phase 6', name: 'Reports & Analysis', status: 'Complete' },
]

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

// ─── Tab definitions ────────────────────────────────────────────────────────────

type TabKey = 'company' | 'accounts' | 'vat' | 'sequences' | 'system'

const TABS: { key: TabKey; label: string; icon: typeof Settings }[] = [
  { key: 'company', label: 'Company Info', icon: Building2 },
  { key: 'accounts', label: 'Account Mappings', icon: BookOpen },
  { key: 'vat', label: 'VAT Configuration', icon: Receipt },
  { key: 'sequences', label: 'Numbering', icon: Hash },
  { key: 'system', label: 'System Info', icon: Info },
]

// ─── Component ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('company')
  const [loading, setLoading] = useState(true)

  // Section states
  const [company, setCompany] = useState<CompanyInfo>(DEFAULT_COMPANY)
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>(DEFAULT_ACCOUNT_MAPPINGS)
  const [vatConfig, setVatConfig] = useState<VATConfig>(DEFAULT_VAT_CONFIG)
  const [sequences, setSequences] = useState<NumberSequence[]>(DEFAULT_SEQUENCES)

  // Save feedback
  const [companySaved, setCompanySaved] = useState(false)
  const [accountsSaved, setAccountsSaved] = useState(false)
  const [vatSaved, setVatSaved] = useState(false)

  // ─── Load from localStorage ─────────────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.company) setCompany({ ...DEFAULT_COMPANY, ...data.company })
        if (data.accountMappings) setAccountMappings(data.accountMappings)
        if (data.vatConfig) setVatConfig({ ...DEFAULT_VAT_CONFIG, ...data.vatConfig })
        if (data.sequences) setSequences(data.sequences)
      }
    } catch {
      // If localStorage parse fails, defaults are already set
    }
    setLoading(false)
  }, [])

  // ─── Persist helper ─────────────────────────────────────────────────────────

  const persistSettings = useCallback(
    (overrides?: {
      company?: CompanyInfo
      accountMappings?: AccountMapping[]
      vatConfig?: VATConfig
      sequences?: NumberSequence[]
    }) => {
      const data = {
        company: overrides?.company ?? company,
        accountMappings: overrides?.accountMappings ?? accountMappings,
        vatConfig: overrides?.vatConfig ?? vatConfig,
        sequences: overrides?.sequences ?? sequences,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    [company, accountMappings, vatConfig, sequences]
  )

  // ─── Save handlers ─────────────────────────────────────────────────────────

  function handleSaveCompany() {
    persistSettings({ company })
    setCompanySaved(true)
    setTimeout(() => setCompanySaved(false), 3000)
  }

  function handleSaveAccounts() {
    persistSettings({ accountMappings })
    setAccountsSaved(true)
    setTimeout(() => setAccountsSaved(false), 3000)
  }

  function handleSaveVAT() {
    persistSettings({ vatConfig })
    setVatSaved(true)
    setTimeout(() => setVatSaved(false), 3000)
  }

  // ─── Mapping update helper ─────────────────────────────────────────────────

  function updateAccountMapping(index: number, newCode: string) {
    setAccountMappings((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], code: newCode }
      return updated
    })
  }

  // ─── Render helpers ─────────────────────────────────────────────────────────

  function renderLoadingSkeleton() {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="space-y-3 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Section 1: Company Information ─────────────────────────────────────────

  function renderCompanyInfo() {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
            <p className="text-sm text-gray-500 mt-1">
              Core business details used across invoices, reports, and HMRC submissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                className="input"
                value={company.companyName}
                onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
              />
            </div>

            {/* Trading Name */}
            <div>
              <label className="label">Trading Name</label>
              <input
                type="text"
                className="input"
                value={company.tradingName}
                onChange={(e) => setCompany({ ...company, tradingName: e.target.value })}
              />
            </div>

            {/* CRN */}
            <div>
              <label className="label">Company Registration Number</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 12345678"
                value={company.companyRegNumber}
                onChange={(e) => setCompany({ ...company, companyRegNumber: e.target.value })}
              />
            </div>

            {/* VAT Number */}
            <div>
              <label className="label">
                VAT Registration Number
                <span className="ml-1.5 text-xs text-blue-600 font-normal">(Required for MTD)</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. GB 123 4567 89"
                value={company.vatRegNumber}
                onChange={(e) => setCompany({ ...company, vatRegNumber: e.target.value })}
              />
            </div>
          </div>

          {/* Registered Address */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Registered Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Address Line 1</label>
                <input
                  type="text"
                  className="input"
                  value={company.addressLine1}
                  onChange={(e) => setCompany({ ...company, addressLine1: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Address Line 2</label>
                <input
                  type="text"
                  className="input"
                  value={company.addressLine2}
                  onChange={(e) => setCompany({ ...company, addressLine2: e.target.value })}
                />
              </div>
              <div>
                <label className="label">City / Town</label>
                <input
                  type="text"
                  className="input"
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                />
              </div>
              <div>
                <label className="label">County</label>
                <input
                  type="text"
                  className="input"
                  value={company.county}
                  onChange={(e) => setCompany({ ...company, county: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Postcode</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. CF10 1AA"
                  value={company.postcode}
                  onChange={(e) => setCompany({ ...company, postcode: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="e.g. 01234 567890"
                  value={company.phone}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="e.g. accounts@mme.co.uk"
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input
                  type="url"
                  className="input"
                  placeholder="e.g. https://www.mme.co.uk"
                  value={company.website}
                  onChange={(e) => setCompany({ ...company, website: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Financial Year & Currency */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Financial Year Start Month</label>
                <select
                  className="input"
                  value={company.financialYearStart}
                  onChange={(e) =>
                    setCompany({ ...company, financialYearStart: e.target.value })
                  }
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  UK standard is April (aligned with HMRC tax year)
                </p>
              </div>
              <div>
                <label className="label">Base Currency</label>
                <input
                  type="text"
                  className="input bg-gray-50 cursor-not-allowed"
                  value={company.baseCurrency}
                  readOnly
                />
                <p className="text-xs text-gray-400 mt-1">
                  Multi-currency support will be available in a future release
                </p>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-5">
            <p className="text-xs text-gray-400">
              Settings are stored locally. They will persist to the database when the settings API is built.
            </p>
            <button onClick={handleSaveCompany} className="btn-primary inline-flex items-center gap-2">
              {companySaved ? (
                <>
                  <CheckCircle2 size={16} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Company Info
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Section 2: Default Account Mappings ────────────────────────────────────

  function renderAccountMappings() {
    return (
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Default Account Mappings</h2>
            <p className="text-sm text-gray-500 mt-1">
              These GL account codes are used by the system for automatic postings. Change with care
              -- incorrect mappings may cause journal entries to post to the wrong accounts.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Account Purpose</th>
                  <th className="table-header">Description</th>
                  <th className="table-header w-32">GL Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accountMappings.map((mapping, index) => (
                  <tr key={mapping.label} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">{mapping.label}</span>
                    </td>
                    <td className="table-cell text-sm text-gray-500">
                      {mapping.description}
                    </td>
                    <td className="table-cell">
                      <input
                        type="text"
                        className="input w-24 font-mono text-sm text-center"
                        value={mapping.code}
                        onChange={(e) => updateAccountMapping(index, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">
                These are system accounts used for automatic double-entry postings (e.g. VAT journals,
                debtor/creditor control, CIS deductions). Ensure the corresponding accounts exist in your
                Chart of Accounts before changing these codes.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Settings are stored locally. They will persist to the database when the settings API is built.
            </p>
            <button onClick={handleSaveAccounts} className="btn-primary inline-flex items-center gap-2">
              {accountsSaved ? (
                <>
                  <CheckCircle2 size={16} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Mappings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Section 3: VAT Configuration ──────────────────────────────────────────

  function renderVATConfig() {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">VAT Configuration</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure your VAT scheme, return frequency, and HMRC Making Tax Digital connection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VAT Scheme */}
            <div>
              <label className="label">VAT Scheme</label>
              <select
                className="input"
                value={vatConfig.vatScheme}
                onChange={(e) => setVatConfig({ ...vatConfig, vatScheme: e.target.value })}
              >
                <option value="Standard Accrual">Standard Accrual</option>
                <option value="Cash Accounting">Cash Accounting</option>
                <option value="Flat Rate">Flat Rate</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Determines when VAT is accounted for -- on invoice date (accrual) or payment date (cash)
              </p>
            </div>

            {/* VAT Return Frequency */}
            <div>
              <label className="label">VAT Return Frequency</label>
              <select
                className="input"
                value={vatConfig.returnFrequency}
                onChange={(e) => setVatConfig({ ...vatConfig, returnFrequency: e.target.value })}
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Most UK businesses file quarterly. Check your HMRC obligations.
              </p>
            </div>
          </div>

          {/* MTD Connection Status */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">HMRC Making Tax Digital</h3>

            <div className="rounded-lg border border-gray-200 p-5">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                    vatConfig.mtdConnected ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                  )}
                >
                  {vatConfig.mtdConnected ? <Shield size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">MTD Connection Status</p>
                    <span className={vatConfig.mtdConnected ? 'badge-success' : 'badge-warning'}>
                      {vatConfig.mtdConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {vatConfig.mtdConnected
                      ? 'Your system is connected to HMRC MTD. VAT returns can be submitted digitally.'
                      : 'OAuth pending -- HMRC MTD connection has not been established yet. When connected, you will be able to submit VAT returns digitally to HMRC.'}
                  </p>
                  {!vatConfig.mtdConnected && (
                    <div className="mt-3 rounded-md bg-blue-50 border border-blue-100 p-3">
                      <p className="text-xs text-blue-700">
                        To connect to HMRC MTD, you will need to complete the OAuth 2.0 authorisation
                        flow via the HMRC Developer Hub. This will be available when the integration
                        API is deployed. For now, you can use sandbox mode for testing.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sandbox Mode Toggle */}
          <div className="mt-6">
            <div className="rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <Code2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">HMRC Sandbox Mode</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      When enabled, all HMRC API calls go to the test sandbox environment
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setVatConfig({ ...vatConfig, sandboxMode: !vatConfig.sandboxMode })}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  title={vatConfig.sandboxMode ? 'Disable sandbox mode' : 'Enable sandbox mode'}
                >
                  {vatConfig.sandboxMode ? (
                    <ToggleRight size={36} className="text-purple-600" />
                  ) : (
                    <ToggleLeft size={36} className="text-gray-400" />
                  )}
                </button>
              </div>
              {vatConfig.sandboxMode && (
                <div className="mt-3 rounded-md bg-purple-50 border border-purple-100 p-3">
                  <p className="text-xs text-purple-700">
                    Sandbox mode is active. All HMRC API calls will target the HMRC test environment.
                    No live data will be submitted. This is the recommended setting during development.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Next VAT Return Due */}
          <div className="mt-6">
            <div className="rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CircleDot size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Next VAT Return Due</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {vatConfig.nextReturnDue
                      ? formatDate(vatConfig.nextReturnDue)
                      : 'No return date set -- this will be calculated from your accounting periods'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-5">
            <p className="text-xs text-gray-400">
              Settings are stored locally. They will persist to the database when the settings API is built.
            </p>
            <button onClick={handleSaveVAT} className="btn-primary inline-flex items-center gap-2">
              {vatSaved ? (
                <>
                  <CheckCircle2 size={16} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save VAT Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Section 4: Numbering Sequences ─────────────────────────────────────────

  function renderNumberingSequences() {
    return (
      <div className="space-y-6">
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Numbering Sequences</h2>
            <p className="text-sm text-gray-500 mt-1">
              Auto-generated document reference numbers. These sequences are managed by the system
              and increment automatically when new documents are created.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Sequence Name</th>
                  <th className="table-header">Prefix</th>
                  <th className="table-header text-right">Current Number</th>
                  <th className="table-header text-right">Next Number</th>
                  <th className="table-header">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sequences.map((seq) => (
                  <tr key={seq.name} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">{seq.name}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-sm badge-info">{seq.prefix}</span>
                    </td>
                    <td className="table-cell text-right font-mono text-sm text-gray-500">
                      {String(seq.currentNumber).padStart(6, '0')}
                    </td>
                    <td className="table-cell text-right font-mono text-sm font-semibold text-gray-900">
                      {String(seq.nextNumber).padStart(6, '0')}
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-sm text-blue-600">
                        {seq.prefix}-{String(seq.nextNumber).padStart(6, '0')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">
                Numbering sequences are auto-managed by the system. Numbers increment automatically when
                journals, invoices, or other documents are created. They are shown here for reference only
                and cannot be manually edited to prevent gaps or duplicates.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Section 5: System Information ──────────────────────────────────────────

  function renderSystemInfo() {
    const sysInfo = [
      { label: 'System Version', value: 'ETHOS MK1 v1.0.0', icon: Server },
      { label: 'Database', value: 'PostgreSQL (via Prisma ORM)', icon: Database },
      { label: 'Framework', value: 'Next.js 15', icon: Code2 },
      { label: 'HMRC MTD', value: 'API Ready (mock mode)', icon: Landmark },
      { label: 'Last Updated', value: formatDate(new Date()), icon: Info },
    ]

    return (
      <div className="space-y-6">
        {/* System Details */}
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
            <p className="text-sm text-gray-500 mt-1">
              Technical details about the ETHOS Finance Module deployment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sysInfo.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-gray-200 p-4 flex items-start gap-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 shrink-0">
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module Status */}
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Module Status</h2>
            <p className="text-sm text-gray-500 mt-1">
              Implementation status of each phase of the ETHOS Finance Module.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Phase</th>
                  <th className="table-header">Module</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {MODULE_PHASES.map((phase) => (
                  <tr key={phase.phase} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <span className="font-mono text-sm text-gray-600">{phase.phase}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-gray-900">{phase.name}</span>
                    </td>
                    <td className="table-cell">
                      <span className="badge-success inline-flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {phase.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">
                All six phases of the ETHOS Finance Module are complete and operational.
                The system provides full double-entry accounting, sales and purchase ledgers,
                bank management, VAT compliance with HMRC MTD readiness, and comprehensive
                reporting and analysis capabilities.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage company information, account mappings, VAT configuration, and system preferences
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
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
        renderLoadingSkeleton()
      ) : (
        <>
          {activeTab === 'company' && renderCompanyInfo()}
          {activeTab === 'accounts' && renderAccountMappings()}
          {activeTab === 'vat' && renderVATConfig()}
          {activeTab === 'sequences' && renderNumberingSequences()}
          {activeTab === 'system' && renderSystemInfo()}
        </>
      )}
    </div>
  )
}
