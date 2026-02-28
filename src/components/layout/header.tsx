"use client"

import { Input } from "@/components/ui/input"
import { Search, Bell, LogOut, Zap, Leaf, Minus, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useLayout } from "./layout-context"
import { cn } from "@/lib/utils"

export function Header() {
  const router = useRouter()
  const { data: session } = useSession()
  const { theme, setTheme, fontSize, setFontSize } = useLayout()
  const [searchValue, setSearchValue] = useState("")
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isCyber = theme === "cyberpunk"
  const isSage = theme === "sage"
  const isLight = !isCyber && !isSage

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
    <header className={cn(
      "sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between px-3 sm:px-4 md:px-6",
      isLight
        ? "bg-[#23293a] border-b border-[#2d3548]"
        : "border-b border-border bg-white/95 backdrop-blur"
    )}>
      <div className="flex items-center gap-4 ml-10 md:ml-0">
        {/* MMengineering branding — light theme only */}
        {isLight && (
          <div className="hidden md:flex items-center mr-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mme-logo-coral.svg" alt="MMengineering" className="h-5 w-auto" />
          </div>
        )}
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            isLight ? "text-gray-400" : "text-gray-400"
          )} />
          <Input
            placeholder="Search projects..."
            className={cn(
              "w-40 sm:w-60 md:w-80 pl-9 text-sm",
              isLight && "bg-[#2d3548] border-[#3d4560] text-white placeholder:text-gray-400 focus-visible:ring-[#e95445]/30 focus-visible:border-[#e95445]"
            )}
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <span className={cn(
          "hidden md:block text-sm font-medium italic",
          isLight ? "text-gray-400" : "text-gray-400"
        )}>Health, Wealth and Success!</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => setTheme(theme === "sage" ? "light" : "sage")}
          className={`relative p-2 transition-all font-bold text-xs ${
            theme === "sage"
              ? "bg-[#00B140] text-white hover:bg-[#009935] rounded-md border-2 border-[#008C2E] shadow-[0_2px_8px_rgba(0,177,64,0.4)]"
              : isLight
                ? "text-gray-400 hover:bg-[#2d3548] hover:text-white rounded-lg"
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
              : isLight
                ? "text-gray-400 hover:bg-[#2d3548] hover:text-white rounded-lg"
                : "text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-lg"
          }`}
          title={theme === "cyberpunk" ? "Switch to normal mode" : "Activate Cyberpunk mode"}
        >
          <Zap className="h-5 w-5" />
        </button>
        <div className={cn(
          "hidden sm:flex items-center gap-0.5 rounded-lg border px-1 py-0.5",
          isLight ? "border-[#3d4560]" : "border-border"
        )}>
          <button
            onClick={() => setFontSize(fontSize === "large" ? "normal" : "small")}
            className={cn(
              "p-1 rounded transition-colors",
              fontSize === "small"
                ? "text-gray-500 cursor-default"
                : isLight ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"
            )}
            disabled={fontSize === "small"}
            title="Smaller font"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className={cn(
            "w-5 text-center text-[10px] font-medium select-none",
            isLight ? "text-gray-400" : "text-gray-500"
          )}>
            {fontSize === "small" ? "S" : fontSize === "normal" ? "M" : "L"}
          </span>
          <button
            onClick={() => setFontSize(fontSize === "small" ? "normal" : "large")}
            className={cn(
              "p-1 rounded transition-colors",
              fontSize === "large"
                ? "text-gray-500 cursor-default"
                : isLight ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"
            )}
            disabled={fontSize === "large"}
            title="Larger font"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button className={cn(
          "relative rounded-lg p-2",
          isLight ? "text-gray-400 hover:bg-[#2d3548] hover:text-white" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        )}>
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
            isLight ? "bg-[#e95445] text-white" : "bg-blue-100 text-blue-700"
          )}>
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className={cn("text-sm font-medium", isLight ? "text-white" : "text-gray-900")}>{userName}</p>
            <p className={cn("text-xs", isLight ? "text-gray-400" : "text-gray-500")}>{userRole.replace(/_/g, " ")}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "rounded-lg p-2",
            isLight ? "text-gray-400 hover:bg-red-500/20 hover:text-red-400" : "text-gray-400 hover:bg-red-50 hover:text-red-600"
          )}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
