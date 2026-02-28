'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Wand2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TestTube2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface BankRule {
  id: string
  name: string
  matchField: string
  matchType: string
  matchValue: string
  accountId: string
  vatCodeId: string | null
  description: string | null
  isInflow: boolean | null
  priority: number
  isActive: boolean
  timesApplied: number
  createdAt: string
}

interface Account {
  id: string
  code: string
  name: string
  type: string
}

interface VatCode {
  id: string
  code: string
  name: string
  rate: string
}

interface MatchResult {
  id: string
  name: string
  matchType: string
  matchValue: string
  accountId: string
  vatCodeId: string | null
  description: string | null
  isInflow: boolean | null
  priority: number
  timesApplied: number
}

interface MatchResponse {
  description: string
  amount: string
  isInflow: boolean
  matchCount: number
  matches: MatchResult[]
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BankRulesPage() {
  const [rules, setRules] = useState<BankRule[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [vatCodes, setVatCodes] = useState<VatCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newRule, setNewRule] = useState({
    name: '',
    matchType: 'CONTAINS' as string,
    matchValue: '',
    accountId: '',
    vatCodeId: '',
    description: '',
    isInflow: '' as '' | 'true' | 'false',
    priority: 0,
  })

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRule, setEditRule] = useState({
    name: '',
    matchType: 'CONTAINS' as string,
    matchValue: '',
    accountId: '',
    vatCodeId: '',
    description: '',
    isInflow: '' as '' | 'true' | 'false',
    priority: 0,
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Test state
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [testDescription, setTestDescription] = useState('')
  const [testAmount, setTestAmount] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<MatchResponse | null>(null)

  // Filter
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('')

  // ── Load data ──────────────────────────────────────────────────────────

  const loadRules = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterActive) params.set('active', filterActive)
      const res = await fetch(`/api/finance/bank-rules?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch bank rules')
      const data: BankRule[] = await res.json()
      setRules(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load rules')
    }
  }, [filterActive])

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/accounts?active=true')
      if (res.ok) {
        const data: Account[] = await res.json()
        setAccounts(data)
      }
    } catch {
      // Non-critical
    }
  }, [])

  const loadVatCodes = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/vat-codes')
      if (res.ok) {
        const data: VatCode[] = await res.json()
        setVatCodes(data)
      }
    } catch {
      // Non-critical
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([loadRules(), loadAccounts(), loadVatCodes()])
      setLoading(false)
    }
    init()
  }, [loadRules, loadAccounts, loadVatCodes])

  // ── Create rule ─────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!newRule.name || !newRule.matchValue || !newRule.accountId) {
      setError('Name, match value, and account are required')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        name: newRule.name,
        matchType: newRule.matchType,
        matchValue: newRule.matchValue,
        accountId: newRule.accountId,
        vatCodeId: newRule.vatCodeId || null,
        description: newRule.description || null,
        isInflow: newRule.isInflow === '' ? null : newRule.isInflow === 'true',
        priority: newRule.priority,
      }

      const res = await fetch('/api/finance/bank-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create rule')
      }

      setShowCreateForm(false)
      setNewRule({
        name: '',
        matchType: 'CONTAINS',
        matchValue: '',
        accountId: '',
        vatCodeId: '',
        description: '',
        isInflow: '',
        priority: 0,
      })
      setSuccess('Rule created successfully')
      setTimeout(() => setSuccess(null), 3000)
      await loadRules()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
    } finally {
      setCreating(false)
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────────

  async function toggleActive(rule: BankRule) {
    try {
      const res = await fetch(`/api/finance/bank-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      if (!res.ok) throw new Error('Failed to toggle rule')
      await loadRules()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update rule')
    }
  }

  // ── Delete rule ─────────────────────────────────────────────────────────

  async function handleDelete(rule: BankRule) {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/finance/bank-rules/${rule.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete rule')
      setSuccess('Rule deleted')
      setTimeout(() => setSuccess(null), 3000)
      await loadRules()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  // ── Move priority ───────────────────────────────────────────────────────

  async function movePriority(rule: BankRule, direction: 'up' | 'down') {
    const newPriority = direction === 'up' ? rule.priority - 1 : rule.priority + 1
    if (newPriority < 0) return
    try {
      const res = await fetch(`/api/finance/bank-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      if (!res.ok) throw new Error('Failed to update priority')
      await loadRules()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update priority')
    }
  }

  // ── Start editing ───────────────────────────────────────────────────────

  function startEditing(rule: BankRule) {
    setEditingId(rule.id)
    setEditRule({
      name: rule.name,
      matchType: rule.matchType,
      matchValue: rule.matchValue,
      accountId: rule.accountId,
      vatCodeId: rule.vatCodeId || '',
      description: rule.description || '',
      isInflow: rule.isInflow === null ? '' : rule.isInflow ? 'true' : 'false',
      priority: rule.priority,
    })
  }

  async function saveEdit() {
    if (!editingId) return
    setSavingEdit(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        name: editRule.name,
        matchType: editRule.matchType,
        matchValue: editRule.matchValue,
        accountId: editRule.accountId,
        vatCodeId: editRule.vatCodeId || null,
        description: editRule.description || null,
        isInflow: editRule.isInflow === '' ? null : editRule.isInflow === 'true',
        priority: editRule.priority,
      }

      const res = await fetch(`/api/finance/bank-rules/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update rule')
      }

      setEditingId(null)
      setSuccess('Rule updated successfully')
      setTimeout(() => setSuccess(null), 3000)
      await loadRules()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update rule')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Test rules ──────────────────────────────────────────────────────────

  async function handleTest() {
    if (!testDescription) {
      setError('Enter a bank description to test')
      return
    }
    setTesting(true)
    setError(null)
    setTestResults(null)
    try {
      const res = await fetch('/api/finance/bank-rules/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: testDescription,
          amount: testAmount || '0',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to test rules')
      }
      const data: MatchResponse = await res.json()
      setTestResults(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to test rules')
    } finally {
      setTesting(false)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  function getAccountLabel(accountId: string): string {
    const acc = accounts.find((a) => a.id === accountId)
    return acc ? `${acc.code} - ${acc.name}` : accountId
  }

  function getVatCodeLabel(vatCodeId: string | null): string {
    if (!vatCodeId) return '-'
    const vc = vatCodes.find((v) => v.id === vatCodeId)
    return vc ? `${vc.code} (${vc.rate}%)` : vatCodeId
  }

  function getMatchTypeBadge(matchType: string): string {
    switch (matchType) {
      case 'CONTAINS': return 'badge-info'
      case 'EXACT': return 'badge-success'
      case 'STARTS_WITH': return 'badge-warning'
      case 'REGEX': return 'badge-danger'
      default: return 'badge-gray'
    }
  }

  function getDirectionLabel(isInflow: boolean | null): string {
    if (isInflow === null) return 'Any'
    return isInflow ? 'Inflow' : 'Outflow'
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <Wand2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank Rules</h1>
            <p className="text-sm text-gray-500">
              Auto-categorise bank transactions by matching description patterns
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4 flex items-start gap-2">
          <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setShowCreateForm(!showCreateForm); setEditingId(null) }}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Plus size={16} />
            New Rule
          </button>

          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className="btn-secondary inline-flex items-center gap-1.5"
          >
            <TestTube2 size={16} />
            Test Rules
          </button>

          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-500">Filter:</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as '' | 'true' | 'false')}
              className="input w-auto"
            >
              <option value="">All Rules</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
            Create New Rule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Rule Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. BT Monthly Bill"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Match Type</label>
              <select
                className="input"
                value={newRule.matchType}
                onChange={(e) => setNewRule({ ...newRule, matchType: e.target.value })}
              >
                <option value="CONTAINS">Contains</option>
                <option value="EXACT">Exact Match</option>
                <option value="STARTS_WITH">Starts With</option>
                <option value="REGEX">Regex</option>
              </select>
            </div>
            <div>
              <label className="label">Match Value</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. BT GROUP PLC"
                value={newRule.matchValue}
                onChange={(e) => setNewRule({ ...newRule, matchValue: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Account</label>
              <select
                className="input"
                value={newRule.accountId}
                onChange={(e) => setNewRule({ ...newRule, accountId: e.target.value })}
              >
                <option value="">-- Select account --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">VAT Code (optional)</label>
              <select
                className="input"
                value={newRule.vatCodeId}
                onChange={(e) => setNewRule({ ...newRule, vatCodeId: e.target.value })}
              >
                <option value="">-- No VAT code --</option>
                {vatCodes.map((vc) => (
                  <option key={vc.id} value={vc.id}>
                    {vc.code} - {vc.name} ({vc.rate}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Direction</label>
              <select
                className="input"
                value={newRule.isInflow}
                onChange={(e) => setNewRule({ ...newRule, isInflow: e.target.value as '' | 'true' | 'false' })}
              >
                <option value="">Any Direction</option>
                <option value="true">Inflow (Money In)</option>
                <option value="false">Outflow (Money Out)</option>
              </select>
            </div>
            <div>
              <label className="label">Priority (lower = higher priority)</label>
              <input
                type="number"
                className="input"
                min={0}
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="Internal note about this rule"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {creating ? 'Creating...' : 'Create Rule'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Test Panel */}
      {showTestPanel && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
            Test Bank Rules
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Paste a bank transaction description and amount to see which rules would match.
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[300px]">
              <label className="label">Bank Description</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. BT GROUP PLC DD REF 12345"
                value={testDescription}
                onChange={(e) => setTestDescription(e.target.value)}
              />
            </div>
            <div className="w-[160px]">
              <label className="label">Amount</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="e.g. -49.99"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
              />
            </div>
            <div>
              <button
                onClick={handleTest}
                disabled={testing}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                {testing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {testing ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>

          {testResults && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {testResults.matchCount === 0
                    ? 'No rules matched'
                    : `${testResults.matchCount} rule(s) matched`}
                </span>
                {testResults.matchCount > 0 && (
                  <span className="badge-success">
                    {testResults.isInflow ? 'Inflow' : 'Outflow'}: {formatCurrency(parseFloat(testResults.amount))}
                  </span>
                )}
              </div>

              {testResults.matches.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-header">Priority</th>
                        <th className="table-header">Rule Name</th>
                        <th className="table-header">Match Type</th>
                        <th className="table-header">Match Value</th>
                        <th className="table-header">Account</th>
                        <th className="table-header">Times Applied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {testResults.matches.map((m, idx) => (
                        <tr
                          key={m.id}
                          className={cn(
                            'hover:bg-green-50/50 transition-colors',
                            idx === 0 ? 'bg-green-50' : ''
                          )}
                        >
                          <td className="table-cell text-center font-mono text-sm">
                            {m.priority}
                            {idx === 0 && (
                              <span className="ml-2 badge-success text-xs">Best</span>
                            )}
                          </td>
                          <td className="table-cell font-medium">{m.name}</td>
                          <td className="table-cell">
                            <span className={getMatchTypeBadge(m.matchType)}>{m.matchType}</span>
                          </td>
                          <td className="table-cell font-mono text-sm">{m.matchValue}</td>
                          <td className="table-cell text-sm">{getAccountLabel(m.accountId)}</td>
                          <td className="table-cell text-center font-mono text-sm text-gray-500">
                            {m.timesApplied}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rules Table */}
      {loading ? (
        <div className="card p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      ) : rules.length === 0 ? (
        <div className="card py-16 text-center">
          <Wand2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            No bank rules found. Create your first rule to auto-categorise bank transactions.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header w-16">Priority</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Match Type</th>
                  <th className="table-header">Match Value</th>
                  <th className="table-header">Account</th>
                  <th className="table-header">VAT</th>
                  <th className="table-header">Direction</th>
                  <th className="table-header text-center">Applied</th>
                  <th className="table-header text-center">Active</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rules.map((rule) => {
                  if (editingId === rule.id) {
                    return (
                      <tr key={rule.id} className="bg-blue-50">
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="input w-16 text-center font-mono text-sm"
                            min={0}
                            value={editRule.priority}
                            onChange={(e) => setEditRule({ ...editRule, priority: parseInt(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="input text-sm"
                            value={editRule.name}
                            onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="input text-sm"
                            value={editRule.matchType}
                            onChange={(e) => setEditRule({ ...editRule, matchType: e.target.value })}
                          >
                            <option value="CONTAINS">Contains</option>
                            <option value="EXACT">Exact</option>
                            <option value="STARTS_WITH">Starts With</option>
                            <option value="REGEX">Regex</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="input text-sm font-mono"
                            value={editRule.matchValue}
                            onChange={(e) => setEditRule({ ...editRule, matchValue: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="input text-sm"
                            value={editRule.accountId}
                            onChange={(e) => setEditRule({ ...editRule, accountId: e.target.value })}
                          >
                            <option value="">-- Select --</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="input text-sm"
                            value={editRule.vatCodeId}
                            onChange={(e) => setEditRule({ ...editRule, vatCodeId: e.target.value })}
                          >
                            <option value="">None</option>
                            {vatCodes.map((vc) => (
                              <option key={vc.id} value={vc.id}>
                                {vc.code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="input text-sm"
                            value={editRule.isInflow}
                            onChange={(e) => setEditRule({ ...editRule, isInflow: e.target.value as '' | 'true' | 'false' })}
                          >
                            <option value="">Any</option>
                            <option value="true">Inflow</option>
                            <option value="false">Outflow</option>
                          </select>
                        </td>
                        <td className="table-cell text-center font-mono text-sm text-gray-500">
                          {rule.timesApplied}
                        </td>
                        <td className="table-cell text-center">
                          <span className={rule.isActive ? 'badge-success' : 'badge-gray'}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={saveEdit}
                              disabled={savingEdit}
                              className="btn-primary text-xs px-2 py-1 inline-flex items-center gap-1"
                            >
                              {savingEdit ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn-ghost text-xs px-2 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr
                      key={rule.id}
                      className={cn(
                        'hover:bg-gray-50 transition-colors',
                        !rule.isActive && 'opacity-50'
                      )}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm text-gray-600 w-6 text-center">
                            {rule.priority}
                          </span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => movePriority(rule, 'up')}
                              className="text-gray-400 hover:text-gray-600 p-0.5"
                              title="Move up"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              onClick={() => movePriority(rule, 'down')}
                              className="text-gray-400 hover:text-gray-600 p-0.5"
                              title="Move down"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium text-gray-900">{rule.name}</span>
                        {rule.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{rule.description}</p>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={getMatchTypeBadge(rule.matchType)}>
                          {rule.matchType}
                        </span>
                      </td>
                      <td className="table-cell font-mono text-sm text-gray-600 max-w-[200px] truncate">
                        {rule.matchValue}
                      </td>
                      <td className="table-cell text-sm text-gray-700">
                        {getAccountLabel(rule.accountId)}
                      </td>
                      <td className="table-cell text-sm text-gray-500">
                        {getVatCodeLabel(rule.vatCodeId)}
                      </td>
                      <td className="table-cell">
                        <span className={cn(
                          'text-xs font-medium',
                          rule.isInflow === null ? 'text-gray-500' : rule.isInflow ? 'text-green-600' : 'text-red-600'
                        )}>
                          {getDirectionLabel(rule.isInflow)}
                        </span>
                      </td>
                      <td className="table-cell text-center font-mono text-sm text-gray-500">
                        {rule.timesApplied}
                      </td>
                      <td className="table-cell text-center">
                        <button
                          onClick={() => toggleActive(rule)}
                          className="text-gray-500 hover:text-gray-700"
                          title={rule.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {rule.isActive ? (
                            <ToggleRight size={24} className="text-green-600" />
                          ) : (
                            <ToggleLeft size={24} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditing(rule)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="Delete rule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-400">
            {rules.length} rule{rules.length !== 1 ? 's' : ''} total.
            Rules are matched in priority order (lowest number = highest priority).
            The first matching rule is used for auto-categorisation during bank reconciliation.
          </div>
        </div>
      )}
    </div>
  )
}
