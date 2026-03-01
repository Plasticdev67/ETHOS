# ETHOS ERP — Changelog

## 2026-03-01 — Replace Classification with Work Streams

### Work Stream Refactor
- Removed old `ProjectClassification` (Normal/Mega/Sub-contract) from all UI filters, forms, badges, and production lanes
- All project categorisation now uses the 5 MME work streams: **Utility**, **Bespoke**, **Community**, **Blast**, **Refurbishment**
- ICU remains as a separate boolean flag for urgent projects
- Production dashboard uses a single production lane instead of Normal/Mega split
- Colour-coded work stream badges across project cards, kanban board, and detail pages
- Updated 16 source files: filters, forms, toolbars, cards, API routes, production utils

### SOP Updates
- Production SOP: replaced classification filter with work stream filter, removed CTO/ITO lane concept
- Projects SOP: replaced classification badges and form fields with work stream equivalents
- Both PDFs regenerated (Production 10 pages, Projects 11 pages)

## 2026-03-01 — Remove Cyberpunk & Sage Themes

### Theme Removal
- Removed Cyberpunk and Sage themes from entire codebase — app is now light-theme only
- Deleted ~630 lines of theme CSS from `globals.css` (Cyberpunk variables, animations, scanlines, graffiti BG; Sage variables, watermark BG)
- Removed Orbitron font (only used by Cyberpunk)
- Simplified `layout-context.tsx` — removed ThemeMode type, theme state, toggleTheme, localStorage theme persistence
- Simplified `header.tsx`, `sidebar.tsx`, `layout-shell.tsx` — removed all isCyber/isSage conditionals, hardcoded light styles
- Simplified `workshop-view.tsx` — removed AppTheme type and appTheme prop threading through 4 sub-components
- Updated System Overview SOP section 6 from "Themes" to "Branding & Visual Design"

### Other
- Rewrote `migrate-smart-po.ts` to use pg.Client directly (same pattern as migrate-enquiries.ts)
- Added ISO 9001 Document Control System to TODO backlog

## 2026-03-01 — SOP Documentation & Docs Page

### SOP PDFs (7 documents)
- **System Overview** (10 pages) — dashboard, navigation, themes, user roles, login, architecture
- **CRM & Quoting** (11 pages) — contacts, opportunities, pipeline, quote builder, approval, project conversion
- **Design Module** (7 pages) — design board, job cards, checklists, GA/BOM workflow, review, handover
- **Production & Workshop** (10 pages) — production board, stages, shopfloor view, dashboard, handover
- **Purchasing** (10 pages) — suppliers, POs, smart PO from BOM, approval, cost variance, RFQ/enquiries
- **Finance** (15 pages) — chart of accounts, journals, ledgers, banking, VAT, fixed assets, reports, year-end
- **Project Management** (11 pages) — lifecycle, products, NCRs, variations, installation, completion, RAG

### Docs Page
- New `/docs` page with card grid layout, module icons, descriptions, and PDF download buttons
- PDFs served as static files from `public/sops/`
- "Docs" link added to sidebar navigation

### Technical
- All PDFs use PX Grotesk brand font, coral MME logo, navy headers/footers, board-quality formatting
- PDFKit `bufferPages` pattern with `switchToPage()` for clean header/footer painting
- 7 generator scripts in `scripts/generate-sop-*.ts` and `scripts/generate-design-sop.ts`

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
