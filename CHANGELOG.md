# ETHOS ERP — Changelog

## 2026-02-28 — Finance Endpoints, Smart POs, RFQ System, Data Import

### Finance API Endpoints (14 new routes)
- `GET /api/finance/customers` — customer list with search/active filters
- `GET /api/finance/suppliers` — supplier list with search/active filters
- `POST /api/finance/bank/receipts` — record customer payments with auto-journal
- `POST /api/finance/bank/payments` — record supplier payments with auto-journal
- `POST /api/finance/bank/transfers` — inter-bank transfers with auto-journal
- `GET/POST /api/finance/sales-ledger/invoices` — list and create sales invoices
- `GET/PATCH /api/finance/vat-returns/[id]` — VAT return details and status updates
- `POST /api/finance/year-end/preview` — P&L preview by period
- `POST /api/finance/year-end/process` — close period with year-end journal
- `POST /api/finance/fixed-assets/depreciation/run` — run depreciation (straight-line/reducing balance)
- `POST /api/finance/prepayments/process` — process due prepayment releases
- `POST /api/finance/bank-rules/match` — auto-match unreconciled transactions
- `GET /api/finance/documents/sales-invoice/[id]` — generate branded PDF
- `GET /api/finance/documents/purchase-invoice/[id]` — generate branded PDF

### Smart PO Features
- **BOM↔PO linking** — `bomLineId` FK on PurchaseOrderLine tracks which BOM items have been purchased
- **Quick PO from BOM** — one-click "Buy All Unpurchased" groups items by supplier and creates POs
- **BOM procurement status** — badges show purchased/unpurchased status on each BOM line
- **Cost variance alerts** — compares BOM estimates vs actual PO prices, flags >10% differences
- **PO approval workflow** — threshold-based approval with approve/reject endpoints
- **Repeat PO suggestions** — suggests previous suppliers and prices from purchase history
- New API routes: `quick-po`, `bom-status`, `[id]/approve`, `cost-variance`, `suggest-repeat`
- Updated create PO dialog with Quick PO button and BOM status badges

### Procurement Enquiry / RFQ System
- **4 new Prisma models**: ProcurementEnquiry, EnquiryLine, EnquiryResponse, EnquiryResponseLine
- **6 API routes**: CRUD, send enquiry (generates email templates), record responses, side-by-side comparison, award winner (auto-creates PO)
- **3 new pages**: enquiry list (`/purchasing/enquiries`), new enquiry wizard, enquiry detail
- **Workflow**: Select BOM lines → choose suppliers → send enquiry emails → record quotes → compare → award → auto-create PO
- Added "Enquiries" to finance/purchasing navigation

### Data Import Wizards (Sage → ETHOS Migration)
- **Pure TypeScript CSV parser** — handles quoted fields, commas within quotes, no dependencies
- **7-step import wizard** at `/finance/import`: Select Type → Upload CSV → Map Fields → Validate → Preview → Confirm → Complete
- **7 import types**: Customers, Suppliers, Chart of Accounts, Opening Balances, Products, Purchase Orders, Sales Invoices
- **Dry-run mode** — preview what will be imported before committing
- **Downloadable CSV templates** per import type
- **Field mapping UI** with validation and error reporting

### Schema Changes
- Added `bomLineId` (optional FK) to PurchaseOrderLine
- Added `approvalThreshold` (optional Decimal) to PurchaseOrder
- Added `EnquiryStatus` and `EnquiryResponseStatus` enums
- Added 4 new models for procurement enquiries
- Migration scripts: `migrate-smart-po.ts`, `migrate-enquiries.ts`

### Stats
- **34 files changed** (6 modified, 28 new)
- **172 pages** building successfully
- **New API routes**: 14 finance + 5 smart PO + 6 RFQ + 4 import = **29 new endpoints**

---

## 2026-02-28 — PDFKit Vercel Fix

- Fixed Design SOP PDF 500 error on Vercel (`ENOENT: Helvetica.afm`)
- Added `serverExternalPackages: ["pdfkit"]` to `next.config.ts`

---

## 2026-02-27 — Finance Module Phases 2-8

- Finance sub-navigation layout with collapsible sidebar (7 sections)
- Core accounting: chart of accounts, journals, periods, VAT codes, cost centres
- Purchase ledger: purchase invoices, aged creditors, supplier statements
- Sales ledger + construction contracts: NEC/JCT, applications, retention, credit control
- Banking: accounts, transactions, reconciliation, bank rules, pay/receive/transfer
- Tax, fixed assets, depreciation, recurring entries, prepayments, budgets
- Reports: P&L, balance sheet, trial balance, nominal activity, job costing
- Integration hooks: 8 auto-journal functions for zero double-entry
- **68 pages, 52 API routes, 1 layout**

---

## 2026-02-27 — Finance Module Phase 1

- Schema merge: 30 new finance tables, 21 enums
- Extended Customer, Supplier, PO, POLine, SalesInvoice with optional finance fields
- Seed data: 69 chart of accounts, 8 VAT codes, 12 accounting periods, 10 sequences
- Added `decimal.js` for precise financial calculations
- Core utilities: `sequences.ts` (auto-numbering), `validation.ts` (journal validation)
