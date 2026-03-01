"use client"

import { Input } from "@/components/ui/input"
import { Search, Bell, LogOut, Minus, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useLayout } from "./layout-context"

export function Header() {
  const router = useRouter()
  const { data: session } = useSession()
  const { fontSize, setFontSize } = useLayout()
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
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between px-3 sm:px-4 md:px-6 bg-[#23293a] border-b border-[#2d3548]">
      <div className="flex items-center gap-4 ml-10 md:ml-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search projects..."
            className="w-40 sm:w-60 md:w-80 pl-9 text-sm bg-[#2d3548] border-[#3d4560] text-white placeholder:text-gray-400 focus-visible:ring-[#e95445]/30 focus-visible:border-[#e95445]"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden sm:flex items-center gap-0.5 rounded-lg border px-1 py-0.5 border-[#3d4560]">
          <button
            onClick={() => setFontSize(fontSize === "large" ? "normal" : "small")}
            className={`p-1 rounded transition-colors ${fontSize === "small" ? "text-gray-500 cursor-default" : "text-gray-400 hover:text-white"}`}
            disabled={fontSize === "small"}
            title="Smaller font"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 text-center text-[10px] font-medium select-none text-gray-400">
            {fontSize === "small" ? "S" : fontSize === "normal" ? "M" : "L"}
          </span>
          <button
            onClick={() => setFontSize(fontSize === "small" ? "normal" : "large")}
            className={`p-1 rounded transition-colors ${fontSize === "large" ? "text-gray-500 cursor-default" : "text-gray-400 hover:text-white"}`}
            disabled={fontSize === "large"}
            title="Larger font"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-[#2d3548] hover:text-white">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium bg-[#e95445] text-white">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-gray-400">{userRole.replace(/_/g, " ")}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
