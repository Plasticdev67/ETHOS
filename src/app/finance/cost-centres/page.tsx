'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Building2,
  Plus,
  RefreshCw,
  AlertTriangle,
  Trash2,
  BarChart3,
  Check,
  X,
  Edit2,
} from 'lucide-react'

interface CostCentre {
  id: string
  code: string
  name: string
  managerId: string | null
  isActive: boolean
  createdAt: string
}

export default function CostCentresPage() {
  const [costCentres, setCostCentres] = useState<CostCentre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Inline create form
  const [showForm, setShowForm] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newManager, setNewManager] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editManager, setEditManager] = useState('')

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/finance/cost-centres')
      if (!res.ok) throw new Error('Failed to load cost centres')
      const data = await res.json()
      setCostCentres(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      const res = await fetch('/api/finance/cost-centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          managerId: newManager || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create')
        return
      }

      setSuccessMessage(`Cost Centre "${data.name}" created successfully`)
      setNewCode('')
      setNewName('')
      setNewManager('')
      setShowForm(false)
      fetchData()
    } catch (err) {
      setError('Failed to create cost centre')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(costCentre: CostCentre) {
    if (!confirm(`Delete cost centre "${costCentre.name}" (${costCentre.code})?`)) return
    try {
      setError(null)
      setSuccessMessage(null)
      const res = await fetch(`/api/finance/cost-centres/${costCentre.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to delete')
        return
      }
      setSuccessMessage(`Cost Centre "${costCentre.name}" deleted`)
      fetchData()
    } catch (err) {
      setError('Failed to delete cost centre')
    }
  }

  async function handleToggleActive(costCentre: CostCentre) {
    try {
      setError(null)
      const res = await fetch(`/api/finance/cost-centres/${costCentre.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !costCentre.isActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update')
        return
      }
      fetchData()
    } catch (err) {
      setError('Failed to update cost centre')
    }
  }

  function startEdit(costCentre: CostCentre) {
    setEditingId(costCentre.id)
    setEditCode(costCentre.code)
    setEditName(costCentre.name)
    setEditManager(costCentre.managerId || '')
  }

  async function handleSaveEdit() {
    if (!editingId) return
    try {
      setError(null)
      const res = await fetch(`/api/finance/cost-centres/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editCode,
          name: editName,
          managerId: editManager || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update')
        return
      }
      setEditingId(null)
      setSuccessMessage('Cost Centre updated')
      fetchData()
    } catch (err) {
      setError('Failed to update cost centre')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Centres</h1>
          <p className="text-sm text-gray-500">
            Manage cost centres for tracking on journal entries
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          New Cost Centre
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Inline create form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Cost Centre</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Code</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. ENG"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                required
                maxLength={20}
              />
            </div>
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Engineering"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Manager (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. John Smith"
                value={newManager}
                onChange={e => setNewManager(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} />
                {saving ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      ) : costCentres.length === 0 ? (
        <div className="card text-center py-12">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No cost centres created yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Create First Cost Centre
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header">Code</th>
                <th className="table-header">Name</th>
                <th className="table-header">Manager</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {costCentres.map(costCentre => (
                <tr key={costCentre.id} className="hover:bg-gray-50">
                  {editingId === costCentre.id ? (
                    <>
                      <td className="table-cell">
                        <input
                          type="text"
                          className="input py-1"
                          value={editCode}
                          onChange={e => setEditCode(e.target.value)}
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          className="input py-1"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                      </td>
                      <td className="table-cell">
                        <input
                          type="text"
                          className="input py-1"
                          value={editManager}
                          onChange={e => setEditManager(e.target.value)}
                        />
                      </td>
                      <td className="table-cell">
                        <span className={costCentre.isActive ? 'badge-success' : 'badge-gray'}>
                          {costCentre.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="btn-ghost p-1 text-green-600 hover:text-green-800"
                            title="Save"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn-ghost p-1 text-gray-400 hover:text-gray-600"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="table-cell font-mono font-medium text-gray-900">{costCentre.code}</td>
                      <td className="table-cell font-medium">{costCentre.name}</td>
                      <td className="table-cell text-gray-500">{costCentre.managerId || '-'}</td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleToggleActive(costCentre)}
                          className={cn(
                            'cursor-pointer',
                            costCentre.isActive ? 'badge-success' : 'badge-gray'
                          )}
                          title={`Click to ${costCentre.isActive ? 'deactivate' : 'activate'}`}
                        >
                          {costCentre.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/finance/cost-centres/${costCentre.id}`}
                            className="btn-ghost p-1 text-blue-600 hover:text-blue-800"
                            title="View Report"
                          >
                            <BarChart3 size={16} />
                          </Link>
                          <button
                            onClick={() => startEdit(costCentre)}
                            className="btn-ghost p-1 text-gray-400 hover:text-gray-600"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(costCentre)}
                            className="btn-ghost p-1 text-red-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
