"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Check, X } from "lucide-react"
import { prettifyEnum } from "@/lib/utils"

const roles = [
  "MANAGING_DIRECTOR", "TECHNICAL_DIRECTOR", "SALES_DIRECTOR", "DIRECTOR",
  "ENGINEERING_MANAGER", "PRODUCTION_MANAGER", "PROJECT_MANAGER", "R_AND_D_MANAGER",
  "DESIGN_ENGINEER", "SITE_MANAGER", "SITE_SUPERVISOR", "BUSINESS_DEVELOPMENT",
  "HEAD_OF_FINANCE_IT_PROCUREMENT", "FINANCE_MANAGER",
  "PROJECT_COORDINATOR", "PROJECT_ADMINISTRATOR", "PRODUCTION_SUPERVISOR",
  "SURVEYOR", "STAFF", "ADMIN",
]

function getRoleColor(role: string) {
  const colors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800",
    MANAGING_DIRECTOR: "bg-red-100 text-red-800",
    TECHNICAL_DIRECTOR: "bg-red-100 text-red-800",
    SALES_DIRECTOR: "bg-orange-100 text-orange-800",
    DIRECTOR: "bg-red-100 text-red-800",
    ENGINEERING_MANAGER: "bg-indigo-100 text-indigo-800",
    DESIGN_ENGINEER: "bg-indigo-100 text-indigo-800",
    R_AND_D_MANAGER: "bg-violet-100 text-violet-800",
    PRODUCTION_MANAGER: "bg-amber-100 text-amber-800",
    PRODUCTION_SUPERVISOR: "bg-amber-100 text-amber-800",
    PROJECT_MANAGER: "bg-purple-100 text-purple-800",
    PROJECT_COORDINATOR: "bg-purple-100 text-purple-800",
    PROJECT_ADMINISTRATOR: "bg-purple-100 text-purple-800",
    BUSINESS_DEVELOPMENT: "bg-blue-100 text-blue-800",
    HEAD_OF_FINANCE_IT_PROCUREMENT: "bg-emerald-100 text-emerald-800",
    FINANCE_MANAGER: "bg-emerald-100 text-emerald-800",
    SITE_MANAGER: "bg-teal-100 text-teal-800",
    SITE_SUPERVISOR: "bg-teal-100 text-teal-800",
    SURVEYOR: "bg-cyan-100 text-cyan-800",
    STAFF: "bg-gray-100 text-gray-800",
  }
  return colors[role] || "bg-gray-100 text-gray-800"
}

type UserData = {
  id: string
  name: string
  email: string
  role: string
  _count: {
    coordinatedProjects: number
    designedProducts: number
    coordinatedProducts: number
  }
}

export function EditUserRow({ user }: { user: UserData }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && nameRef.current) nameRef.current.focus()
  }, [editing])

  const totalAssignments =
    user._count.coordinatedProjects +
    user._count.designedProducts +
    user._count.coordinatedProducts

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to delete")
        return
      }
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  function handleCancel() {
    setName(user.name)
    setEmail(user.email)
    setRole(user.role)
    setEditing(false)
  }

  const selectClass = "rounded-md border border-border bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
  const inputClass = "rounded-md border border-border px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  if (editing) {
    return (
      <tr className="bg-blue-50/30">
        <td className="px-6 py-3">
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </td>
        <td className="px-6 py-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </td>
        <td className="px-6 py-3">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
            {roles.map((r) => (
              <option key={r} value={r}>{prettifyEnum(r)}</option>
            ))}
          </select>
        </td>
        <td className="px-6 py-3 text-center font-mono text-sm text-gray-600">{totalAssignments}</td>
        <td className="px-6 py-3">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving || !name.trim()}>
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-3 font-medium text-gray-900">{user.name}</td>
      <td className="px-6 py-3 text-gray-500">{user.email}</td>
      <td className="px-6 py-3">
        <Badge variant="secondary" className={getRoleColor(user.role)}>
          {prettifyEnum(user.role)}
        </Badge>
      </td>
      <td className="px-6 py-3 text-center font-mono text-sm text-gray-600">{totalAssignments}</td>
      <td className="px-6 py-3">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 text-gray-400" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
