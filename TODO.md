# ETHOS ERP — TODO

## Awaiting Information

### Production Time Logging System
**Status:** Waiting on feedback from Production Manager re: Sage/Sicon workflow
**Sent to team:** 2026-02-28

**Context:** Need to build a multi-worker time logging system for the shop floor (tablets). Current system only supports one timer per task — doesn't handle real scenarios:
- Multiple workers on the same product simultaneously
- Split products being worked on in parallel by different teams
- Workers moving between products on the same job in a shift

**Questions sent to Production Manager:**
1. How do workers log time in Sage/Sicon? (works order / job number / per operation / per item?)
2. What do they scan or select? (job → product → stage hierarchy?)
3. Can multiple people clock onto the same thing at once?
4. How do they handle splits? (half a batch to one team — two entries or one?)
5. What does the booking screen look like? (screenshot of Sage/Sicon screen)
6. What reports come out? (labour efficiency, job costing, variance, timesheet?)
7. What's painful about the current system?

**Design direction (pending confirmation):**
- TimeLog model: who (worker) + what (product + stage) + which job (project) + start/end
- Multiple time logs per task → aggregate up to product stage actuals → project actuals
- Tablet-friendly UI for shop floor workers
- Estimated vs actual monitoring dashboard with variance reporting

---

## In Progress

### Finance Module Integration
**Status:** All 8 phases complete. Full double-entry accounting system live.

**Completed:**
- [x] Phase 1: Schema merge + migration + seed data (commit accdcc2)
  - 30 new finance tables, 21 enums, 69 chart of accounts, 8 VAT codes, 12 periods
  - Extended Customer, Supplier, PO, POLine, SalesInvoice with optional finance fields
  - decimal.js, sequences.ts, validation.ts utilities
- [x] Phase 2: Finance sub-navigation + layout (collapsible sidebar with 7 sections)
- [x] Phase 3: Core accounting (chart of accounts, journals, periods, VAT codes, cost centres)
- [x] Phase 4: Purchase ledger (purchase invoices, aged creditors, supplier statements)
- [x] Phase 5: Sales ledger + construction contracts (NEC/JCT, applications, retention, credit control)
- [x] Phase 6: Banking (accounts, transactions, reconciliation, bank rules, pay/receive/transfer)
- [x] Phase 7: Tax, fixed assets, depreciation, recurring entries, prepayments, budgets, reports (P&L, balance sheet, trial balance, nominal activity, job costing)
- [x] Phase 8: Integration hooks (auto-journal on invoice post, payment, bank transfer, application certified, credit note, year-end)

**Stats:** 52 API routes, 68 pages, 1 layout, 8 auto-journal functions
