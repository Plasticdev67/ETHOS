"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UtensilsCrossed, Shuffle } from "lucide-react"

const choices = [
  { name: "Wetherspoons", weight: 20, emoji: "🍺", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { name: "Pepe's", weight: 20, emoji: "🍗", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { name: "Morrison's", weight: 20, emoji: "🛒", color: "bg-green-100 text-green-800 border-green-300" },
  { name: "Burgers", weight: 20, emoji: "🍔", color: "bg-red-100 text-red-800 border-red-300" },
  { name: "On the House", weight: 5, emoji: "🏠", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
]

function pickWeighted() {
  const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0)
  let random = Math.random() * totalWeight
  for (const choice of choices) {
    random -= choice.weight
    if (random <= 0) return choice
  }
  return choices[0]
}

export default function WhatToEatPage() {
  const [result, setResult] = useState<typeof choices[0] | null>(null)
  const [spinning, setSpinning] = useState(false)

  function handleSpin() {
    setSpinning(true)
    setResult(null)

    let count = 0
    const interval = setInterval(() => {
      setResult(choices[count % choices.length])
      count++
    }, 80)

    setTimeout(() => {
      clearInterval(interval)
      const winner = pickWeighted()
      setResult(winner)
      setSpinning(false)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">What to Eat?</h1>
        <p className="text-sm text-gray-500">
          Can&apos;t decide? Let the wheel of fate choose for you.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-gray-400" />
            Food Roulette
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            {choices.map((c) => (
              <div
                key={c.name}
                className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  result?.name === c.name && !spinning
                    ? `${c.color} ring-2 ring-offset-1 ring-current scale-105`
                    : result?.name === c.name && spinning
                      ? `${c.color} opacity-80`
                      : "border-gray-200 text-gray-600"
                }`}
              >
                <span className="text-lg">{c.emoji}</span>
                <span className="flex-1">{c.name}</span>
                {c.name === "On the House" && (
                  <span className="text-[10px] text-gray-400 italic">rare</span>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSpin}
            disabled={spinning}
            className="w-full"
            size="lg"
          >
            <Shuffle className={`h-4 w-4 mr-2 ${spinning ? "animate-spin" : ""}`} />
            {spinning ? "Choosing..." : "Pick for me!"}
          </Button>

          {result && !spinning && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-1">You&apos;re going to...</p>
              <p className="text-3xl font-bold text-gray-900">
                {result.emoji} {result.name}
              </p>
              {result.name === "On the House" && (
                <p className="text-xs text-yellow-600 mt-2 font-medium">
                  Lucky you! Someone&apos;s treating today!
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
