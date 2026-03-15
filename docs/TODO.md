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

## Relabel Variant to BOM Code + Size-Based Pricing
*Discussed 2026-03-03*

### Problem
The configure product wizard shows "Variant" with size-specific names (SFD-900x1200, SFD-900x1500). But MME's products are bespoke — the size is different every time. What users actually need is to pick a **BOM template** (the Sage stock code that carries the base bill of materials), then enter bespoke dimensions. The current variant model already does this — it just has the wrong label and UX.

### The Flow
1. **Family** → Flood Doors
2. **Type** → Standard Flood Door
3. **BOM Code** → SFD-001 (dropdown of available Sage BOMs for this type — loads the template)
4. **Enter dimensions** → bespoke width × height
5. **System scales** BOM quantities from the reference size to the entered dimensions
6. **Design modifies** from there — the auto-populated BOM is a starting point

### Implementation Plan
- [x] **Remove "Double Door" from handing options** — `HANDING_OPTIONS` in `product-config-types.ts` now LH/RH only
- [ ] **Relabel "Variant" to "BOM Code" in UI** — `crm-product-builder.tsx` and `cascading-product-builder.tsx`. Dropdown shows Sage stock code prominently (e.g. `SFD-001 — Standard Flood Door`) instead of size names. The underlying `variantId` FK stays unchanged.
- [ ] **Dimensions always manual** — width/height never pre-filled from the BOM code selection. User always types bespoke dimensions. Remove `defaultWidth`/`defaultHeight` from the dropdown display.
- [ ] **Add `referenceWidth`/`referenceHeight` to ProductType** — the "standard" size for this type used as the scaling baseline. Set during Sage sync.
- [ ] **Add `scalingMethod` to BaseBomItem** — replace boolean `scalesWithSize` with enum: `FIXED`, `SCALES_BY_AREA`, `SCALES_BY_PERIMETER`. Fixed items (hinges, locks) stay constant. Area items (sheet steel, paint) scale by area ratio. Perimeter items (seals, frame sections) scale by perimeter ratio.
- [ ] **Scaling logic in configure endpoint** — `areaRatio = (W×H) / (refW×refH)`, `perimeterRatio = (W+H) / (refW+refH)`. Apply to each BOM item based on scaling method. Show estimated cost.
- [ ] **Update sync-from-sage** — set `referenceWidth`/`referenceHeight` on each ProductType from the median variant dimensions.

### Why This Works
- No schema changes — `ProductVariant` model stays, just relabelled as "BOM Code" in the UI
- All 16 files referencing `variantId` keep working unchanged
- Design BOM auto-populate still works (has a variantId to look up BaseBomItems)
- Sage BOM codes are the anchor — each variant maps to a Sage stock code with a BOM
- Scaling gives accurate estimates for bespoke sizes without needing a variant per size

---

## BOM Access & Per-Line Ordering
*Discussed 2026-03-02*

### The Problem
BOMs are currently only accessible from the Design Board (`/design/bom/[designCardId]`). Production staff can't see what materials are in a product's BOM. At handover, production acknowledges without reviewing the actual BOM. And the Quick PO function exists (`/api/purchase-orders/quick-po`) but is buried inside the Create PO dialog on the Purchasing page — plus it orders everything at once, which doesn't reflect reality (different lead times, staged ordering).

### BOM Review at Production Handover
- [ ] **Read-only BOM summary on handover acknowledgement screen** — production manager sees the full materials list before accepting the handover. Shows: part number, description, qty, supplier, lead time, make/buy flag.
- [ ] **BOM link on production project cards** — tap to see the BOM for that product (read-only). Production needs this while building.

### BOM Access from Project Detail Page
- [ ] **BOM tab on project detail page** — aggregated view of all design card BOMs across all products in the project. Each product's BOM shown as a collapsible section.
- [ ] **Link from each product row** to its BOM editor (for design team) or BOM viewer (for production/PM).

### Per-Line Material Ordering (replaces bulk Quick PO)
- [ ] **Rework Quick PO to accept specific BOM line IDs** — instead of "buy everything unpurchased", accept an array of line IDs. Still groups selected lines by supplier into one PO per supplier. Created POs start as DRAFT.
- [ ] **Per-line "Order" action on BOM view** — each BOM line shows its PO status (Unpurchased / PO-0045 Draft / PO-0045 Approved). Checkbox to select lines, then "Create POs for Selected" button. Lines with no supplier assigned get flagged — can't order until supplier is set.
- [ ] **"Order Materials" button on project detail page** — shortcut to the BOM view filtered to unpurchased buy items, with the selection/ordering interface.
- [ ] **Prompt after handover acknowledgement** — "X buy items need purchasing — review and order?" Links to the BOM ordering view for that project.

### Why Per-Line Not Bulk
- Different materials have different lead times (steel ordered weeks before seals/fixings)
- Some items may not be needed until later production stages
- Long-lead items need ordering at design freeze, short-lead at handover
- Purchasing team needs control over what gets ordered when, not a "buy all" button

---

## Warehouse / Inventory
*Identified 2026-03-01 — feedback from Geraint Morgan during team demo*

### Goods Receipting — Bugs & Improvements
*Reviewed 2026-03-02 — significant issues found in current receive flow*

**Bug fix (P0):**
- [ ] **receivedQty overwrites instead of accumulating** — If you receive 7 items today then 3 tomorrow, the DB shows `receivedQty=3` not `10`. The PO status still calculates correctly (checks final qty >= ordered) but the audit trail of partial receipts is lost. Fix: make receivedQty cumulative (`existing + new`) or introduce a `GoodsReceipt` line model to track each receipt event separately.

**API hardening:**
- [ ] **Validate receivedQty server-side** — UI enforces `max={line.quantity}` but the API accepts any value (negative, NaN, over-receipt). Add Zod validation: positive integer, <= remaining qty.
- [ ] **Check PO status before allowing receipt** — No guard preventing receipt on a CANCELLED or DRAFT PO. Should only allow receipt when status is SENT or PARTIALLY_RECEIVED.

**Standalone Goods In page:**
- [ ] **Dedicated `/goods-in` page** — warehouse-friendly screen. Search by PO number or supplier delivery note. Show all outstanding lines across all POs with expected delivery dates. Tick off received quantities per line without needing to find and expand the right PO.
- [ ] Current goods receipting is buried inside PO row expansion on the Purchasing page — not discoverable for warehouse staff.

**Receipt audit trail:**
- [ ] **GoodsReceipt model** — new model to track each individual receipt event: `{ poLineId, qtyReceived, receivedBy, receivedDate, notes, deliveryNoteRef }`. Multiple receipts per PO line. Replaces the single `receivedQty`/`receivedDate`/`receivedNotes` fields which overwrite on each receipt.
- [ ] **GRN (Goods Receipt Note) number** — auto-generated reference per receipt event for traceability.

**Discrepancy & quality:**
- [ ] **Short/over delivery reporting** — flag when received qty doesn't match expected. "Expected 10, received 8 — 2 short" with reason capture.
- [ ] **Quality hold step** (future) — received goods go to "Inspect" status before being accepted into stock. Not needed immediately but worth designing the model to support it later.

**Barcode/scanning:**
- [ ] Consider barcode/QR scanning for PO lookup on the Goods In page (future enhancement).

### Stock Levels & Locations
- [ ] **Inventory module** — new models: `StockItem`, `StockLocation`, `StockMovement`. Track on-hand quantities by warehouse location.
- [ ] Link stock movements to goods receipting (PO receipt creates inbound movement) and production (issuing materials creates outbound movement).
- [ ] Stock level dashboard — what's on hand, where it is, what's allocated to projects.
- [ ] Currently no inventory model exists in the schema — Sage import brings catalogue items with pricing but not stock quantities.

---

## DXF-Based Drawing Engine for Quote PDFs
*Discussed 2026-03-06 — plan saved at `.claude/plans/cheeky-wiggling-stroustrup.md`*

### Problem
Current quote PDF drawing page uses hand-coded SVG rectangles — looks amateur. Design team draws in Inventor and can export DXF files.

### Approach
- Design team exports DXF per view per product type (front elevation, end view, sections, threshold)
- Engine parses DXF → renders as crisp vector SVG with proper line weights
- **No scaling needed** — sections/threshold/end view are standard per product type, front elevation proportions close enough across sizes
- Dimension text swapped to show quoted values, handing via SVG mirror
- Static views reused as-is, title block generated dynamically

### Status: Waiting on DXF files from design team
- [ ] **Get SFDC5 DXF exports** — front elevation, end view, section-aa, section-bb (no dims, no border, no title block)
- [ ] **Get SFDC5 3D isometric PNG** — clean white background
- [ ] **Phase 1:** DXF → SVG proof of concept (parse one file, render as SVG, validate)
- [ ] **Phase 2:** Multi-view layout + title block + dimension overlay + handing
- [ ] **Phase 3:** PDF integration (replace hand-coded SVGs in quote PDF)
- [ ] **Phase 4:** API route + database integration
- [ ] **Phase 5:** All flood door types (DFD, FG, FGW, Blast)

---

## Design Board — Dual Lane Capacity Planning
*Discussed 2026-03-06*

### Problem
Design team (7 people) works a single queue. Fast workstreams (Utilities/Standard — type approval, repeatable) compete with slow workstreams (Bespoke/Community/Blast — complex, weeks of design). When a big bespoke job lands, all attention goes there. Standard jobs queue up. Production starves. Then bespoke finishes and 15 standard jobs need design yesterday.

### Solution: Two design lanes with dedicated capacity

| Lane | Designers | Workstreams | Target |
|------|-----------|-------------|--------|
| **Standard** | 2-3 fixed | Utilities, Standard CTO | 3-5 jobs/week — steady production feed |
| **Bespoke** | 3-4 fixed | Community, Bespoke, Blast | 1-2 jobs/month |
| **Flex** | 1 | Overflow from either | Buffer capacity |

### Features needed
- [ ] **Two swim lanes on design board** — Standard | Bespoke, auto-assigned by workstream
- [ ] **WIP limits per lane** — maximum jobs in progress, new jobs wait in queue when full
- [ ] **Designer lane assignment** — tag each designer to a lane (with flex designer visible in both)
- [ ] **Production runway metric** — dashboard widget: "X design-complete jobs = Y weeks of production capacity". Green/amber/red thresholds.
- [ ] **Lane pressure alerts** — when production runway drops below threshold, standard lane gets priority, flex designer auto-suggested to move
- [ ] **Capacity planning view** — see both lanes side by side with queue depth, WIP, throughput rate

### Why this works
- Production always has work because the standard lane always has dedicated designers
- Bespoke jobs get focused attention without pulling standard resources
- The flex designer provides buffer for peaks in either lane
- WIP limits prevent overloading — jobs queue instead of creating chaos
- The production runway metric makes the problem visible BEFORE it hits the shop floor

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

## Sage XLSX Import (Replace Old BOM Database Import)
*Planned 2026-03-03*

### Context
MME has fresh Sage 200 exports in 6 XLSX files at `Sage Export/`. These replace the old 22-file CSV structure in `Bom Database/`. The old folder and its import script (`scripts/sage-bom-import.ts`) are obsolete. The existing downstream pipeline stays the same: `SageStockItem` staging tables → `sync-from-sage` → `ProductFamily → ProductType → ProductVariant → BaseBomItem` → `propagate-prices`.

### The 6 Files

| File | What | Rows | Action |
|------|------|------|--------|
| `...Mega.xlsx` | Stock Items (full, 23 cols) | 1,082 | **Import** → `SageStockItem` |
| `...T17_49_43.xlsx` | BOM Headers (ref, desc, version) | 191 | **Import** → `SageBomHeader` |
| `...T18_01_15.xlsx` | BOM Structure (flat parent+child) | 5,514 | **Import** → `SageBomHeader` + `SageBomComponent` |
| `...Suppliers.xlsx` | Supplier accounts | 534 | **Import** → `Supplier` (upsert on accountCode) |
| `...T17_50_18.xlsx` | Customer accounts | 212 | **Import** → `Customer` (upsert on accountCode) |
| `...T17_42_36.xlsx` | Stock Items (slim, 4 cols) | 1,082 | **Skip** — Mega is a superset |

### Implementation Plan
- [ ] **Create `scripts/sage-xlsx-import.ts`** — single script, 5 phases:
  1. Clear staging tables (delete sage_bom_operations, components, headers, stock_items)
  2. Import Stock Items (Mega → SageStockItem) — 23 column mapping including ratings, composition, analysis fields
  3. Import BOM Headers (headers file → SageBomHeader) — headerRef, description, revision
  4. Import BOM Structure (flat file → SageBomHeader + SageBomComponent) — stateful walk: "Bill of Materials" rows set parent, "Component"/"Subassembly" rows create children. Auto-create stub SageStockItem for component codes not in Mega.
  5. Import Customers & Suppliers (upsert on accountCode) — protect manually enriched ETHOS fields (only update if null)
- [ ] **Post-import**: run existing `sync-from-sage` + `propagate-prices` pipeline
- [ ] **Remove old infrastructure**: delete `Bom Database/` folder, `Bom Database/IMPORT_PROMPT.md`, and `scripts/sage-bom-import.ts`
- [ ] **Verify**: stock items on `/bom-library`, customers on `/customers`, suppliers on `/suppliers`, BOM auto-populate on design cards

*Full detailed plan: `C:\Users\JamesMorton\.claude\plans\memoized-waddling-clarke.md`*

---

## Production Work Logging & Operations Tracking
*Planned 2026-03-03*

### The Gap
The production board tracks **where** a product is (which stage) but not **who is working on it** or **how long they've spent**. Labour is currently invisible in project costs.

### Core Feature: Operation-Level Time Tracking
Each product has a routing from Sage BOMs with estimated hours per operation (CUTTING 3.5h, WELDING 28h, ASSEMBLY 11h, etc). Workers log on/off specific operations on specific products. The system captures who, what operation, how long (actual vs estimated), and when.

### Concurrent Multi-Operation Support
**Key requirement:** Multiple workers must be able to log onto **different operations on the same product at the same time**. Parts of a job may be in different work areas simultaneously (e.g. one welder on frame assembly while another preps brackets, or cutting starts on panels while welding continues on the main frame).

### Implementation Plan
- [ ] **WorkLog model** — `{ id, productionCardId, operationId, userId, startTime, endTime, duration, notes }`. Links to production card + operation + user. Supports multiple concurrent open logs on the same card for different operations.
- [ ] **ProductionOperation model** — `{ id, productionCardId, operationCode, description, estimatedHours, sortOrder }`. Auto-created from Sage BOM operations when production tasks are generated at handover. Each operation tracks its own status independently.
- [ ] **Start/Stop API** — `POST /api/production/work-log/start` and `/stop`. Validates: user can only have one active log per operation, but CAN have active logs on multiple operations simultaneously (same or different products).
- [ ] **Shop floor UI** — simplified touchscreen interface. Big buttons, current job displayed prominently, list of available operations in queue. One tap to start, one tap to stop. Show who's currently logged onto each operation.
- [ ] **Dashboard view** — Production Manager sees at a glance: which operations are active on each product, who's working on what, hours logged vs estimated. Live "who's on what" board.
- [ ] **Actual vs Estimated reporting** — compare logged hours against Sage BOM estimated hours per operation. Feed back into estimating ("Double Flood Doors actually take 32h welding, not 28").
- [ ] **Labour costing** — actual hours × rate per operation = real labour cost flowing into project P&L.
- [ ] **NCR cost attribution** — rework hours logged against the NCR, not the original work order. True cost of quality failures.
- [ ] **Auto-timeout** — if a log is still open at shift end, auto-close with a flag for supervisor reconciliation next morning.

### Hardware Requirements
- Touchscreen or tablet at/near each workstation area
- Simplified UI — not the PM's interface
- Start with supervisors logging if individual operators resist

---

## Drawing Register / Vault Lite
*Discussed 2026-03-05*

### The Problem
Designers use Inventor with files on OneDrive/SharePoint. There's no formal tracking of which drawing revision is current, who approved it, or what changed between revisions. GA approval is informal (verbal/email). No way to link drawings to ETHOS projects or reconcile drawing BOMs against design BOMs.

### Core Feature: Drawing Metadata Tracking
ETHOS tracks the **metadata** — not the files themselves. Files stay on OneDrive/SharePoint where they are. ETHOS becomes the single source of truth for "what's the current revision of GA-2401-001, who approved it, and when?"

### Drawing Model
- `drawingNumber` — e.g. "GA-2401-001"
- `title`, `fileType` (GA / DETAIL / FABRICATION / INSTALLATION)
- `revision` — "A", "B", "C"
- `status` — DRAFT → FOR_REVIEW → APPROVED → RELEASED → SUPERSEDED
- `filePath` — OneDrive/SharePoint URL or path
- `productId` + `designCardId` — links to project product and design card
- `approvedBy` / `approvedAt` — approval tracking
- `checkedOutBy` / `checkedOutAt` — soft advisory lock (not file-level)

### Drawing Revision History
- `DrawingRevision` model — audit trail of every revision
- Each revision records: revision letter, change description, file path, who created it, when
- Full history visible on the drawing detail view

### Implementation Plan
- [ ] **Drawing + DrawingRevision models** — schema, API routes (CRUD + status transitions + revision creation)
- [ ] **Drawing register on project detail page** — tab showing all drawings for the project, grouped by product, with status/revision/approval info
- [ ] **Approval workflow** — designer marks "For Review", lead reviews and approves/rejects with comments
- [ ] **GA sign-off integration** — design card "Signed Off" status could require all GAs to be APPROVED
- [ ] **Soft check-out** — shows "James is editing this" advisory, prevents accidental parallel work
- [ ] **Search** — find drawings across all projects by number, description, status, revision

### BOM Reconciliation (Phase 2)
- [ ] **CSV/Excel upload from Inventor** — designer exports parts list from active assembly, uploads to ETHOS
- [ ] **"Compare to Drawing BOM" button** — parses upload, diffs against design BOM, highlights: items in drawing but not in BOM, items in BOM but not in drawing, quantity mismatches
- [ ] **Reconciliation report** — designer reviews differences and can accept/reject each

### What This Does NOT Do
- No file-level version control (OneDrive handles that)
- No Inventor plugin or add-in
- No geometry interpretation or structural analysis
- No hard file locking (check-out is advisory only)

---

## AI Spec Extraction & Compliance Checking
*Discussed 2026-03-05 — expanded from Passport Phase 2/3*

### What AI Can Do Now (Reliably)
**Text-vs-text checking** works well with current LLMs:
- Spec says S355 steel, BOM says S275 — flagged
- Spec says HDG 85μm, paint schedule says 2-pack epoxy — flagged
- Spec says EXC3, drawing notes say EXC2 — flagged
- Sub-contract says max 7.5t vehicle, dispatch plan has 12m trailer — flagged
- Required documentation not yet produced — flagged

**Title block / drawing notes extraction** via vision models:
- Extract drawing number, revision, title, scale, material notes, finish notes from PDF
- Pull parts list / BOM table from a GA drawing PDF
- Read general notes sections
- Feeds Drawing model metadata and BOM reconciliation

### What AI Can Sort-of Do (With Human Review)
- Read dimension annotations from PDF drawings (~80-90% reliable)
- Identify dimensional non-compliance (panel shown at 1850mm vs spec max 1800mm)
- Count items in parts lists
- Identify weld symbols, coating callouts
- Good enough for "flags for review", not automated pass/fail

### What AI Cannot Do (Yet)
- Verify geometric fit (will this assembly fit in the opening?)
- Check structural adequacy
- Interpret complex assembly relationships from 2D drawings
- Reliably read all GD&T or complex weld symbols

### Implementation Phasing

**Step 1 — Spec Extraction (no AI needed for basic version):**
- [ ] Upload client spec PDF to project
- [ ] Manual structured checklist: material grades, coating spec, execution class, testing requirements, documentation deliverables
- [ ] This becomes the compliance checklist for the project
- [ ] Each item tracked as compliant / non-compliant / pending

**Step 2 — AI-Assisted Extraction:**
- [ ] AI reads uploaded spec PDF, extracts key requirements into structured fields
- [ ] Human reviews and confirms/edits extracted data
- [ ] Same structured checklist, just pre-filled by AI instead of manual entry
- [ ] Pattern: document in → AI extracts → human confirms

**Step 3 — Automated Cross-Referencing:**
- [ ] ETHOS compares extracted spec requirements against design BOM (material grades, stock codes)
- [ ] Compares against drawing notes (extracted from PDF title blocks via vision)
- [ ] Compares against documentation tracker (what's been produced vs what's required)
- [ ] Flags mismatches as advisory alerts — "X items need review"
- [ ] Position as "flags for review" not "automated pass/fail" — human judgement stays in the loop

**Step 4 — Drawing Content Review (future):**
- [ ] Upload GA PDF, AI reads dimensions, parts lists, notes
- [ ] Compares against spec requirements
- [ ] "Your drawing shows 1850mm panel height but spec says max 1800mm"
- [ ] Still advisory — vision AI not reliable enough for pass/fail on engineering drawings

### Key Design Principles
- Advisory flags, not hard gates — human review required for all compliance decisions
- Start with text-vs-text (most reliable, highest value)
- Drawing interpretation is supplementary, not primary
- Build Step 1 (manual checklist) first — delivers value with zero AI dependency
- Each step adds intelligence on top of the previous step's data structure

---

## Quality Management & ISO 9001 Compliance
*Discussed 2026-03-05*

### Document Control
- [ ] **Document register** — controlled documents (SOPs, work instructions, inspection forms, quality manual sections) with revision control, approval workflow, review dates. ISO 9001 requires "documented information shall be controlled."
- [ ] **Document review reminders** — auto-flag when a controlled document is due for periodic review (annual, bi-annual). Tracks who reviewed, when, and any changes.
- [ ] **Training matrix** — which staff are trained on which SOPs/procedures. Person + document + date trained + next refresher. ISO 9001 requires evidence of competence.

### Audit & CAPA
- [ ] **Internal audit schedule & findings tracker** — audits planned, conducted, findings logged, corrective actions assigned, closure tracked. ISO 9001 clause 9.2.
- [ ] **CAPA (Corrective/Preventive Actions)** — linked to NCRs, audit findings, customer complaints. Root cause analysis, corrective action, verification of effectiveness. ISO 9001 clause 10.2.
- [ ] **Management review inputs** — auto-generate data ISO 9001 requires: NCR trends, audit results, customer feedback, process performance, supplier performance. Currently compiled manually from Sage + spreadsheets.

### Supplier Performance & Approval
- [ ] **Approved supplier list** — approved for what (steel, surface treatment, fixings), approval date, next review date, conditions. ISO 9001 requires evaluation of external providers.
- [ ] **Supplier scorecards** — auto-calculated from ETHOS data: on-time delivery % (receipt date vs PO expected date), quality (NCRs attributed to supplier), price accuracy (quoted vs invoiced).
- [ ] **Supplier audit schedule** — when last audited, when next due.

---

## EXC3 Traceability & Evidence Management
*Discussed 2026-03-13*

### The Problem
Marc (Production Manager) links evidence to jobs today — welder certs, weld procedure specs (WPS/WPQR), material certs — but dumps them into a folder. The certs exist. The pain is **proving the link**: when an auditor or client asks "show me full traceability for Product X", Marc has to manually prove which cert goes with which product. The folder doesn't prove anything — the linkage is in his head.

The ITP (Inspection & Test Plan) varies by work stream: Utility has a light ITP, Community/Blast have heavy ITPs with full evidence packs.

### What ETHOS Does That a Folder Can't

**1. Product-Level Evidence Register**
- [ ] **Evidence attachments on each product** — not a project folder, attached to the actual product record. "SFD-0045 on Project P-2026-031" → material cert #MC-4521 → welder cert (John Smith, BS EN 9606-1) → WPS-003
- [ ] **Evidence types**: Material certs (mill/test certs with batch, grade, mechanical properties), Welder qualification certs (BS EN 9606), Weld procedure specs (WPS/WPQR), Equipment calibration certs, DFT readings, paint system certs, inspection records, FAT/SAT records

**2. Traceability Chain — System-Enforced Links**
- [ ] **Material batch → PO line → BOM line → Product** — which steel went into which product. Auditor asks, you click the product and see it.
- [ ] **Welder → Production task → Product** — who welded what, when, with what qualification
- [ ] **WPS → Product** — which welding procedure was used on this product
- [ ] **Calibration cert → Equipment → Production task** — what kit was used, was it in calibration at the time

**3. ITP-Driven Evidence Checklist (Work Stream Templates)**
- [ ] **ITP template per work stream** — Utility (light: material certs, DFT readings), Community/Blast (heavy: material certs, welder certs, WPS, calibration, inspection hold points, FAT records, DFT, paint certs)
- [ ] **Per-product checklist generated from template** — each line shows: required / uploaded / missing
- [ ] **Real-time completeness dashboard** — at any point see what evidence is still outstanding before handover. No more discovering missing certs at the last minute.

**4. Completeness Enforcement**
- [ ] **Block dispatch if evidence incomplete** — product can't move to DISPATCHED if required evidence per its ITP is missing. Catches gaps early, not at handover.
- [ ] **Warning at stage transitions** — "3 items still need material certs before this product can move to painting"

**5. One-Click Handover Pack**
- [ ] **Auto-assemble evidence pack** — at project close-out, ETHOS pulls all linked evidence for each product into a structured document: material certs, welder certs, WPS, inspection records, DFT readings, paint certs. Replaces manual O&M pack compilation.
- [ ] **Structured by product** — each product's evidence pack separately identifiable, not one big pile

**6. Welder & Equipment Registers**
- [ ] **Welder register** — qualifications (BS EN 9606-1 etc.), expiry dates, which products they've worked on. Alert when a qualification is expiring. Block assignment to EXC3 work if expired.
- [ ] **Equipment register** — weld kit, DFT gauges, torque wrenches. Calibration dates, next due date. Alert when calibration due. Block use on EXC3 work if out of calibration.

### What Sets ETHOS Apart from a Folder

| Folder Approach | ETHOS Approach |
|---|---|
| Certs exist somewhere near the job | Certs **linked to the specific product** |
| Manual proof of which cert goes where | **System-enforced traceability chain** |
| Discover missing certs at handover | **Real-time completeness dashboard** |
| Assemble handover packs manually | **One-click pack generation** |
| Hope the welder was qualified | **System checks welder cert validity** |
| Hope the kit was calibrated | **System checks calibration status** |

### Implementation Priority
- **Phase 1:** Evidence register on products + ITP checklist per work stream (delivers 80% of value)
- **Phase 2:** Traceability chain links (material → product, welder → product)
- **Phase 3:** Completeness enforcement + dispatch blocking
- **Phase 4:** Welder/equipment registers with expiry alerts
- **Phase 5:** One-click handover pack generation

---

## Product Compliance & Spec Intelligence
*Discussed 2026-03-05*

### Product Certification Matrix
- [ ] **Per-ProductType certification rules** — which standards apply (BS EN 1627 security, PAS 1188 flood, BS 476 fire, EN 1090 structural steelwork). When a product is added to a project, ETHOS auto-shows which certifications are required.
- [ ] **Test evidence register** — per product type, link to fire test reports, flood test evidence, blast test certificates. Auto-attach relevant evidence when quoting. Auto-generate documentation pack when delivering.

### Fire Door Intelligence
- [ ] **Fire-rated component tagging** — tag BOM items as fire-rated. Intumescent seals must be specific type, glazing must match fire rating, ironmongery must be tested to same standard.
- [ ] **Component substitution warnings** — if someone swaps a component on the design BOM, flag if the replacement isn't fire-rated. "You replaced the closer with XYZ — this isn't listed on the fire test evidence."
- [ ] **Fire rating rules engine** — per fire rating level (FD30/FD60/FD90/FD120), define required component types. System validates BOM against rules.

### Material Traceability
- [ ] **Mill cert / 3.1 cert linking** — for EXC3/EXC4 steelwork, link material certificates to specific PO lines, which link to specific products. "Show me the 3.1 cert for the steel in gate 3 on project 2451."
- [ ] **Weld procedure tracking** — which WPS apply to which product types, which welders are qualified to which WPS, expiry dates on qualifications. ISO 3834 / EN 1090 requirement.

---

## Inspection & Test Plans (ITPs)
*Discussed 2026-03-05*

### ITP Templates
- [ ] **ITP template per product type** — standard inspection checkpoints: incoming material inspection, in-process checks (dimensional, weld visual, NDT), final inspection, FAT/SAT. Each checkpoint has accept/reject criteria.
- [ ] **ITP execution during production** — as a product moves through stages, inspectors sign off each checkpoint. Fails create an NCR automatically. ITP becomes the quality record for that product.
- [ ] **Hold/witness points** — some inspections require client or third-party witness. Flag in production schedule: "Client witness required at FAT for gate 3 — notify 5 days in advance."

---

## Handover Documentation & O&M Packs
*Discussed 2026-03-05*

### Auto-Generated Documentation Packs
- [ ] **O&M pack compilation** — at project REVIEW/COMPLETE, ETHOS compiles: product datasheets, test certificates, material certs, installation instructions, maintenance schedules, warranty information, as-built drawings list, ITP records. Currently someone manually assembles these from multiple sources.
- [ ] **Documentation checklist per project** — tracks what's been produced vs what's required (driven by contract requirements in passport). Flags gaps before close-out. "Missing: installation manual for item 3, fire test evidence for item 5."
- [ ] **Progressive tracking** — documents logged throughout the project, not just at the end. As each cert/record is produced, it's ticked off. Close-out shows completion status.

---

## Workflow Improvements
*Discussed 2026-03-05*

### Quote-to-Cash Visibility
- [ ] **End-to-end cost tracking** — Quote → Project → Design BOM (Sage costs) → PO spend → Production labour → Invoice. At any point: "we quoted £45k, spent £38k, invoiced £40k, £2k ahead."
- [ ] **Estimating accuracy feedback** — quoted BOM cost vs design BOM cost vs actual PO spend. Quoted labour hours vs actual logged hours. Per product type trending: "we consistently under-estimate welding on double flood doors by 25%."

### Invoice Matching & Cost Control
- [ ] **Three-way matching** — PO → Goods Receipt → Invoice. Did we order it? Did we receive it? Does the invoice match? Discrepancies flagged automatically. Finance doesn't pay until all three align.

### Client Portal — Live Product Tracking
*Updated 2026-03-13 — every client gets this as standard, full visibility*

Every project gets a client login. The client sees where their products are — production stage, design progress, expected dates, photos, evidence. This is standard for all clients, all work streams. It differentiates MME.

**What the client sees:**

- [ ] **Production stage per product** — "Your double flood gate is in Fabrication." Visual pipeline showing CUTTING → FABRICATION → FITTING → SHOTBLASTING → PAINTING → PACKING → DISPATCHED. Live, updated as products move through the workshop.
- [ ] **Design progress per product** — GA submitted / in review / approved / production drawings complete / design freeze. Client can see where the design is without calling the project team.
- [ ] **Expected dates** — expected dispatch date, expected delivery date, expected install date. Updated by the project team as the programme evolves.
- [ ] **Photos** — production photos of their product at key stages. Workshop takes a photo at fabrication complete, painting complete, packing. Client sees their actual product, not a generic image.
- [ ] **Evidence & documentation** — test certs, inspection records, material certs, DFT readings. As evidence is uploaded to the product in ETHOS, it becomes visible in the portal. Client doesn't need to ask for certs — they're there.
- [ ] **Drawing access** — approved GA drawings viewable/downloadable from the portal. No more emailing PDFs back and forth.

**Notifications:**

- [ ] **Automated status emails** — email to client when their product moves to key stages (enters production, dispatched, ready for install, evidence uploaded). Configurable per project — PM can turn specific notifications on/off.
- [ ] **Dispatch notification** — carrier details, expected arrival date, delivery instructions. Client sees it in the portal and gets an email.

**Access & security:**

- [ ] **Token-based login** — simple link sent to client contact, no password to manage. Token scoped to their project(s) only.
- [ ] **Multi-project view** — clients with multiple projects (e.g. DNO frameworks with 20 sites) see all their projects in one dashboard.
- [ ] **Read-only** — clients cannot edit anything, only view.
- [ ] **Audit trail** — log when clients access the portal and what they view.

**Why this matters:**

- Clients stop calling the project team asking "where's my door?" — they can see for themselves
- Builds trust — transparency on progress, evidence available without asking
- Reduces admin — no manual status update emails, no emailing certs, no chasing photos
- Professional image — most competitors don't offer this. It's a differentiator in tenders.
- For Community/Blast clients with weekly collaboration calls — the portal replaces half the agenda ("where are we with X?"). The information is already there.

### Warranty & Defect Tracking
- [ ] **Warranty register** — products delivered, warranty period, expiry date. When a claim comes in, link to original project, product, BOM, materials, fabricator, installer.
- [ ] **Customer satisfaction tracking** — log feedback per project (formal or informal). ISO 9001 clause 9.1.2.
- [ ] **Defect trending** — across all projects: which product types have the most NCRs? Which failure modes repeat? Which production stage causes most issues? Feeds back into design and estimating.

### Competence & Training Records
- [ ] **Qualification tracking per person** — welder qualifications (EN 1090), NDT operator certs, specific procedure sign-offs. Expiry dates with auto-reminders. "Dave's welder qualification expires in 30 days."
- [ ] **Training evidence** — linked to document register. Auditor asks "show me Dave is qualified to weld to WPS-007" — pull it up in 10 seconds.

---

## Permissions Management UI
*Discussed 2026-03-15*

Currently permissions are hardcoded in `src/lib/permissions.ts` per role (23 roles, each with a fixed set of permission strings). No UI to view or adjust them — any change requires a code edit.

- [ ] **Permissions settings page** — `/settings/permissions` (or tab within `/settings`). Table showing all roles vs all permissions. Admins can see at a glance who can do what.
- [ ] **Editable permissions** — allow MD/Admin to toggle permissions per role without code changes. Store overrides in DB (e.g. `RolePermissionOverride` model) so the hardcoded defaults remain as fallback but can be customised per deployment.
- [ ] **Permission audit log** — track when permissions are changed, by whom, what was added/removed.
- [ ] **Permission groups** — group related permissions (e.g. "Design" = design:manage, design:assign, design:handover-create) for easier bulk assignment.

**Why:** As roles evolve (e.g. no engineering manager currently), the business needs to reassign capabilities without developer involvement. Also useful for onboarding — "what can this person actually do in the system?"

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
