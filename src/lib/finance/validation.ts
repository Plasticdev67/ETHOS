import Decimal from 'decimal.js'

export interface JournalLineInput {
  accountId: string
  description?: string
  debit: number | string
  credit: number | string
  vatCodeId?: string
  vatAmount?: number | string
  projectId?: string
  costCentreId?: string
}

export interface JournalValidationResult {
  isValid: boolean
  errors: string[]
  totalDebit: Decimal
  totalCredit: Decimal
}

/**
 * Validates a set of journal lines for double-entry compliance.
 * - Total debits must equal total credits
 * - Each line must have either a debit OR credit (not both, not neither)
 * - Amounts must be positive
 * - At least 2 lines required
 */
export function validateJournalLines(lines: JournalLineInput[]): JournalValidationResult {
  const errors: string[] = []
  let totalDebit = new Decimal(0)
  let totalCredit = new Decimal(0)

  if (lines.length < 2) {
    errors.push('A journal entry must have at least 2 lines')
  }

  lines.forEach((line, index) => {
    const debit = new Decimal(line.debit || 0)
    const credit = new Decimal(line.credit || 0)

    if (debit.isNegative()) {
      errors.push(`Line ${index + 1}: Debit amount cannot be negative`)
    }
    if (credit.isNegative()) {
      errors.push(`Line ${index + 1}: Credit amount cannot be negative`)
    }
    if (debit.greaterThan(0) && credit.greaterThan(0)) {
      errors.push(`Line ${index + 1}: A line cannot have both a debit and credit amount`)
    }
    if (debit.isZero() && credit.isZero()) {
      errors.push(`Line ${index + 1}: A line must have either a debit or credit amount`)
    }
    if (!line.accountId) {
      errors.push(`Line ${index + 1}: Account is required`)
    }

    totalDebit = totalDebit.plus(debit)
    totalCredit = totalCredit.plus(credit)
  })

  if (!totalDebit.equals(totalCredit)) {
    errors.push(
      `Journal is unbalanced: total debits (${totalDebit.toFixed(2)}) \u2260 total credits (${totalCredit.toFixed(2)})`
    )
  }

  if (totalDebit.isZero() && totalCredit.isZero()) {
    errors.push('Journal entry cannot have zero value')
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalDebit,
    totalCredit,
  }
}

/**
 * Validates that an accounting period is open for posting
 */
export function validatePeriodOpen(periodStatus: string): { isValid: boolean; error?: string } {
  if (periodStatus === 'PERIOD_CLOSED') {
    return { isValid: false, error: 'Cannot post to a closed accounting period' }
  }
  if (periodStatus === 'LOCKED') {
    return { isValid: false, error: 'Cannot post to a locked accounting period' }
  }
  return { isValid: true }
}
