"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type FontSize = "small" | "normal" | "large"

type LayoutContextType = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}

const LayoutContext = createContext<LayoutContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
  fontSize: "normal",
  setFontSize: () => {},
})

export function useLayout() {
  return useContext(LayoutContext)
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [fontSize, setFontSize] = useState<FontSize>("normal")

  // Load font size from localStorage on mount
  useEffect(() => {
    const savedSize = localStorage.getItem("ethos-font-size") as FontSize | null
    if (savedSize === "small" || savedSize === "large") {
      setFontSize(savedSize)
    }
  }, [])

  // Apply font size class to <html> and persist
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove("font-small", "font-large")
    if (fontSize === "small") html.classList.add("font-small")
    else if (fontSize === "large") html.classList.add("font-large")
    localStorage.setItem("ethos-font-size", fontSize)
  }, [fontSize])

  return (
    <LayoutContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed: () => setCollapsed(!collapsed),
        fontSize,
        setFontSize,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}
