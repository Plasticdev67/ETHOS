# ETHOS MK.1 — Comprehensive Code Audit Report

**Document:** ETHOS-AUDIT-001
**Version:** 1.0
**Date:** 1 March 2026
**Prepared for:** MM Engineered Solutions Ltd
**Classification:** Internal — Confidential

---

## 1. Executive Summary

### Production-Readiness Score: 5.5 / 10

| Category | Score | Assessment |
|----------|-------|------------|
| Architecture | 7/10 | Well-structured App Router layout, clear domain separation |
| Code Quality | 6/10 | Strict TypeScript, clean codebase, but 26 `as any` casts and zero unit tests |
| Data Integrity | 4/10 | Dual numbering systems with race conditions, no status transition validation |
| Security | 3/10 | 92% of API routes have no authentication check |
| Performance | 5/10 | Good loading skeletons, but every page hits the DB fresh on every request |
| Compliance | 4/10 | Audit logging covers only 30% of write operations; NCR workflow incomplete |

### Three Most Critical Risks

1. **SEC-01: 181 of 197 API routes have no server-side authentication.** The entire finance module (60+ routes handling bank transactions, journals, invoices, VAT returns) is completely unprotected. Any authenticated user can perform any financial operation regardless of their role.

2. **DATA-01: Dual number generation systems create collision risk.** Project and quote numbers are generated via two different mechanisms — the safe `getNextSequenceNumber()` and the race-prone `findFirst/orderBy` pattern. The opportunity-to-project conversion uses the unsafe method, meaning concurrent conversions can produce duplicate project numbers.

3. **SEC-02: `setup-sales/route.ts` is an unauthenticated endpoint that creates admin users.** A GET request to `/api/setup-sales` upserts a user with `SALES_DIRECTOR` role and hardcoded password `password123`. No auth required.

### Three Strongest Aspects

1. **Architecture** — Clean Next.js 15 App Router structure with clear domain separation across 33 API route groups. The repository pattern for Prisma type safety is well-implemented and documented.

2. **Design & Production Modules** — These have the best auth coverage, audit logging, and structured workflows of any module. Design handovers, job card state machines, and production task management are well-built.

3. **UI/UX Foundation** — Comprehensive loading skeletons on 17 routes, consistent shadcn/ui component library, proper role-based UI gating via `usePermissions()` hook, and working customer portal.

### Verdict

ETHOS is **not ready for production use as the primary operational system** in its current state. The security gaps in the finance module and the data integrity risks around number generation are the two blocking issues. However, the architectural foundation is sound and the codebase is well-organised — the fixes are mechanical (wiring in existing utilities), not architectural rewrites. With focused hardening work, ETHOS could reach production-ready status.

---

## 2. Scope & Methodology

### 2.1 Project Discovery

| Item | Value |
|------|-------|
| Framework | Next.js 15.5.12, React 19.1.0, TypeScript 5 |
| ORM | Prisma 7.3.0 with PostgreSQL (Supabase) |
| Auth | NextAuth v5 beta 30 |
| TypeScript Strict Mode | Enabled |
| Total API Route Files | 198 |
| Total Page Routes | 40+ |
| Prisma Models | 90+ |
| Prisma Enums | 44 |
| npm Vulnerabilities | 13 (3 high, 9 moderate, 1 low) |
| Test Coverage | Effectively zero (2 smoke-level E2E specs only) |

### npm Audit Results

| Package | Severity | Issue | Fix Available |
|---------|----------|-------|---------------|
| `nodemailer` <=7.0.10 | HIGH | Email domain interpretation conflict + DoS via recursive addressparser | Yes (v8.0.1, breaking) |
| `xlsx` * | HIGH | Prototype pollution + ReDoS | No fix (unmaintained) |
| `qs` 6.7.0-6.14.1 | MODERATE | arrayLimit bypass causing DoS | Yes |

### 2.2 Files Reviewed

Every file in the following directories was systematically reviewed:

- `prisma/schema.prisma` — full schema analysis (2,940+ lines)
- `src/app/api/` — all 198 route handler files
- `src/lib/` — all 15+ utility files
- `src/middleware.ts` — auth middleware
- `src/components/layout/` — sidebar, header, layout shell
- `next.config.ts`, `tsconfig.json`, `package.json` — config files
- `scripts/` — migration and utility scripts
- Representative page files across all modules

---

## 3. Detailed Findings

### 3a. Architecture & Environment

**Overall: 7/10** — Sound structure with some configuration issues.

**Strengths:**
- Clean App Router layout with 33 API route groups matching business domains
- Path alias `@/` for imports, consistent file organisation
- Repository pattern established in `src/lib/repositories/` for Prisma type safety
- Shared utilities (`api-auth.ts`, `api-validation.ts`, `api-utils.ts`) exist and are well-designed
- PDFKit correctly externalised via `serverExternalPackages`
- Lucide icons optimised via `optimizePackageImports`

**Issues:**

| ID | Severity | Finding |
|----|----------|---------|
| ARCH-01 | Medium | **Phantom dependencies**: `recharts` (2.5MB) and `xlsx` (1.5MB) are in `package.json` but never imported anywhere in the codebase. `xlsx` also has unpatched HIGH vulnerabilities. |
| ARCH-02 | Medium | **`force-dynamic` + `revalidate` conflict on 22 pages**: Both directives are set, but `force-dynamic` overrides `revalidate`, making it dead code. Every page hit goes directly to the DB. |
| ARCH-03 | Low | **No CI/CD pipeline**: No `.github/workflows/` directory. No automated lint, type check, or test on PR. |
| ARCH-04 | Low | **`nodemailer` vulnerability**: HIGH severity, fix available but breaking (v7 → v8). |

---

### 3b. Code Quality & Maintainability

**Overall: 6/10** — Clean code, strict TypeScript, but no testing and some type safety gaps.

**Strengths:**
- TypeScript `strict: true` enabled
- No commented-out code blocks found
- Consistent error handling pattern across most routes (`try/catch` → `console.error` → `{ error: string }`)
- No dead/orphaned files detected
- Clean import organisation

**Issues:**

| ID | Severity | Finding |
|----|----------|---------|
| CQ-01 | High | **Zero unit/integration tests.** No `.test.ts` files exist. No `test` script in `package.json`. Only 2 Playwright E2E smoke specs that check "page loads". No business logic, workflow, or regression testing. |
| CQ-02 | Medium | **26 `as any` casts** across catalogue module routes — all to bypass Prisma type depth on `ProductFamily`, `ProductType`, `ProductVariant`, `BaseBomItem`. |
| CQ-03 | Medium | **1 `@ts-nocheck`** on `catalogue/seed/route.ts`. |
| CQ-04 | Medium | **16 `react-hooks/exhaustive-deps` suppressions** across finance pages — risk of stale closure bugs. |
| CQ-05 | Medium | **22 routes with no try/catch**, including write operations: `projects/[id]/activate-design`, `products/[id]/status`, `design/bom/[designCardId]` (POST/PATCH/DELETE). |
| CQ-06 | Low | **Unstructured logging** — all errors via `console.error()` with no log levels, correlation IDs, or structured JSON output. |
| CQ-07 | Low | **NCR cost recalculation duplicated** 3 times across `ncrs/route.ts` and `ncrs/[id]/route.ts`. Should be extracted to a shared function. |

---

### 3c. Data Integrity & Functional Accuracy

**Overall: 4/10** — Serious concerns around number generation, decimal handling, and state management.

#### Number/Sequence Generation

| ID | Severity | Finding |
|----|----------|---------|
| DATA-01 | Critical | **Dual project number generation.** `api/projects/route.ts` uses safe `getNextSequenceNumber("project")`. But `api/opportunities/[id]/convert/route.ts` uses `findFirst(orderBy: desc) + 1` — a race condition that can produce duplicate numbers. These two systems will collide. |
| DATA-02 | Critical | **Dual quote number generation.** Same issue — `api/quotes/route.ts` uses safe sequences, but `api/opportunities/[id]/convert/route.ts` uses `findFirst + 1`. |
| DATA-03 | Critical | **Dual journal number generation.** `api/finance/journals/route.ts` uses safe `getNextSequenceNumber("journal")`, but `src/lib/finance/auto-journal.ts` has its own `getNextJournalNumber()` using `findFirst + 1`. Concurrent invoice posts will produce duplicate journal numbers. |
| DATA-04 | High | **Opportunity quote numbers** (`api/opportunities/[id]/quote/route.ts`) use `findFirst + 1` with no sequence counter. Race-prone. |

#### Decimal/Money Handling

| ID | Severity | Finding |
|----|----------|---------|
| DATA-05 | High | **`toDecimal()` converts through `Number()` first**, losing IEEE 754 precision before wrapping in `Prisma.Decimal`. Should use `new Prisma.Decimal(String(value))`. |
| DATA-06 | High | **109 route files use `parseFloat()` or `Number()` for money.** Only 8 routes use `toDecimal()`. The entire finance module uses `parseFloat` for bank transactions, invoices, journals, budgets, contracts, and fixed assets. |
| DATA-07 | High | **All financial aggregations** (quote totals, PO totals, NCR costs, BOM costs) use `Number()` casting and plain JavaScript arithmetic, not `decimal.js`. Accumulated rounding errors on large contracts could be material. |
| DATA-08 | Medium | **`decimal.js` is installed but only used in 3 files** (finance validation + 2 recurring template pages). Not used in any server-side financial calculation. |

#### Status Transitions

| ID | Severity | Finding |
|----|----------|---------|
| DATA-09 | High | **No server-side status transition validation.** Project PATCH accepts any `projectStatus` value — a project can jump from OPPORTUNITY to COMPLETE, or go backwards from INSTALLATION to DESIGN. Same applies to Quote, PO, and Invoice status fields. |
| DATA-10 | Medium | **Department status route has structured transitions** (`projects/[id]/department-status/route.ts`) but the main project PATCH route bypasses it entirely. |

#### Schema Issues

| ID | Severity | Finding |
|----|----------|---------|
| DATA-11 | High | **`QuoteLine.quoteId` and `PurchaseOrderLine.poId` have no database indexes** despite being the primary join columns. Will cause full table scans as data grows. ~35 additional FK fields also lack indexes. |
| DATA-12 | High | **Project deletion cascade-deletes ALL financial records** (POs, invoices, retentions, variations) via `onDelete: Cascade`. One accidental delete wipes all project financials. Worse: it will fail partway through because `ProjectNote` and `ProcurementEnquiry` have no cascade defined. |
| DATA-13 | Medium | **No soft delete anywhere.** Every delete is permanent. No `isArchived`, `deletedAt`, or `softDelete` fields in the schema. NCRs can be hard-deleted — quality records should be immutable. |
| DATA-14 | Medium | **Prospect delete cascade-deletes all opportunities** and their quote lines with zero guards or confirmation. |

---

### 3d. Security Assessment

**Overall: 3/10** — Critical gaps across the entire API surface.

#### Authentication & Authorisation

| ID | Severity | Finding |
|----|----------|---------|
| SEC-01 | Critical | **181 of 197 routes (92%) have no `requireAuth()` call.** Only 16 routes check authentication server-side. The middleware checks session tokens on `/api/` routes, but individual route-level auth provides defense-in-depth and is absent from nearly all handlers. |
| SEC-02 | Critical | **`api/setup-sales/route.ts`** — Unauthenticated GET endpoint that creates/upserts a user with `SALES_DIRECTOR` role and hardcoded password `password123`. Must be removed immediately. |
| SEC-03 | Critical | **Entire finance module (60+ routes) has ZERO permission checks.** Any authenticated user can create journals, post bank transactions, process VAT returns, run year-end, and modify any financial record. No role-based access control. |
| SEC-04 | Critical | **`api/portal/route.ts`** generates customer portal authentication tokens without requiring authentication. Anyone can create portal access tokens. |
| SEC-05 | High | **Permission checks are inconsistent.** `ncrs/route.ts` requires `ncrs:create` for POST but `ncrs/[id]/route.ts` allows unauthenticated PATCH/DELETE. Same pattern for `variations/`, `opportunities/`, and several design routes. |
| SEC-06 | High | **131 of 133 routes accepting request bodies use raw `request.json()`** with no schema validation. Only `projects/route.ts` and `quotes/route.ts` use `validateBody()`. Zod schemas exist for 8+ models but 6 are unused. |

#### Input Validation Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| Routes with `requireAuth()` | 16 / 197 | 8.1% |
| Routes with `requirePermission()` | 24 / 197 | 12.2% |
| Routes with `validateBody()` | 2 / 197 | 1.0% |
| Routes using raw `request.json()` | 131 / 133 | 98.5% |

#### Protected Routes (Complete List)

| Route | Permission |
|-------|-----------|
| `projects/route.ts` POST | `projects:create` |
| `projects/[id]/route.ts` PATCH/DELETE | `projects:edit` |
| `customers/route.ts` POST | `customers:create` |
| `suppliers/route.ts` POST | `suppliers:create` |
| `quotes/route.ts` POST | `quotes:create` |
| `quotes/[id]/route.ts` PATCH/DELETE | `quotes:edit` |
| `purchase-orders/route.ts` POST | `purchasing:create` |
| `purchase-orders/[id]/route.ts` PATCH/DELETE | `purchasing:edit` |
| `purchase-orders/[id]/approve/route.ts` POST | `purchasing:approve-high` |
| `ncrs/route.ts` POST | `ncrs:create` |
| `variations/route.ts` POST | `variations:create` |
| `opportunities/route.ts` POST | `crm:create` |
| `users/route.ts` POST | `settings:admin` |
| `users/[id]/route.ts` PATCH/DELETE | `settings:admin` |
| `catalogue/spec-fields/route.ts` | `catalogue:edit` |
| `catalogue/bom/route.ts` | `catalogue:edit` |

**Everything else — including the entire finance module — is unprotected.**

---

### 3e. Performance & Reliability

**Overall: 5/10** — Good foundations (loading states, parallel queries), but caching is broken and some pages are extremely heavy.

| ID | Severity | Finding |
|----|----------|---------|
| PERF-01 | High | **Home dashboard fires 22+ Prisma queries per page load** with `force-dynamic`. This is the landing page every user sees on every login. |
| PERF-02 | High | **22 pages have contradictory `force-dynamic` + `revalidate`** — the revalidate is dead code. Every navigation hits the database fresh. For a 22-person company, ISR with `revalidate: 30` would serve nearly all pages. |
| PERF-03 | High | **Reports page fetches entire tables** (all projects, all products, all NCRs, all quotes) for analytics with no pagination or limits. Will degrade as data grows. |
| PERF-04 | Medium | **`/api/planning/aggregated` returns massive payload** (estimated 100KB-500KB+) — builds a 60-day forward scheduling grid for all projects. No caching. |
| PERF-05 | Medium | **`JSON.parse(JSON.stringify(...))` used 57 times** across the codebase to serialize Prisma Decimals/Dates. Creates full memory copies of every dataset. |
| PERF-06 | Medium | **20+ nested routes missing `loading.tsx`** — including `/production/workshop`, `/production/dashboard`, `/finance/job-costing`, `/customers/[id]`, `/quotes/[id]`. |
| PERF-07 | Low | **Several API GET routes use `include` instead of `select`**, returning full model objects (e.g. `projects/[id]/products`, `prospects/`). |

**What's working well:**
- Prisma singleton with pg.Pool connection pooling (max 5, min 0, correct for serverless)
- No N+1 query patterns — consistent use of `Promise.all()` for parallel queries
- 17 top-level loading skeletons covering all major routes
- Lucide and Radix optimised via `optimizePackageImports`
- No Prisma imports in client components

---

### 3f. Compliance & Audit Trails

**Overall: 4/10** — Audit logging exists but covers only a fraction of operations. NCR workflow is incomplete. Financial records lack immutability.

#### Audit Logging Coverage

| Module | Logged Operations | Missing Operations |
|--------|-------------------|--------------------|
| Design | Job card lifecycle, handovers, assignments | Card schedule/deadline changes |
| Production | Task lifecycle, product/project moves | — |
| CRM | Opportunity create/convert | Opportunity update/delete |
| Customers | Delete only | Create, update |
| Variations | Create, update, delete | — |
| **Projects** | Activate design only | **Create, update, delete** |
| **Quotes** | None | **All operations** |
| **Purchase Orders** | None | **All operations** |
| **NCRs** | None | **All operations** |
| **Sales Invoices** | None | **All operations** |
| **Finance (all)** | None | **All operations** |
| **Suppliers** | None | **All operations** |
| **Users** | None | **All operations** |

**Assessment:** ~30% of write operations are audit-logged. The `AccountingAuditLog` model exists in the schema but has zero references in any finance route — it was created and never wired up.

#### NCR Workflow Compliance

| ISO 9001 Expectation | Implemented? | Detail |
|----------------------|-------------|--------|
| Raise & record | Partial | Model captures severity, cost impact, root cause enum |
| Investigation & root cause | No | No investigation text field, no corrective action field |
| Status state machine | No | Any status can be set to any value (OPEN → CLOSED without investigation) |
| Close-out sign-off | No | No `closedById`, `approvedById`, or reviewer field |
| Immutability | No | NCRs can be hard-deleted via DELETE endpoint |
| Audit trail | No | NCR operations are not logged |

#### Financial Immutability

| Document | Can be modified after approval? | Can be deleted? | Audit logged? |
|----------|-------------------------------|-----------------|---------------|
| Quotes | Yes — no status guard on PATCH | Yes — any status | No |
| Sales Invoices | Yes — PAID invoices can be edited | Yes — any status | No |
| Purchase Invoices | Yes — posted invoices can be edited | Partial — only ACC_DRAFT can be deleted | No |
| Journal Entries | No — correct (reverse-only pattern) | N/A — no DELETE handler | No |

**Bright spot:** Journal entries follow correct accounting practice — posted journals cannot be edited, only reversed. This creates a proper audit trail. But neither post nor reverse operations are logged to the `AccountingAuditLog` table.

#### User Accountability

- Only 3 models have `createdById` as a foreign key (Quote, PurchaseOrder, ProcurementEnquiry)
- Several models store `createdBy` as a name string rather than a user ID FK (SalesInvoice, PurchaseInvoice, JournalEntry, Variation)
- No model has `updatedById`
- No GDPR mechanisms (no anonymisation, erasure, export, or consent tracking)

---

## 4. Prioritised Remediation Plan

### P0 — Critical (Fix before production use)

| ID | Area | Finding | Business Impact | Fix | Effort |
|----|------|---------|-----------------|-----|--------|
| SEC-02 | Security | `setup-sales/route.ts` creates admin users without auth | Anyone can create admin accounts | Delete the file | 5 min |
| SEC-03 | Security | Finance module (60+ routes) has zero auth/permission | Any user can manipulate all financial data | Wire `requireAuth()` + `requirePermission('finance:manage')` into all finance routes | M (4-6 hrs) |
| SEC-04 | Security | Portal token generation has no auth | Anyone can create portal access | Add `requireAuth()` to `portal/route.ts` POST | 10 min |
| SEC-01 | Security | 92% of routes lack auth | Middleware provides some protection but no defense-in-depth | Systematic auth pass on all mutative routes (batch by module) | L (8-12 hrs) |
| DATA-01 | Data Integrity | Dual project number generation | Duplicate project numbers on concurrent conversions | Replace `findFirst+1` in `opportunities/[id]/convert` with `getNextSequenceNumber("project")` | S (30 min) |
| DATA-02 | Data Integrity | Dual quote number generation | Duplicate quote numbers | Same fix — use sequence counter in convert route | S (30 min) |
| DATA-03 | Data Integrity | Dual journal number generation in auto-journal.ts | Duplicate journal numbers on concurrent invoice posts | Replace `getNextJournalNumber()` with `getNextSequenceNumber("journal")` | S (30 min) |

### P1 — High (Fix within first month of use)

| ID | Area | Finding | Business Impact | Fix | Effort |
|----|------|---------|-----------------|-----|--------|
| SEC-06 | Security | 131 routes use raw `request.json()` | Malformed data can corrupt database | Wire `validateBody()` + Zod schemas into all POST/PATCH routes | L (10-16 hrs) |
| DATA-05 | Data Integrity | `toDecimal()` loses precision via `Number()` | Penny-level errors on financial values | Change to `new Prisma.Decimal(String(value))` | S (15 min) |
| DATA-06 | Data Integrity | 109 routes use `parseFloat` for money | Floating-point errors across all financial operations | Replace with `toDecimal()` in all finance + monetary routes | M (4-6 hrs) |
| DATA-09 | Data Integrity | No status transition validation | Records can skip/reverse statuses | Add state machine validation to Project, Quote, PO PATCH handlers | M (3-4 hrs) |
| DATA-11 | Data Integrity | Missing indexes on `QuoteLine.quoteId`, `PurchaseOrderLine.poId`, ~35 other FKs | Slow queries as data grows | Add `@@index` declarations to schema, run migration | S (1 hr) |
| DATA-12 | Data Integrity | Project delete cascade-deletes all financials | Accidental delete wipes invoices, POs, NCRs | Add confirmation + soft-delete pattern, or remove hard delete entirely | M (2-3 hrs) |
| COMP-01 | Compliance | Audit logging covers only 30% of writes | Cannot trace who changed what for most operations | Wire `logAudit()` into all POST/PATCH/DELETE handlers | M (4-6 hrs) |
| COMP-02 | Compliance | Finance audit log model exists but never used | Zero accountability on financial operations | Wire `AccountingAuditLog` into all finance routes | M (3-4 hrs) |
| COMP-03 | Compliance | Quotes/invoices can be edited after approval | Financial records lack integrity | Add status guards: if ACCEPTED/PAID → return 403 on PATCH | S (1-2 hrs) |
| COMP-04 | Compliance | NCRs can be hard-deleted | Quality records destroyed | Remove DELETE handler or implement soft-delete | S (30 min) |

### P2 — Medium (Technical debt, fix within quarter)

| ID | Area | Finding | Business Impact | Fix | Effort |
|----|------|---------|-----------------|-----|--------|
| PERF-01 | Performance | Dashboard fires 22+ queries per load | Slow page loads for every user | Remove `force-dynamic`, use `revalidate: 30` | S (30 min) |
| PERF-02 | Performance | 22 pages have broken caching | Every navigation hits DB fresh | Remove `force-dynamic` from non-real-time pages | S (1 hr) |
| PERF-03 | Performance | Reports page fetches entire tables | Will degrade as data grows | Add pagination/limits, consider aggregation queries | M (2-3 hrs) |
| CQ-01 | Code Quality | Zero unit tests | No regression protection | Set up Vitest, start with business-critical logic (BOM calculator, quote calculations, sequences) | L (ongoing) |
| CQ-02 | Code Quality | 26 `as any` + 1 `@ts-nocheck` in catalogue | Type safety bypassed | Migrate to repository delegate pattern (already established) | M (3-4 hrs) |
| ARCH-01 | Architecture | `recharts` and `xlsx` phantom dependencies | Unnecessary bundle/vulnerability surface | Remove from `package.json` | S (5 min) |
| DATA-13 | Data Integrity | No soft-delete pattern | All deletes permanent | Add `isArchived` + `archivedAt` to key models (Project, Quote, PO, Invoice) | M (3-4 hrs) |
| COMP-05 | Compliance | NCR workflow has no investigation/corrective action fields | Cannot demonstrate ISO 9001 compliance | Add fields to schema, enforce via state machine | M (2-3 hrs) |
| DATA-04 | Data Integrity | Opportunity quote numbers use findFirst+1 | Race condition on concurrent submissions | Wire in sequence counter | S (30 min) |

### P3 — Low (Improvements for long-term quality)

| ID | Area | Finding | Business Impact | Fix | Effort |
|----|------|---------|-----------------|-----|--------|
| PERF-05 | Performance | `JSON.parse(JSON.stringify())` used 57 times | Memory overhead on large datasets | Consider superjson or Prisma `toJSON()` | M (2-3 hrs) |
| PERF-06 | Performance | 20+ nested routes missing loading.tsx | No skeleton feedback on slower pages | Add loading.tsx to nested routes | S (1-2 hrs) |
| CQ-06 | Code Quality | Unstructured console.error logging | Hard to debug in production | Consider pino or structured logging adapter | M (2-3 hrs) |
| ARCH-03 | Architecture | No CI/CD pipeline | No automated quality gates | Add GitHub Actions for lint + typecheck + test on PR | M (1-2 hrs) |
| ARCH-04 | Architecture | nodemailer HIGH vulnerability | Potential email security issue | Upgrade to nodemailer v8 (breaking changes) | S (1 hr) |
| COMP-06 | Compliance | No GDPR mechanisms | Cannot process data subject requests | Add anonymisation + export endpoints | L (4-6 hrs) |
| COMP-07 | Compliance | Most models lack createdById/updatedById FKs | Cannot reliably trace changes to specific users | Add FK fields to key models | M (2-3 hrs) |

---

## 5. Conclusion

### Production-Readiness Verdict: **Ready with Caveats**

ETHOS has a solid architectural foundation but is not safe for production as-is due to security and data integrity gaps. The P0 items (7 findings) must be addressed before go-live. The P1 items (10 findings) should be addressed within the first month.

### Score Card

| Category | Score |
|----------|-------|
| Architecture | 7 / 10 |
| Code Quality | 6 / 10 |
| Data Integrity | 4 / 10 |
| Security | 3 / 10 |
| Performance | 5 / 10 |
| Compliance | 4 / 10 |
| **Overall** | **5.5 / 10** |

### Single Most Important Fix Before Go-Live

**Delete `api/setup-sales/route.ts` and wire `requireAuth()` + `requirePermission()` into all finance module routes.** This closes the two widest security gaps with a single focused effort (half a day of work).

### Recommended Remediation Sequence

1. **Immediate (Day 1):** Delete `setup-sales/route.ts`. Add auth to portal token creation. Add auth to finance routes.
2. **Week 1:** Fix all dual number generation systems. Fix `toDecimal()` precision. Add status transition validation. Add missing DB indexes.
3. **Week 2:** Replace `parseFloat` with `toDecimal()` across finance routes. Wire audit logging into all write operations. Add financial immutability guards.
4. **Week 3:** Input validation pass — wire Zod schemas into all POST/PATCH routes. Auth pass on remaining unprotected routes.
5. **Week 4:** Fix caching (remove `force-dynamic` from non-real-time pages). Add loading states for nested routes. Remove phantom dependencies.
6. **Ongoing:** Unit test coverage starting with business-critical paths. NCR workflow enhancement. Soft-delete pattern for key entities.

---

*Report prepared by ETHOS Development Team. For questions, contact the technical lead.*

*Document revision history: v1.0 — Initial comprehensive audit — 1 March 2026*
