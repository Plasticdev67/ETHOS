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

## Completed

### Finance Module Integration
**Status:** All 8 phases complete. Full double-entry accounting system live.
**Commits:** accdcc2 (Phase 1), b41ce23 (Phases 2-8), f88ca3d (PDFKit fix)

**Completed:**
- [x] Phase 1: Schema merge + migration + seed data
- [x] Phase 2: Finance sub-navigation + layout (collapsible sidebar with 7 sections)
- [x] Phase 3: Core accounting (chart of accounts, journals, periods, VAT codes, cost centres)
- [x] Phase 4: Purchase ledger (purchase invoices, aged creditors, supplier statements)
- [x] Phase 5: Sales ledger + construction contracts (NEC/JCT, applications, retention, credit control)
- [x] Phase 6: Banking (accounts, transactions, reconciliation, bank rules, pay/receive/transfer)
- [x] Phase 7: Tax, fixed assets, depreciation, recurring entries, prepayments, budgets, reports
- [x] Phase 8: Integration hooks (auto-journal on invoice post, payment, bank transfer, etc.)

**Stats:** 66 API routes, 68 pages, 1 layout, 8 auto-journal functions

### Missing Finance API Endpoints — DONE
- [x] 14 missing API routes built (customers, suppliers, bank receipts/payments/transfers, sales invoices, VAT returns, year-end, depreciation, prepayments, bank rules, invoice PDFs)

### Smart PO Features — DONE
- [x] BOM↔PO linking (bomLineId FK on PurchaseOrderLine)
- [x] Quick PO from BOM (auto-groups unpurchased items by supplier)
- [x] Cost variance alerts (BOM estimate vs actual PO price)
- [x] PO approval workflow (threshold-based manager sign-off)
- [x] Repeat PO suggestions (historical purchase data)
- [x] BOM procurement status badges in PO dialog

### Procurement Enquiry / RFQ System — DONE
- [x] 4 new Prisma models (ProcurementEnquiry, EnquiryLine, EnquiryResponse, EnquiryResponseLine)
- [x] 6 API routes (CRUD, send, responses, compare, award)
- [x] 3 pages (list, new wizard, detail with email/compare/award)
- [x] Email template generation per supplier
- [x] Side-by-side quote comparison
- [x] One-click award → auto-create PO

### Data Import Wizards — DONE
- [x] Pure TypeScript CSV parser (no dependencies)
- [x] 7-step import wizard UI (type → upload → map → validate → preview → confirm → complete)
- [x] 7 import types (Customers, Suppliers, Chart of Accounts, Opening Balances, Products, POs, Invoices)
- [x] Dry-run mode, field mapping, validation, downloadable CSV templates

---

## Backlog (Prioritised)

### 1. Docs Page + SOPs
**Priority:** MEDIUM — documentation
- In-app docs page (`/docs`) with download buttons per module
- PDF SOPs: System Overview, CRM & Quoting, Production & Workshop, Purchasing, Finance, Planning, Project Management
- Design SOP already exists (`/api/docs/design-sop`)

### 2. Run Migration Scripts on Supabase
**Priority:** HIGH — new schema changes need deploying
- `scripts/migrate-smart-po.ts` (bomLineId, approval_threshold)
- `scripts/migrate-enquiries.ts` (4 new enquiry tables, enums, indexes, sequence counter)

### 3. Production Time Logging System
**Priority:** PARKED — awaiting feedback from production manager
- See "Awaiting Information" section above
