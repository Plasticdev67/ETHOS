import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bankAccountId, transactionIds } = body

    // Build the where clause for unmatched transactions
    const where: Record<string, unknown> = {
      isReconciled: false,
      journalEntryId: null,
    }

    if (bankAccountId) {
      where.bankAccountId = bankAccountId
    }

    if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
      where.id = { in: transactionIds }
    }

    // Fetch unmatched bank transactions
    const transactions = await prisma.bankTransaction.findMany({
      where,
      orderBy: { date: "desc" },
    })

    if (transactions.length === 0) {
      return NextResponse.json({
        matches: [],
        message: "No unmatched transactions found",
      })
    }

    // Fetch all active bank rules, ordered by priority (higher priority first)
    const rules = await prisma.bankRule.findMany({
      where: { isActive: true },
      orderBy: { priority: "desc" },
    })

    if (rules.length === 0) {
      return NextResponse.json({
        matches: [],
        message: "No active bank rules configured",
      })
    }

    const matches: Array<{
      transactionId: string
      transactionDate: string
      transactionDescription: string
      transactionAmount: number
      ruleId: string
      ruleName: string
      suggestedAccountId: string
      suggestedVatCodeId: string | null
      suggestedDescription: string | null
      confidence: number
    }> = []

    for (const txn of transactions) {
      let bestMatch: (typeof matches)[number] | null = null
      let bestConfidence = 0

      for (const rule of rules) {
        let isMatch = false
        let confidence = 0

        // Get the field to match against
        const fieldValue =
          rule.matchField === "reference"
            ? txn.reference || ""
            : txn.description

        const matchValue = rule.matchValue

        // Check match type
        switch (rule.matchType) {
          case "CONTAINS":
            isMatch = fieldValue
              .toLowerCase()
              .includes(matchValue.toLowerCase())
            confidence = isMatch ? 0.7 : 0
            break

          case "EXACT":
            isMatch =
              fieldValue.toLowerCase() === matchValue.toLowerCase()
            confidence = isMatch ? 1.0 : 0
            break

          case "STARTS_WITH":
            isMatch = fieldValue
              .toLowerCase()
              .startsWith(matchValue.toLowerCase())
            confidence = isMatch ? 0.85 : 0
            break

          case "REGEX":
            try {
              const regex = new RegExp(matchValue, "i")
              isMatch = regex.test(fieldValue)
              confidence = isMatch ? 0.8 : 0
            } catch {
              // Invalid regex, skip this rule
              isMatch = false
            }
            break
        }

        // Check flow direction if specified
        if (isMatch && rule.isInflow !== null) {
          const txnIsInflow = Number(txn.amount) > 0
          if (rule.isInflow !== txnIsInflow) {
            isMatch = false
            confidence = 0
          }
        }

        // Boost confidence based on priority
        if (isMatch) {
          confidence = Math.min(confidence + rule.priority * 0.01, 1.0)
          confidence = Math.round(confidence * 100) / 100
        }

        if (isMatch && confidence > bestConfidence) {
          bestConfidence = confidence
          bestMatch = {
            transactionId: txn.id,
            transactionDate: txn.date.toISOString(),
            transactionDescription: txn.description,
            transactionAmount: Number(txn.amount),
            ruleId: rule.id,
            ruleName: rule.name,
            suggestedAccountId: rule.accountId,
            suggestedVatCodeId: rule.vatCodeId,
            suggestedDescription: rule.description,
            confidence,
          }
        }
      }

      if (bestMatch) {
        matches.push(bestMatch)
      }
    }

    // Sort matches by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence)

    return NextResponse.json({
      totalTransactions: transactions.length,
      totalMatched: matches.length,
      totalUnmatched: transactions.length - matches.length,
      matches,
    })
  } catch (error) {
    console.error("Bank rules match error:", error)
    return NextResponse.json(
      { error: "Failed to match bank transactions" },
      { status: 500 }
    )
  }
}
