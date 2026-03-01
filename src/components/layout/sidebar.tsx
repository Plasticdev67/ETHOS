"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  UsersRound,
  BookOpen,
  PoundSterling,
  Upload,
  History,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Target,
  PenTool,
  Factory,
  HardHat,
  MessageSquare,
  Database,
  CalendarRange,
  UtensilsCrossed,
  BookOpenCheck,
} from "lucide-react"
import { useLayout } from "./layout-context"
import { useState, useEffect, useRef, useCallback } from "react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "CRM", href: "/crm", icon: Target },
  { name: "Design", href: "/design", icon: PenTool },
  { name: "Production", href: "/production", icon: Factory },
  { name: "Installation", href: "/installation", icon: HardHat },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Purchasing", href: "/purchasing", icon: ShoppingCart },
  { name: "Finance", href: "/finance", icon: PoundSterling },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Catalogue", href: "/catalogue", icon: BookOpen },
  { name: "BOM Library", href: "/bom-library", icon: Database },
  { name: "Team", href: "/team", icon: UsersRound },
  { name: "Capacity", href: "/capacity", icon: Gauge },
  { name: "Planning", href: "/planning", icon: CalendarRange },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Docs", href: "/docs", icon: BookOpenCheck },
  { name: "Audit Trail", href: "/settings/audit", icon: History },
  { name: "Suggestions", href: "/suggestions", icon: MessageSquare },
  { name: "What to Eat", href: "/what-to-eat", icon: UtensilsCrossed },
]

type BadgeCounts = {
  designHandovers: number
  productionIncoming: number
}

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggleCollapsed } = useLayout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [badges, setBadges] = useState<BadgeCounts>({ designHandovers: 0, productionIncoming: 0 })

  // Easter egg: click logo 10 times to activate onion mode (resets on refresh)
  const [onionMode, setOnionMode] = useState(false)
  const [onionDrop, setOnionDrop] = useState(false)
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    clickCountRef.current += 1

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0 }, 3000)

    const threshold = onionMode ? 3 : 10
    if (clickCountRef.current >= threshold) {
      clickCountRef.current = 0
      const newMode = !onionMode
      setOnionMode(newMode)
      if (newMode) {
        setOnionDrop(true)
        setTimeout(() => setOnionDrop(false), 2500)
      }
    }
  }, [onionMode])

  useEffect(() => {
    let mounted = true
    const fetchBadges = async () => {
      try {
        const res = await fetch("/api/badges")
        if (res.ok && mounted) {
          setBadges(await res.json())
        }
      } catch {
        // Silently ignore — badges are non-critical
      }
    }
    fetchBadges()
    const interval = setInterval(fetchBadges, 60000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  const navContent = (
    <>
      {/* Logo */}
      <div className={cn(
        "shrink-0 flex items-center justify-between border-b border-border px-3",
        "h-16 bg-[#23293a]"
      )}>
        {(!collapsed || mobileOpen) ? (
          <div className="flex flex-col items-start cursor-pointer select-none" onClick={handleLogoClick}>
            {onionMode ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onion-201.svg" alt="Onion 201" className="h-12 w-auto drop-shadow-[0_0_8px_rgba(212,168,67,0.5)]" />
              </>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mme-logo-coral.svg" alt="MMengineering" className="h-5 w-auto" />
                <span className="text-[11px] font-bold tracking-[0.25em] text-white/60 mt-1.5">ETHOS</span>
              </>
            )}
          </div>
        ) : (
          <div className="mx-auto flex flex-col items-center cursor-pointer select-none" onClick={handleLogoClick}>
            {onionMode ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onion-201.svg" alt="Onion 201" className="h-8 w-auto" />
              </>
            ) : (
              <>
                <span className="text-[10px] font-light tracking-[3px] text-white/60">E</span>
                <span className="text-[6px] text-[#e95445] tracking-[1px]">MK.1</span>
              </>
            )}
          </div>
        )}
        {/* Mobile close button */}
        <button
          className="md:hidden rounded-lg p-1 text-white/50 hover:bg-white/10"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation — scrollable, shrinks to fit */}
      <nav className="flex flex-col gap-1 p-3 overflow-y-auto flex-1 min-h-0">
        {navigation.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/" || pathname === "/projects"
            : pathname.startsWith(item.href)

          // Badge count per nav item
          const badgeCount =
            item.href === "/design" ? badges.designHandovers :
            item.href === "/production" ? badges.productionIncoming :
            0

          const isFood = item.href === "/what-to-eat"

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isFood
                  ? isActive
                    ? "bg-amber-50 text-amber-700"
                    : "text-amber-600/60 hover:bg-amber-50 hover:text-amber-700"
                  : isActive
                    ? "text-[#e95445] font-semibold border-l-[3px] border-[#e95445] rounded-r-lg rounded-l-none bg-red-50/50"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={collapsed && !mobileOpen ? item.name : undefined}
            >
              <div className="relative shrink-0">
                <item.icon className={cn("h-5 w-5",
                  isFood
                    ? isActive ? "text-amber-600" : "text-amber-400/60"
                    : isActive ? "text-[#e95445]" : "text-gray-400"
                )} />
                {badgeCount > 0 && (collapsed && !mobileOpen) && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-3.5 min-w-3.5 rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                    {badgeCount}
                  </span>
                )}
              </div>
              {(!collapsed || mobileOpen) && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {badgeCount > 0 && (
                    <span className={cn(
                      "flex items-center justify-center h-5 min-w-5 rounded-full px-1.5 text-[10px] font-semibold",
                      "bg-red-100 text-red-700"
                    )}>
                      {badgeCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section: collapse toggle only */}
      <div className="shrink-0 border-t border-border px-3 py-3">
        {/* Collapse toggle — desktop only */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "hidden md:flex w-full items-center justify-center rounded-lg p-2 transition-colors",
            "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className={cn(
          "fixed top-4 left-4 z-50 md:hidden rounded-lg border p-2 shadow-sm",
          "bg-[#23293a] border-[#3d4560]"
        )}
        onClick={() => setMobileOpen(true)}
      >
        <Menu className={cn("h-5 w-5", "text-white")} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-out) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-border bg-white transition-transform duration-200 md:hidden w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-white transition-all duration-200 hidden md:flex md:flex-col",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {navContent}
      </aside>

      {/* Easter egg: falling onion animation */}
      {onionDrop && (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
          <div
            className="absolute left-1/2 -translate-x-1/2 drop-shadow-2xl"
            style={{
              animation: "onionDrop 2.5s ease-in-out forwards",
              top: "-200px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/onion-201.svg" alt="" className="w-48 h-48" />
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes onionDrop {
              0% { top: -200px; opacity: 0; transform: translateX(-50%) rotate(-20deg) scale(0.5); }
              15% { opacity: 1; transform: translateX(-50%) rotate(10deg) scale(1.2); }
              40% { top: 40%; transform: translateX(-50%) rotate(-5deg) scale(1); }
              55% { top: 35%; transform: translateX(-50%) rotate(3deg) scale(1.05); }
              70% { top: 40%; transform: translateX(-50%) rotate(0deg) scale(1); }
              85% { top: 40%; opacity: 1; transform: translateX(-50%) rotate(0deg) scale(1); }
              100% { top: 40%; opacity: 0; transform: translateX(-50%) rotate(0deg) scale(0.8); }
            }
          `}} />
        </div>
      )}
    </>
  )
}
