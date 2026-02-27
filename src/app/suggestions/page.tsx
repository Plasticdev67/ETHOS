"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Filter, Send, Trash2 } from "lucide-react"
import { useSession } from "next-auth/react"

type SuggestionEntry = {
  id: string
  userId: string | null
  userName: string
  category: string
  message: string
  createdAt: string
}

const CATEGORIES = ["General", "Improvement", "Issue", "Idea"]

const categoryColors: Record<string, string> = {
  General: "bg-gray-100 text-gray-800",
  Improvement: "bg-blue-100 text-blue-800",
  Issue: "bg-red-100 text-red-800",
  Idea: "bg-green-100 text-green-800",
}

export default function SuggestionsPage() {
  const { data: session } = useSession()
  const userRole = (session?.user as { role?: string })?.role
  const [suggestions, setSuggestions] = useState<SuggestionEntry[]>([])
  const [categoryFilter, setCategoryFilter] = useState("")
  const [loading, setLoading] = useState(true)

  // Form state
  const [message, setMessage] = useState("")
  const [category, setCategory] = useState("General")
  const [posting, setPosting] = useState(false)

  async function fetchSuggestions() {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryFilter) params.set("category", categoryFilter)
    params.set("limit", "100")
    const res = await fetch(`/api/suggestions?${params}`)
    if (res.ok) setSuggestions(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter])

  async function handlePost() {
    if (!message.trim()) return
    setPosting(true)
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, category }),
    })
    if (res.ok) {
      setMessage("")
      setCategory("General")
      fetchSuggestions()
    }
    setPosting(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/suggestions/${id}`, { method: "DELETE" })
    if (res.ok) {
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Suggestion Box</h1>
        <p className="text-sm text-gray-500">
          A logbook for team comments, suggestions, and ideas.
        </p>
      </div>

      {/* New Suggestion Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-gray-400" />
            Post a Suggestion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your comment, suggestion, or idea..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex items-center gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button onClick={handlePost} disabled={posting || !message.trim()} size="sm">
              <Send className="h-4 w-4 mr-1" />
              {posting ? "Posting..." : "Post"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          {suggestions.length} {suggestions.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Suggestions List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            Logbook
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">Loading...</div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              No suggestions yet. Be the first to post one!
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {suggestions.map((s) => (
                <div key={s.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className={categoryColors[s.category] || "bg-gray-100 text-gray-800"}
                    >
                      {s.category}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(s.createdAt).toLocaleString("en-GB")}
                    </span>
                    <span className="ml-auto text-xs text-gray-500">by {s.userName}</span>
                    {userRole === "ADMIN" && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="ml-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
