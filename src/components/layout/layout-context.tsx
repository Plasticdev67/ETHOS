"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type ThemeMode = "light" | "cyberpunk" | "sage"
export type FontSize = "small" | "normal" | "large"

type LayoutContextType = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}

const LayoutContext = createContext<LayoutContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
  fontSize: "normal",
  setFontSize: () => {},
})

export function useLayout() {
  return useContext(LayoutContext)
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>("light")
  const [fontSize, setFontSize] = useState<FontSize>("normal")

  // Load theme + font size from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("ethos-theme") as ThemeMode | null
    if (savedTheme === "cyberpunk" || savedTheme === "sage") {
      setTheme(savedTheme)
    }
    const savedSize = localStorage.getItem("ethos-font-size") as FontSize | null
    if (savedSize === "small" || savedSize === "large") {
      setFontSize(savedSize)
    }
  }, [])

  // Apply theme class to <html> and persist
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove("cyberpunk", "sage")
    document.body.classList.remove("cyberpunk-scanline")

    if (theme === "cyberpunk") {
      html.classList.add("cyberpunk")
      document.body.classList.add("cyberpunk-scanline")
    } else if (theme === "sage") {
      html.classList.add("sage")
    }
    localStorage.setItem("ethos-theme", theme)
  }, [theme])

  // Apply font size class to <html> and persist
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove("font-small", "font-large")
    if (fontSize === "small") html.classList.add("font-small")
    else if (fontSize === "large") html.classList.add("font-large")
    localStorage.setItem("ethos-font-size", fontSize)
  }, [fontSize])

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "cyberpunk" : "light"))
  }

  return (
    <LayoutContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggleCollapsed: () => setCollapsed(!collapsed),
        theme,
        setTheme,
        toggleTheme,
        fontSize,
        setFontSize,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}
