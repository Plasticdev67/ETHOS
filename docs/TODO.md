# ETHOS - TODO / Ideas Backlog

This file is where we park discussions, ideas, and planned features to implement later.

---

## Quote System - Feature Backlog
*Identified 2026-02-28*

### Commercial Essentials
- [ ] **Payment terms** — Add field for Net 30, 50% deposit, staged payments etc. Display on PDF.
- [ ] **Valid until date** — Field exists in DB (`validUntil`) but not shown prominently on the quote page. Surface it and auto-calculate 30-day default.
- [ ] **Delivery/lead time** — Add per-line lead time field + overall quote lead time. Manufacturing needs this.
- [ ] **Shipping/freight costs** — Add a distinct line type for delivery/freight so it's separated from product costs.
- [ ] **Assumptions & exclusions** — Add a rich text section for "price excludes foundations, builders work, crane hire" etc. Critical for eng quotes to avoid disputes.

### Engineering Specifics
- [ ] **Drawing references** — Allow linking GA drawings or detail sheet references to individual line items.
- [ ] **Material/finish specs** — BOM exists internally but need a customer-facing spec summary on the quote.
- [ ] **Certifications required** — Checkboxes/tags for CE marking, fire rating, ISO references, etc.
- [ ] **Installation scope** — Add a flag per quote: "Supply Only" vs "Supply & Install" vs "Supply, Install & Commission". Changes pricing logic.
- [ ] **Site survey/travel costs** — Distinct line type so these don't get mixed into product margin calcs.

### Workflow Gaps
- [ ] **Revision change log** — Currently tracks revision number but not *what changed*. Add a diff/notes field when revising.
- [ ] **Quote expiry notifications** — Auto-reminder when validity date is approaching or passed.
- [ ] **Decline reason tracking** — When quote is declined, capture why (price, spec, competitor, timing, project cancelled). Useful for win/loss analysis.
- [ ] **Follow-up scheduling** — Set a reminder date to chase the quote if no response.

### Presentation / PDF
- [ ] **Cost breakdown visibility** — Internal view showing materials vs labour vs overhead split.
- [ ] **Discount tiers** — Volume/quantity discount logic for repeat orders or large quantities.
- [ ] **Cover letter / intro text** — PDF currently just has line items. Add branded header, intro paragraph, T&Cs section.

---

## Project Passport
*Discussed 2026-02-28*

One living record per project. Born at creation, travels through every stage. Each team adds their section. Captures **context** — not ERP data — the why, the watch-outs, the verbal agreements, the site realities.

### Core Concept
- Passport tab on every project page
- Guided prompts per stage (not blank pages)
- Filled in as a byproduct of normal work, not a separate task
- Hard gate at stage transitions — outgoing section must be complete before project advances
- Handover summary required from outgoing team, sign-off from receiving team + PM

### Stage Sections
- **Sales** — project context, client goals, site realities, access constraints, client comms style, commercial sensitivities, verbal agreements, known risks
- **Design** — key decisions and reasoning, critical tolerances, material specifics, fabrication impacts, compromises and why, client approval status
- **Production** — fabrication notes, NCRs/concessions, known issues for install team, delivery plan, deviations from spec
- **Install** — site conditions update, progress, snags, client sign-off, lessons learned
- **Running (all stages)** — comms log (conversations, decisions, commitments), risk register

### How It Gets Filled In
- Prompts appear in context when people are already working (project creation, site survey upload, phone call log, design change, NCR raise)
- Small inputs at the right moments — not a big form at handover
- "Log" button for quick comms entries (who, what was agreed, 10 seconds)
- Design prompted "why?" when they change material/detail/approach — one line captures the gold
- Production NCRs auto-appear in passport, just add "does install need to know?"
- At stage gate: review what you've already entered, add watch items summary, submit

### AI Document Extraction (Phase 2)
- Upload tender pack/client spec → AI extracts: scope, key dates, compliance standards, material specs, constraints. Pre-fills passport. Human reviews and confirms.
- Sub-contract upload → AI extracts: scope boundaries, payment terms, programme dates, LDs, retention, insurance, specific obligations, nominated materials. Flags downstream impacts (e.g. "48-hour notice before site access" → site constraints field).
- Client spec upload → AI extracts: design standards, material grades, coating systems, testing/inspection requirements, documentation deliverables.
- PO/supplier quote upload → AI extracts: lead times, material grades, delivery dates, conditions. Flags if lead time risks the programme.
- Meeting minutes/site notes upload → AI extracts decisions, actions, passport-relevant items → comms log.
- Pattern: document in → AI extracts → passport updated → human reviews and confirms.

### AI Spec Compliance Checking (Phase 3)
- Spec vs BOM: material grade mismatches (spec says S355, BOM says S275 — flagged)
- Spec vs drawing notes: coating system mismatches (spec says HDG 85μm, drawing says 2-pack epoxy — flagged)
- Spec vs sub-contract: dimensional mismatches (max panel height 1800mm, drawing shows 1850mm — flagged)
- Fixings/ancillaries: environment vs material grade (316L required in marine, BOM has 304 — flagged)
- Standards: execution class mismatches (spec says EXC3, drawing says EXC2 — flagged)
- Coating DFT: spec minimum vs drawing paint schedule
- Documentation deliverables: tracks what's been produced vs what's required, flags outstanding items before close-out
- Cross-referencing: e.g. sub-contract says max 7.5t vehicle, dispatch plan has 12m trailer — flags conflict
- Position as "flags for review" not "automated pass/fail" — human judgement stays in the loop

### Implementation Phasing
- **Phase 1 (build now)** — Passport shell + manual entry. Guided prompts, comms log, risk register, gate checks. Pure UI + data model. No AI. Delivers 80% of the value.
- **Phase 2** — AI document extraction. Upload → extract → pre-fill → human confirms. Text-based documents (PDFs, Word, emails) work well with current LLMs.
- **Phase 3** — Spec compliance checking. Text-vs-text first (specs vs BOMs/schedules). Drawing interpretation (vision AI) is harder — start with title block/notes extraction. Geometry interpretation is frontier.

### Change Management & Cost Control
*Added 2026-02-28 — key Sage gap identified*

The passport captures context. Change orders capture commercial impact. They link together.

**The problem:** Client requests a change mid-project (e.g. "opening 200mm wider"). It cascades — design rework, material scrap, production rescheduling, cost impact. Currently managed through phone calls, emails, spreadsheets. Nobody can see the total cost impact until it's too late. Margin erosion is invisible. Projects sit at "95%" for months with untracked absorbed costs.

**Change Orders as first-class objects:**
- **What changed** — description, affected drawings/items, before vs after
- **Why** — client request, design development, site condition, error correction
- **Who requested** — client, PM, Design, Production, Install
- **Classification** — Client Variation (chargeable), Internal Change (MME cost), Contract Ambiguity (negotiate)
- **Impact assessment** — design hours, material cost delta (scrap + new), production impact (rework hours, schedule delay), programme impact (does this push install?)
- **Approval chain** — PM approves change, Commercial approves cost, client approves if chargeable
- **Status** — Raised → Under Review → Approved → Implemented → Invoiced (or Rejected)

**Live cost position per project:**
- Original contract value (what the quote said)
- Approved variations (client-chargeable, agreed and priced)
- Pending variations (raised, not yet agreed with client)
- Internal changes (MME-absorbed — errors, design development, unforeseen)
- Current project value (original + approved variations)
- True cost position (are we making or losing money *right now*)

**Passport integration:**
- Passport logs the *why* ("client called, east wall has 15mm bow")
- Change order tracks the *cost* ("redesign brackets: 8 design hrs, £400 material, 2 days delay")
- At stage gate: all change orders must be in resolved state (approved/rejected/invoiced — not hanging)
- Cost impact assessed and approved before handover
- Client-chargeable variations communicated to client before project advances

**Keep it lightweight:**
- Quick raise: what changed, why, who asked, rough cost — 60 seconds
- Detailed assessment follows later (Design/Commercial add the numbers)
- Dashboard view: all changes, total cost impact, approved vs pending vs unresolved

### Operational Requirements (Living Record)
*Added 2026-02-28 — addresses the core Sage gap*

The passport isn't just a handover document. It's the **living operational record** — what this project needs *right now*, not what the quote said 3 months ago.

**Quote → Project auto-population:**
- When a quote converts to a project, passport auto-populates from quote data (product specs, client details, commercial terms, anything structured)
- PM adds operational context on top — the stuff not in the quote
- Reduces manual re-entry (key Sage pain point: project requirements don't flow from quote)

**Ongoing updates:**
- PM updates operational requirements as things change (scope, timeline, access, client requirements)
- Each update is timestamped and visible — creates a trail
- "You just changed the install date — what's the reason?" One line prompt.
- Prevents the "95% for 3 months" surprise — changes are visible as they happen, not discovered in monthly reports

### Design Considerations
- Gate logic needs an escape valve: PM override with logged reason for urgent situations (e.g. Design lead on holiday). Creates audit trail of skipped gates.
- Drawing checks should be advisory flags, not hard gates — vision AI not reliable enough yet for pass/fail on engineering drawings.
- Build Phase 1, ship it, learn what fields actually get used. Real-world usage informs what to automate in Phase 2.

---

## Warehouse / Inventory
*Identified 2026-03-01 — feedback from Geraint Morgan during team demo*

### Goods Receipting (standalone view)
- [ ] **Dedicated "Goods In" page** — warehouse-friendly screen to receipt deliveries. Search by PO number or supplier delivery note, see all outstanding lines, tick off received quantities.
- [ ] Current goods receipting exists inside PO row expansion (Purchasing page) but is buried and not discoverable for warehouse users.
- [ ] Consider barcode/QR scanning for PO lookup (future enhancement).

### Stock Levels & Locations
- [ ] **Inventory module** — new models: `StockItem`, `StockLocation`, `StockMovement`. Track on-hand quantities by warehouse location.
- [ ] Link stock movements to goods receipting (PO receipt creates inbound movement) and production (issuing materials creates outbound movement).
- [ ] Stock level dashboard — what's on hand, where it is, what's allocated to projects.
- [ ] Currently no inventory model exists in the schema — Sage import brings catalogue items with pricing but not stock quantities.

---

## API Hardening (Code Review Follow-up)
*Identified 2026-03-01 — from code review scoring 6/10*

### Auth + Validation + toDecimal on API routes
Many mutative routes are missing `requireAuth()`, `requirePermission()`, `validateBody()`, and use `parseFloat` instead of `toDecimal()`. Rules now in CLAUDE.md — apply to all new routes going forward.

**Done:**
- [x] `api/projects/route.ts` POST — auth + validation + toDecimal + concurrency-safe numbering
- [x] `api/catalogue/spec-fields/route.ts` — auth + permission on all handlers
- [x] `api/catalogue/bom/route.ts` — rewired to repository pattern

**Still needed (priority routes):**
- [ ] `api/projects/[id]/route.ts` PATCH/DELETE — auth + permission
- [ ] `api/quotes/route.ts` POST — auth + validation + concurrency-safe numbering
- [ ] `api/quotes/[id]/route.ts` PATCH/DELETE — auth + permission
- [ ] `api/purchase-orders/route.ts` POST — auth + validation + toDecimal
- [ ] `api/purchase-orders/[id]/route.ts` PATCH/DELETE — auth + permission
- [ ] `api/purchase-orders/[id]/approve/route.ts` POST — auth + permission
- [ ] `api/purchase-orders/[id]/receive/route.ts` POST — auth + permission
- [ ] `api/users/route.ts` POST — auth + permission (`team:manage`)
- [ ] `api/users/[id]/route.ts` PUT/DELETE — auth + permission
- [ ] `api/customers/route.ts` POST — auth + validation
- [ ] `api/suppliers/route.ts` POST — auth + validation
- [ ] `api/opportunities/route.ts` POST — auth + validation + toDecimal
- [ ] `api/variations/route.ts` POST — auth + validation + toDecimal
- [ ] `api/ncrs/route.ts` POST — auth + validation + toDecimal

### Fix quoteCreateSchema
- [ ] Current Zod schema expects `projectId` (required) + `revision`, but the route actually uses `customerId`, `subject`, `notes`, `createdById`. Schema needs to match reality.

---

## Technical Debt
*Identified 2026-03-01*

- [ ] **Remove `as any` casts** — catalogue routes (`families`, `types/[id]`, `variants/[id]`, `propagate-prices`, `sync-from-sage`, `seed`) use `as any` to bypass Prisma type depth. Replace with typed repository delegates.
- [ ] **Remove `@ts-nocheck`** on `catalogue/seed/route.ts` — replace with repository pattern.
- [ ] **Quote number concurrency** — `api/quotes/route.ts` uses `findFirst(orderBy desc) + 1` pattern, same race condition that was fixed for projects. Wire in `getNextSequenceNumber('quote')`.

---

## Mobile / Responsiveness
*Identified 2026-03-01*

- [x] **Sidebar scroll lock** — body scroll locks when mobile sidebar is open (`useEffect` on `mobileOpen`). `overscroll-behavior: contain` on mobile aside. `flex flex-col` for scroll containment. Verified in code 2026-03-01.
- [ ] **General mobile audit** — quick pass through main pages on 375px viewport. Kanban boards use horizontal scroll (intentional). Check forms, tables, modals don't overflow.

---

## Architecture Notes
*Identified 2026-02-28*

- [ ] Review scheduling views (aggregated vs shopfloor) for potential consolidation.
- [ ] **Configurator schema redesign** — remove SpecBomModifier and SpecDependency models. Different materials = different ProductVariants with their own BOMs. Eliminates deepest Prisma type recursion chain. (Identified 2026-03-01)

---

## Completed
- [x] Migrated database from Neon to Supabase (2026-02-28)
- [x] Moved repo to Plasticdev67/ETHOS (2026-02-28)
- [x] Replaced messy priority alerts banner with ICU carousel (2026-02-28)
- [x] Removed dead redirect pages /board and /tracker (2026-02-28)
