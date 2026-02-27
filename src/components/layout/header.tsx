"use client"

import { Input } from "@/components/ui/input"
import { Search, Bell, LogOut, Zap, Leaf, Minus, Plus, Type } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useLayout } from "./layout-context"

export function Header() {
  const router = useRouter()
  const { data: session } = useSession()
  const { theme, setTheme, fontSize, setFontSize } = useLayout()
  const [searchValue, setSearchValue] = useState("")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearch(value: string) {
    setSearchValue(value)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        router.push(`/projects?search=${encodeURIComponent(value.trim())}`)
      }
    }, 400)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && searchValue.trim()) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      router.push(`/projects?search=${encodeURIComponent(searchValue.trim())}`)
    }
  }

  const userName = session?.user?.name || "User"
  const userRole = (session?.user as { role?: string } | undefined)?.role || "STAFF"
  const initials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-border bg-white/95 px-3 sm:px-4 md:px-6 backdrop-blur">
      <div className="flex items-center gap-4 ml-10 md:ml-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search projects..."
            className="w-40 sm:w-60 md:w-80 pl-9 text-sm"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <span className="hidden md:block text-sm font-medium italic text-gray-400">Health, Wealth and Success!</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => setTheme(theme === "sage" ? "light" : "sage")}
          className={`relative p-2 transition-all font-bold text-xs ${
            theme === "sage"
              ? "bg-[#00B140] text-white hover:bg-[#009935] rounded-md border-2 border-[#008C2E] shadow-[0_2px_8px_rgba(0,177,64,0.4)]"
              : "text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-lg"
          }`}
          title={theme === "sage" ? "Switch to normal mode" : "Activate Sage mode"}
        >
          <Leaf className="h-5 w-5" />
        </button>
        <button
          onClick={() => setTheme(theme === "cyberpunk" ? "light" : "cyberpunk")}
          className={`relative p-2 transition-all font-bold text-xs ${
            theme === "cyberpunk"
              ? "bg-[#1A1A1E] text-[#FCE300] hover:bg-[#333] rounded-none border-2 border-[#FCE300] shadow-[0_0_12px_rgba(252,227,0,0.4)]"
              : "text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-lg"
          }`}
          title={theme === "cyberpunk" ? "Switch to normal mode" : "Activate Cyberpunk mode"}
        >
          <Zap className="h-5 w-5" />
        </button>
        <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-border px-1 py-0.5">
          <button
            onClick={() => setFontSize(fontSize === "large" ? "normal" : "small")}
            className={`p-1 rounded transition-colors ${fontSize === "small" ? "text-gray-300 cursor-default" : "text-gray-400 hover:text-gray-600"}`}
            disabled={fontSize === "small"}
            title="Smaller font"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 text-center text-[10px] font-medium text-gray-500 select-none">
            {fontSize === "small" ? "S" : fontSize === "normal" ? "M" : "L"}
          </span>
          <button
            onClick={() => setFontSize(fontSize === "small" ? "normal" : "large")}
            className={`p-1 rounded transition-colors ${fontSize === "large" ? "text-gray-300 cursor-default" : "text-gray-400 hover:text-gray-600"}`}
            disabled={fontSize === "large"}
            title="Larger font"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500">{userRole.replace(/_/g, " ")}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
