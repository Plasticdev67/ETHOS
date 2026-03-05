# ETHOS Rollout & Operational Readiness Plan

**Company:** MM Engineered Solutions Ltd
**System:** ETHOS — ERP/Project Management Platform
**Date:** 2026-03-03
**Status:** Pre-rollout planning

---

## 1. Executive Summary

ETHOS manages MME's full project lifecycle: sales enquiry → design → production → installation → close-out. It enforces workflow gates, handover processes, and approval chains that require specific people in specific roles to function. This document defines the human infrastructure, process changes, and rollout sequence needed to make ETHOS adoption successful.

The system is built. The risk is not technology — it's adoption. Without the right people, processes, and discipline, ETHOS becomes another unused tool and the team reverts to Sage, spreadsheets, and email.

---

## 2. System Roles & Accountability

ETHOS has 12 critical workflow gates. Each gate requires a named person with the right permissions to action it. If any seat is empty, that gate becomes a dead zone and work stalls.

### 2.1 Role Map

| Role | ETHOS Function | Gate(s) Controlled | Key Permissions |
|------|---------------|-------------------|-----------------|
| **Sales Owner** | Creates prospects, works CRM pipeline, builds quotes, marks WON | CRM pipeline → Opportunity WON | `crm:create`, `crm:edit`, `quotes:create` |
| **Project Manager** | Converts opportunities to projects, manages full lifecycle (P0→P5), raises POs, manages variations | Opportunity → Project conversion, all lifecycle gates | `projects:create/edit`, `crm:convert`, `purchasing:create`, `variations:create` |
| **Engineering Manager** | Assigns designers, reviews/approves job cards, signs off designs, submits handovers | Design approval chain, design-to-production handover submission | `design:manage`, `design:assign`, `design:signoff`, `design:handover-create` |
| **Production Manager** | Acknowledges handovers (creates production tasks), oversees production board, rejects handovers back to design | Handover acknowledgement (the gate that starts production) | `design:handover-acknowledge`, `production:manage`, `production:inspect` |
| **Production Supervisor(s)** | Moves cards through production stages (CUTTING→DISPATCHED), raises NCRs | Day-to-day production stage progression | `production:manage`, `ncrs:create` |
| **Finance / PO Approver** | Approves purchase orders before issue to suppliers | PO approval gate (DRAFT→APPROVED→SENT) | `purchasing:approve-high`, `finance:edit` |
| **Goods Receiver** | Receipts deliveries against POs, logs quantities and dates | Goods receipt (PO line completion) | `purchasing:edit` |
| **Designer(s)** | Picks up job cards, builds project-specific BOMs, submits work for review | Job card progression (READY→SUBMITTED) | `design:start`, `design:review` |
| **Site Manager** | Updates install progress, creates NCRs, collects SAT evidence | Install phase progression | `projects:edit`, `ncrs:create` |

### 2.2 The Critical Handoff Chain

Every arrow is a gate that needs a human to action it:

```
Sales Owner → Project Manager → Engineering Manager → Production Manager → Site Manager → PM (close-out)
  creates        converts to       assigns designers      acknowledges        installs &      reviews &
  opportunity    project            approves designs       handover            collects SAT    closes
  builds quote   raises POs         submits handover       runs prod board     raises NCRs     final sign-off
  marks WON      manages lifecycle  signs off designs      dispatches
```

**Every gap in this chain breaks the flow.** If the Engineering Manager seat is empty, design work piles up with no approvals and production never starts.

---

## 3. Non-System Roles

These roles don't sit at a specific workflow gate but are essential for the system to function.

### 3.1 ETHOS System Champion

**What they do:**
- Owns the system day-to-day — first call when something is confusing or broken
- Morning check: are all departments updating? Is the production board current? Are POs being receipted? Are handovers flowing?
- Spots when people work around the system (phoning suppliers without a PO, moving to production without a handover) and closes those gaps
- Runs weekly "system health" review — are records accurate? Are projects in the correct stage? Are there orphaned POs or stale cards?
- Feeds back to development what's not working, what's missing, what's confusing
- Trains new starters
- Writes internal SOPs ("this is how we do it in ETHOS")
- Manages the rollout sequence and user acceptance testing

**Who this should be:** Not IT. Not the MD. Someone operational who understands every department — a senior Project Coordinator, an Operations Manager, or a newly created role. Needs 2–3 days/week during rollout, dropping to half a day/week at steady state.

**If this person doesn't exist:** The system rots. Data goes stale. People stop trusting it. Within 3 months they're back on spreadsheets.

### 3.2 Master Data Custodian(s)

**Product Catalogue & BOM Library (Engineering):**
- Maintains standard BOMs in the catalogue — when Sage BOMs change, re-imports and validates
- Adds new product variants (new flood door size) with correct BOM templates
- Updates stock items when suppliers change part numbers or discontinue components
- Reviews BOM accuracy after projects: "we used 30 fixings, BOM said 24 — update the master"

**Customer & Supplier Records (Finance/Procurement):**
- Creates new suppliers/customers in ETHOS with correct account codes matching Sage
- Maintains contact details, payment terms, what-they-supply fields
- Cleans up dormant records (56% of Sage customers have no contact details)

**Nominal Codes & Cost Categories (Finance):**
- Maintains chart of accounts in ETHOS aligned with Sage
- Ensures PO lines are allocated to correct nominals for accurate job costing

### 3.3 Stores / Goods-In Person

**What they do:**
- Every delivery that arrives gets receipted against its PO in ETHOS **on the day it arrives**
- Searches by PO number or supplier delivery note
- Logs quantities received, notes any shorts or damage
- Flags discrepancies ("expected 10, received 8 — 2 short")

**What they need:**
- ETHOS access at the goods-in area (tablet or screen)
- Training on the Goods In interface
- Clear instruction: no delivery goes unreceipted

**If nobody does this:** POs stay in SENT forever. The system doesn't know what's arrived. Job costing is wrong. Supplier invoices can't be matched.

---

## 4. Production: Work Logging & Operations

### 4.1 The Gap Today

The production board tracks **where** a product is (which stage) but not **who is working on it** or **how long they've spent**. Labour is currently invisible in project costs.

### 4.2 Operation-Level Time Tracking

Each product has a routing from Sage BOMs with estimated hours per operation:

| Op | Description | Est. Labour | Labour Ref |
|----|------------|------------|-----------|
| 10 | CUTTING — Cutting & Kitting | 3h 30m | Cutter |
| 20 | WELDING — Fabrication & Welding | 28h 0m | Welder |
| 30 | ASSEMBLY — Assembly | 11h 0m | Assembly |
| 40 | PREPARATION — Surface Prep | varies | Prep |
| 50 | PAINTING — Painting | varies | Painter |
| 60 | PACKING — Packing | varies | Packer |

**Target state:** Shop floor workers log on/off specific operations on specific products. The system captures:
- **Who** worked on it
- **What** operation (CUTTING, WELDING, etc.)
- **How long** (actual hours vs estimated)
- **When** (start/end timestamps)

### 4.3 What This Enables

| Capability | How |
|-----------|-----|
| **Actual vs Estimated hours** | Welder logs 35h against a 28h estimate → 25% over → visible during production, not 3 months later |
| **Labour costing per project** | Actual hours × rate per operation = real labour cost flowing into project P&L |
| **Utilisation** | Of 7.5h working day, how much is productive vs idle/rework/untracked |
| **Live "who's on what"** | Production Manager sees at a glance: Dave on the gate for 2451, 3h in. Sarah idle. |
| **NCR cost attribution** | Rework hours logged against the NCR, not the original work order — true cost of quality failures |
| **Estimating feedback loop** | "Double Flood Doors actually take 32h welding on average, not 28" → better quotes |
| **Queue/wait time visibility** | Product finished cutting at 2pm, welding didn't start until next morning → 18h queue time |

### 4.4 Shop Floor Requirements

- **Touchscreen or tablet** at or near each workstation area — one tap to start, one tap to stop
- **Simplified UI** — not the PM's interface. Big buttons, current job displayed prominently, list of available jobs in queue
- **Start with supervisors logging** if individual operators resist — "Dave and Mike started the gate at 8am, finished at 4pm" still captures the data
- **Production Manager accountable** for ensuring hours are logged daily — checks at end of shift

### 4.5 Adoption Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| "I'm too busy welding to update a computer" | One-tap interface, supervisor can log on behalf |
| Seen as surveillance | Frame as "estimates are wrong, we need data to quote better and protect margins" |
| Nobody checks accuracy | Daily standup using ETHOS board — if hours are missing, they get logged there and then |
| Forgotten at break/end of day | Auto-timeout after shift end; supervisor reconciles next morning |

---

## 5. Process Changes Required

### 5.1 No PO, No Order

**The rule:** Nothing gets ordered from a supplier without a PO in ETHOS first. No phoning suppliers and backdating a PO later.

**Why:** Without this, materials arrive with no PO to receipt against, invoices come in with no matching record, and job costing is fiction.

**How to enforce:**
- MD must back the policy explicitly
- Suppliers are told: "if you don't have a PO number, don't ship"
- Finance refuses to pay invoices without a matching PO
- Emergency POs can be created after the fact but flagged as "retrospective" with mandatory reason

### 5.2 Daily Standups Using ETHOS

**Production:** Start of shift, Production Manager + Supervisors review the production board on screen. What's in each stage? What's the priority? Any blockers? Does the board match reality?

**Purpose:** Forces board accuracy. If a product's been in PAINTING for 3 days but the board says CUTTING, it gets corrected immediately.

**Requirement:** TV/large screen on the shop floor showing the production board (read-only display).

### 5.3 Design Work in ETHOS

**The expectation:** Designers build BOMs in the ETHOS BOM editor, not in Excel spreadsheets. They submit job cards for review through the system, not by telling the Engineering Manager in passing.

**Why:** The BOM data is what generates POs and feeds into project costing. If it's in Excel, none of the downstream automation works.

**Who enforces:** Engineering Manager. If a designer hasn't submitted their card in ETHOS, it doesn't count as done.

### 5.4 Handover is a Formal Event

**Not:** "I'll email you the drawings"
**Instead:** Design Manager submits handover in ETHOS. Production Manager reviews the BOM and design notes. Acknowledges or rejects with reasons. The system creates production tasks automatically.

**Recommended:** 15-minute handover meeting alongside the system action. Walk through the BOM, flag unusual items, discuss lead times on outstanding materials.

### 5.5 Reporting Rhythm

| Frequency | Who | What | ETHOS Module |
|-----------|-----|------|-------------|
| Daily | Production Manager + Supervisors | Production board review, priorities, blockers | Production Board |
| Daily | Stores / Warehouse | Receipt deliveries, flag shorts | Goods In |
| Weekly | PM + Engineering Manager | Design progress, upcoming handovers, BOM status | Design Board, Project Detail |
| Weekly | PM + Finance | PO status, cost position, outstanding invoices | Purchasing, Finance |
| Fortnightly | MD + Directors | Pipeline review, project health, margin summary | Dashboard, Reports |
| Monthly | Full management | Performance review — on-time %, NCR rate, hours accuracy | Reports Module |

---

## 6. Rollout Sequence

Do not go live everywhere at once. Phase the rollout by department, starting with the smallest group and highest motivation.

### Phase 1: CRM + Projects (Week 1–2)
- **Who:** Sales (1–2 people) + Project Managers (1–2 people)
- **What:** Create real prospects, work the pipeline, build quotes, convert to projects
- **Why first:** Smallest group, highest pain (currently trapped between Sage/Excel/email), proves the system works before touching the shop floor
- **Success criteria:** 5+ real opportunities flowing through the CRM, 2+ projects created via conversion

### Phase 2: Design (Week 3–4)
- **Who:** Engineering Manager + Design team (7 people, 2 teams)
- **What:** Assign designers, work job cards, build BOMs in ETHOS, submit for review
- **Key person:** Engineering Manager — they enforce adoption. If they don't use it, designers won't.
- **Start with:** One project going through the full design workflow end-to-end
- **Success criteria:** One complete design handover submitted through the system

### Phase 3: Production (Week 5–6)
- **Who:** Production Manager + Supervisors (2–3 people)
- **What:** Acknowledge handovers, track products through production stages
- **Hardware needed:** Shop floor screen + tablet/PC for supervisor
- **Start with:** Tracking only (no hard gates enforced) — let the team get used to updating the board
- **Then:** Turn on the handover acknowledgement gate
- **Success criteria:** Production board reflects physical reality within 24 hours

### Phase 4: Purchasing + Finance (Week 7–8)
- **Who:** Finance Manager + Accounts (2–3 people)
- **What:** PO approval gates go live, goods receipting starts, "No PO No Order" policy introduced
- **Success criteria:** All POs going through ETHOS, goods receipted on day of arrival

### Phase 5: Install + Close-out (Week 9+)
- **Who:** Site Manager(s) (1–2 people)
- **What:** Update install progress, raise NCRs, collect SAT evidence
- **Last because:** Depends on everything upstream flowing correctly
- **Success criteria:** One project completed end-to-end through ETHOS

---

## 7. Hardware & Infrastructure

| Item | Location | Purpose |
|------|----------|---------|
| Large display screen (TV/monitor) | Shop floor, visible to production team | Read-only production board — real-time visibility |
| Tablet or shared PC | Production manager's desk / near board area | Supervisor updates production cards |
| Tablet or screen | Goods-in area | Receipting deliveries against POs |
| Shop floor touchscreen(s) | Near workstations (future, for work logging) | Workers log on/off operations |

---

## 8. What Kills Adoption (and How to Prevent It)

| Failure Mode | How It Happens | Prevention |
|-------------|---------------|-----------|
| No system champion | Nobody owns ETHOS after go-live. Complaints go nowhere. | Name the champion before Phase 1 starts |
| No enforcement from top | MD doesn't use it or reference it. Team sees it as optional. | MD must reference ETHOS data in management meetings, not spreadsheets |
| Parallel running | People can still do things the old way (quote in Sage, PO by phone, track in Excel) | Set a cutover date per module. After that date, only ETHOS counts. |
| No training | People open ETHOS, get confused, close it, go back to Excel | Per-department training sessions before each phase. 30 mins, hands-on, with their real data. |
| Too much too fast | All departments at once, everyone confused, nobody has time to learn | Phased rollout. Master one department before starting the next. |
| Data quality | Dirty customer/supplier data, wrong BOMs, missing nominal codes | Clean master data before go-live. System champion validates weekly. |
| Shop floor resistance | Production team sees ETHOS as paperwork / surveillance | Start with tracking only (no enforcement). Show value before adding gates. Frame as "better quotes = more work = job security". |
| Engineering Manager bottleneck | Single person controls all design approvals. If they're away, everything stops. | PM-override with audit trail for emergencies (already noted in system design). Consider deputy sign-off. |

---

## 9. Planned System Features Supporting Rollout

These features are in the development backlog and directly support the operational plan above:

| Feature | TODO Reference | Supports |
|---------|---------------|----------|
| BOM review at handover | BOM Access & Per-Line Ordering | Production Manager reviewing materials before acknowledging |
| Per-line material ordering | BOM Access & Per-Line Ordering | Staged purchasing by lead time |
| Standalone Goods In page | Warehouse / Inventory | Warehouse receipting without navigating PO tables |
| GoodsReceipt audit trail | Warehouse / Inventory | Tracking partial deliveries and discrepancies |
| receivedQty bug fix (P0) | Warehouse / Inventory | Accurate receipt tracking |
| Work logging / operations tracking | Production (new) | Shop floor time capture, actual vs estimated, labour costing |
| Project Passport | Project Passport | Contextual handover data, stage gates, comms log |
| Change Orders | Change Management | Formal variation tracking with cost impact |

---

## 10. Success Metrics

After 3 months of full rollout, measure:

| Metric | Target | How to Measure |
|--------|--------|---------------|
| CRM pipeline populated | 100% of live enquiries in ETHOS | Count of active opportunities vs known enquiries |
| Projects created via ETHOS | 100% of new projects | No projects existing only in Sage/Excel |
| Design handovers through system | 100% | All handovers via ETHOS, not email |
| Production board accuracy | Reflects reality within 24h | Spot-check physical vs system weekly |
| POs through ETHOS | 100% of purchase orders | No POs raised outside the system |
| Goods receipted on day of arrival | >90% | Receipt date vs delivery date delta |
| Design hours logged | >80% of designer time | Actual vs available hours per designer |
| Production hours logged (future) | >80% of shop floor time | Actual vs available hours per operator |
