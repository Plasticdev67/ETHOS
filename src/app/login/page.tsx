"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Eye, EyeOff } from "lucide-react"
import { authenticate } from "./actions"

function MMEChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 40" fill="none" className={className}>
      <path d="M4 34 L22 6 L40 34" stroke="#5BB8F5" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 34 L22 16 L32 34" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

  const hasMicrosoftSSO = true

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: "url('/login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center 70%",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* MM Engineering logo — inline HTML, no SVG file */}
        <div className="flex items-center justify-center gap-3">
          <MMEChevron className="h-9 w-9" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-white text-xl font-bold tracking-wide">MM</span>
            <span className="text-white/80 text-xl font-light tracking-wide">engineering</span>
          </div>
        </div>

        {/* ETHOS logo — pure CSS text */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-72 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <h1 className="text-6xl font-light tracking-[0.4em] text-white pt-2 drop-shadow-lg">
            ETHOS
          </h1>
          <p className="text-amber-400 text-base font-normal tracking-[0.5em] drop-shadow-md">
            MK.1
          </p>
          <div className="mx-auto w-56 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
          <p className="text-white/70 text-[10px] tracking-[0.3em] font-light pt-1">
            ENGINEER-TO-ORDER HUB OPERATION SYSTEM
          </p>
          <div className="mx-auto w-72 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Microsoft SSO */}
          {hasMicrosoftSSO && (
            <>
              <Button
                onClick={handleMicrosoftLogin}
                variant="outline"
                className="w-full h-11 gap-3 bg-white/90 hover:bg-white text-gray-800 border-white/30"
              >
                <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                Sign in with Microsoft
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-xs text-white/40">or use email</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>
            </>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleCredentialLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@mme.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-sky-400 focus:ring-sky-400/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-sky-400 focus:ring-sky-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/20 p-2.5 text-sm text-red-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-sky-500 hover:bg-sky-400 text-white font-medium"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>

        {/* Mission statement */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-lg font-bold tracking-wide text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            Engineering safe havens<br />for human civilisation
          </p>
          <p className="text-amber-400 text-xs font-semibold tracking-[0.35em] uppercase">
            — MX27 —
          </p>
        </div>

        <p className="text-center text-xs text-white/30">
          Authorised personnel only. All access is logged.
        </p>
      </div>
    </div>
  )
}
