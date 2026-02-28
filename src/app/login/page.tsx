"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Eye, EyeOff } from "lucide-react"
import { authenticate } from "./actions"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("password", password)
      formData.append("redirectTo", "/")

      const errorMsg = await authenticate(formData)
      if (errorMsg) {
        setError(errorMsg)
        setLoading(false)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Connection error — please try again.")
      setLoading(false)
    }
  }

  async function handleMicrosoftLogin() {
    await signIn("microsoft-entra-id", { callbackUrl: "/" })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: "#23293a" }}
    >
      {/* SVG background pattern — diagonal dashes */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.06 }}>
        <defs>
          <pattern id="dashes" width="16" height="16" patternUnits="userSpaceOnUse"
            patternTransform="rotate(-35)">
            <line x1="0" y1="8" x2="8" y2="8" stroke="#e95445" strokeWidth="1" strokeDasharray="4 4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dashes)" />
      </svg>

      {/* SVG background pattern — dots */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.04 }}>
        <defs>
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="#00b1eb" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,177,235,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-white/10 p-8 space-y-6"
        style={{ backgroundColor: "rgba(30,36,50,0.95)" }}
      >
        {/* MMengineering logo */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mme-logo-coral.svg" alt="MMengineering" className="h-7 w-auto" />
        </div>

        {/* ETHOS title */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-[0.35em] text-white">
            ETHOS
          </h1>
          <div className="mx-auto w-12 h-[2px]" style={{ backgroundColor: "#e95445" }} />
          <p className="text-sm tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>
            Engineer-To-Order Hub
          </p>
        </div>

        {/* Microsoft SSO */}
        <Button
          onClick={handleMicrosoftLogin}
          variant="outline"
          className="w-full h-12 gap-3 border-white/15 hover:border-white/25 font-semibold tracking-wider text-sm uppercase"
          style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#00b1eb" }}
        >
          <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
          </svg>
          Sign in with Microsoft
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
            Or sign in with email
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleCredentialLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs tracking-[0.15em] uppercase"
              style={{ color: "rgba(255,255,255,0.45)" }}>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@mme.co.uk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#00b1eb] focus:ring-[#00b1eb]/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs tracking-[0.15em] uppercase"
              style={{ color: "rgba(255,255,255,0.45)" }}>
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#00b1eb] focus:ring-[#00b1eb]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/15 p-2.5 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 font-semibold tracking-wider text-sm uppercase text-white/90"
            style={{ backgroundColor: "#e95445" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs tracking-[0.2em] uppercase"
          style={{ color: "rgba(255,255,255,0.25)" }}>
          MM Engineered Solutions Ltd
        </p>
      </div>
    </div>
  )
}
