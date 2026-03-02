# ETHOS — Project Guide

## What Is ETHOS?
ETHOS is a custom-built ERP/project management system for **MM Engineered Solutions Ltd (MME)** — a specialist manufacturer of flood and blast defence products based in Port Talbot, Wales. It manages the full project lifecycle from sales enquiry through design, production, installation, and close-out.

ETHOS replaces/supplements Sage (accounting) and an Excel project tracker as MME's operational backbone.

## Tech Stack
- **Framework:** Next.js 15.5.12 (App Router)
- **Language:** TypeScript 5, React 19
- **Database:** PostgreSQL on Supabase, via Prisma ORM 7.3
- **Styling:** Tailwind CSS 4 + shadcn/ui (new-york theme, neutral palette)
- **Auth:** NextAuth v5 (beta 30) with Prisma adapter
- **Charts:** Recharts 3.7
- **PDF:** PDFKit 0.17
- **Email:** Nodemailer
- **Icons:** Lucide React
- **DnD:** Hello Pangea

## Quick Start
```bash
cd "c:/Users/JamesMorton/OneDrive - MME (1)/Desktop/ETHOS/Ethos-MK.1-"
npm run dev          # Start dev server (localhost:3000)
npm run build        # Prisma generate + Next.js build
npx prisma studio    # Browse database
```

## Repository
- **GitHub:** Plasticdev67/ETHOS
- **Branch:** main

## Environment
- `.env` in project root — contains Supabase connection strings, AUTH_SECRET
- Prisma client generated to `src/generated/prisma/`

---

## Codebase Structure

```
Ethos-MK.1-/
├── prisma/
│   └── schema.prisma          # 30+ models, 44 enums — THE source of truth
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # 33 API route groups
│   │   ├── page.tsx           # Dashboard (home)
│   │   ├── projects/          # Project management
│   │   ├── design/            # Design module
│   │   ├── production/        # Production tracking
│   │   ├── installation/      # Installation tracking
│   │   ├── crm/               # CRM pipeline (opportunities, quotes)
│   │   ├── quotes/            # Standalone quote management
│   │   ├── customers/         # Customer management
│   │   ├── suppliers/         # Supplier management
│   │   ├── purchasing/        # Purchase orders
│   │   ├── finance/           # Financial reporting
│   │   ├── catalogue/         # Product catalogue
│   │   ├── bom-library/       # Bill of Materials
│   │   ├── capacity/          # Capacity planning
│   │   ├── planning/          # Production planning
│   │   ├── reports/           # Reports & analytics
│   │   ├── team/              # User management
│   │   ├── settings/          # System settings
│   │   ├── portal/            # Customer portal
│   │   ├── import/            # Data import tools
│   │   └── login/             # Authentication
│   ├── components/
│   │   ├── ui/                # 24 shadcn base components
│   │   ├── crm/               # CRM board, quote builder, pipeline
│   │   ├── design/            # Design board, job cards (18 files)
│   │   ├── production/        # Production board, NCRs (16 files)
│   │   ├── projects/          # Project views, forms (16 files)
│   │   ├── dashboard/         # Dashboard widgets, ICU carousel
│   │   ├── finance/           # Invoice & accounting UI
│   │   ├── purchasing/        # PO management
│   │   ├── quotes/            # Quote builder & forms
│   │   ├── layout/            # Header, sidebar, context
│   │   └── [others]/          # customers, suppliers, team, etc.
│   ├── lib/                   # Business logic & utilities (15 files)
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma client instance
│   │   ├── permissions.ts     # Role-based access control
│   │   ├── bom-calculator.ts  # BOM calculation logic
│   │   ├── quote-calculations.ts
│   │   ├── product-config-types.ts  # Product configurator types
│   │   └── [others]
│   ├── hooks/
│   │   └── use-permissions.ts # Permission checking hook
│   ├── generated/prisma/      # Generated Prisma client
│   └── middleware.ts          # Auth middleware
├── scripts/                   # Migration & utility scripts
├── docs/                      # Documentation
├── Bom Database/              # BOM CSV exports from Sage
└── public/                    # Static assets
```

---

## Key Modules

### CRM (Sales Pipeline)
- **Route:** `/crm`
- **Components:** `crm/crm-board.tsx`, `crm/quote-builder.tsx`, `crm/pipeline-board.tsx`
- **Flow:** Prospect → Opportunity → Quote → Won/Lost → Convert to Project
- **Quote classifications:** STANDARD, CTO (Configure to Order), ENGINEER_TO_ORDER (ETO)
- **ETO quotes** require multi-level director approval (planned, not yet implemented)

### Projects
- **Route:** `/projects`, `/projects/[id]`
- **Components:** `projects/board-view.tsx`, `projects/tracker-view.tsx`, `projects/timeline-view.tsx`
- **Statuses:** OPPORTUNITY → QUOTATION → DESIGN → DESIGN_FREEZE → MANUFACTURE → INSTALLATION → REVIEW → COMPLETE
- **Lifecycle gates:** P0 → P1 → P2 → P3 → P4 → P5

### Design
- **Route:** `/design`
- **Components:** `design/design-board.tsx`, `design/job-card-detail.tsx`
- **Job cards** assigned to designers, tracked through Pre-Design → In Progress → Awaiting Client Response → Signed Off

### Production
- **Route:** `/production`
- **Components:** `production/production-board-view.tsx`, `production/workshop-view.tsx`
- **Stages:** AWAITING → CUTTING → FABRICATION → FITTING → SHOTBLASTING → PAINTING → PACKING → DISPATCHED

### Quotes (Standalone)
- **Route:** `/quotes`, `/quotes/[id]`
- **Components:** `quotes/quote-form.tsx`
- **Note:** Separate from CRM quotes — planned to be unified

---

## Database Quick Reference

### Key Models
- `Project` — core entity, links to everything
- `Opportunity` — CRM pipeline item, has `hasEtoLines` flag
- `OpportunityQuoteLine` — line items on CRM quotes
- `Quote` / `QuoteLine` — standalone quote system
- `Product` — product instances on projects
- `DesignJobCard` — design tasks assigned to engineers
- `ProductionTask` — production stage tracking per item
- `PurchaseOrder` / `PurchaseOrderLine` — procurement
- `NonConformanceReport` — quality NCRs
- `Customer` / `Supplier` — contacts and records

### Key Enums
- `QuoteLineClassification`: STANDARD, CTO, ENGINEER_TO_ORDER
- `ProjectStatus`: OPPORTUNITY through COMPLETE
- `ProductionStage`: AWAITING through COMPLETED
- `WorkStream`: UTILITIES, COMMUNITY, BESPOKE, BLAST, BUND_CONTAINMENT, etc.
- `CustomerType`: MAIN_CONTRACTOR, UTILITY, COUNCIL, DIRECT, DEFENCE, OTHER

---

## Working Conventions

### Rules
- **docs/CHANGELOG.md** — write an entry after every piece of executed work. Include date, what changed, files touched, and any breaking changes. This is the project's living history — every teammate (and every future Claude session) relies on it to understand what happened.
- **docs/TODO.md** — capture ideas, discussions, and planned features here when the user discusses them. If the user raises an idea or pain point in conversation, log it in the appropriate section of TODO.md so it isn't lost between sessions.
- **docs/PDF-REPORTS.md** — when asked to generate a report or PDF, follow this spec exactly. It defines the branded MME layout: PX Grotesk font, dark navy/coral theming, cover page design, header/footer structure, and the Puppeteer generation approach.
- **Plans** — discuss in conversation first, only save to TODO when told
- **Commits** — descriptive message, co-authored, don't push unless asked

### Reference Docs (in `docs/`)
| File | Purpose |
|------|---------|
| `docs/TODO.md` | Feature backlog, ideas, and planned work |
| `docs/CHANGELOG.md` | Detailed record of all executed changes |
| `docs/MME-OPERATIONS.md` | Full company profile — products, workflows, departments, terminology |
| `docs/PDF-REPORTS.md` | MME branded PDF generation spec, colors, fonts, layout approach |
| `docs/CRM-Salesman-Handbook.md` | CRM usage guide for sales team |
| `docs/Design-Process-SOP.md` | Design department standard operating procedures |

### Code Quality — Non-Negotiable
- **No `any` casts, `@ts-ignore`, or `@ts-nocheck`** — find the proper typed solution
- **No quick fixes or shortcuts** — study the problem, understand root causes, implement correctly
- **No over-engineering** — only build what's needed now, not hypothetical future requirements
- **No unnecessary comments, docstrings, or type annotations** on code you didn't change

### Code Style
- TypeScript strict mode
- Path alias: `@/` maps to `src/`
- shadcn/ui components in `components/ui/`
- API routes use Next.js App Router conventions
- Prisma for all database operations (import from `@/lib/db`)
- Auth via `getServerSession` from NextAuth

### Prisma Architecture Rules (MANDATORY)
The Prisma schema has circular bidirectional relations that cause TypeScript "excessive stack depth" errors during clean builds. These rules prevent the problem from getting worse as new features are added.

**1. Repository pattern for deep relation chains**
- API route files must NOT import `prisma` directly if the query touches models in a circular chain
- Use `src/lib/repositories/` with narrow delegate interfaces instead
- Existing repositories: `bom-items.ts`, `spec-fields.ts`, `product-variants.ts`, `quote-lines.ts`
- When creating a new repository, follow the delegate pattern:
  ```typescript
  interface XxxDelegate {
    create(args: { where?: ...; data: Record<string, unknown> }): Promise<unknown>
  }
  const xxx: XxxDelegate = prisma.xxx as unknown as XxxDelegate
  ```

**2. New Prisma models — minimise reverse relations on hub models**
- `Project`, `Customer`, `User` are hub models with 15+ relations each
- When adding a new model (e.g. PassportEntry, ChangeOrder), ask: "Do I need `project.passportEntries[]` or just `passportEntry.projectId`?"
- If you only query from the child side, OMIT the reverse array from the parent model
- This keeps the type graph shallow and prevents new circular chains

**3. Prefer `select` over `include`**
- `select` limits type resolution to only the fields you need
- `include` forces TypeScript to resolve all nested relation types
- Use `include` only when you genuinely need the nested data

**4. Every mutative API route must have**
- `requireAuth()` — returns 401 if not logged in
- `requirePermission('resource:action')` — returns 403 if role lacks permission
- `validateBody(request, zodSchema)` — returns 400 with field errors if invalid
- `toDecimal()` for any money/decimal field — never `parseFloat()`

**5. No `as any`, no `@ts-ignore`, no `@ts-nocheck`**
- Use narrow delegate interfaces (rule 1) instead of type escape hatches
- If TypeScript can't resolve a type, the solution is a typed repository, not a cast

**6. `ignoreBuildErrors: true` is intentional**
- `next.config.ts` has `typescript.ignoreBuildErrors: true` — this is the standard Prisma recommendation for large schemas (prisma/prisma#14832)
- Real type checking happens via `npm run typecheck` (`tsc --noEmit`) and in the IDE
- Do NOT remove this setting

---

## What's Built vs What's Planned

### Built & Working
- CRM pipeline with opportunity/quote management
- Project management with multiple views
- Design module with job cards and designer assignment
- Production board with stage tracking
- BOM management and calculator
- Purchase order system
- Customer/supplier management
- Dashboard with ICU carousel for critical projects
- Product catalogue with Sage stock import
- NCR tracking
- Audit logging
- Role-based permissions
- Customer portal

### Recently Completed
- CRM opportunity detail page with Salesforce-style activity timeline (2026-03-02)
- Code audit v2 — comprehensive hardening: auth, validation, toDecimal, error handling (2026-03-01)
- Concurrency-safe project number generation via sequences (2026-03-01)
- Database migrated from Neon to Supabase (2026-02-28)
- ITO → ETO rename + CTO classification (2026-02-28)
- ICU carousel on dashboard (2026-02-28)

### Planned (Not Yet Built)
- **Project Passport** — living context record per project with stage gates (see docs/TODO.md)
- **Change Orders** — formal change management with cost tracking
- **Multi-level ETO Approvals** — Engineering → Commercial → MD approval chain
- **Unified Quote System** — merge CRM and standalone quote builders
- **AI Document Extraction** — auto-read specs/contracts into passport
- **Spec Compliance Checking** — cross-reference specs vs BOMs/drawings
- **Quote enhancements** — payment terms, lead times, assumptions & exclusions, PDF improvements
- **Sage data import** — stock items, BOMs, customers, suppliers from Sage exports

---

## MME Context (Essential Background)

MME manufactures flood doors, flood gates, blast doors, flood cabinets, demountable barriers, and related products. Key work streams:

- **Utilities** — substations for UKPN, National Grid, Scottish Power (Standard/CTO, framework call-offs)
- **Community** — EA/NRW flood defence schemes (often Bespoke/Major)
- **Blast** — military/defence/industrial blast protection (Bespoke/Major)
- **Bund Containment** — containment around transformers/chemical storage

Customers are primarily UK main contractors (Graham, Skanska, Knights Brown) and utility companies. Some international work (UAE, Saudi Arabia, Lithuania, Ireland).

For full operational detail, see `docs/MME-OPERATIONS.md`.

---

## Database Notes
- Push schema changes: `npx prisma db push` (NOT `migrate dev` — production DB has drift from early `db push` usage)
- Generate client after schema change: `npx prisma generate`
- Client output: `src/generated/prisma`
- Connection: Supabase Session Pooler (IPv4-compatible)

## PDF Report Generation
MME has a branded PDF report format using PX Grotesk font, dark navy/coral theming, and the MME logo. See `docs/PDF-REPORTS.md` for the full design spec and generation approach. Key: uses Puppeteer with manual headers/footers (NOT `displayHeaderFooter`), base64-embedded fonts, inline SVG logo.

---

*Last updated: 2026-03-02*
