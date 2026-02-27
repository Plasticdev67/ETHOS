# MME ETO System — Logic Map

**Version:** 1.0 | **Date:** 12 Feb 2026 | **Status:** Trial

---

## 1. System Overview

```
                         +-----------------------+
                         |     MME ETO System     |
                         |  Next.js 15 + Prisma   |
                         |  PostgreSQL (Neon)      |
                         +-----------+-----------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
     +--------+--------+   +--------+--------+   +---------+--------+
     |   Web Frontend   |   |   REST API Layer |   |   Database (PG)   |
     |   (React/TS)     |   |   /api/* routes  |   |   20+ tables      |
     |   shadcn/ui      |   |   JSON in/out    |   |   Neon serverless  |
     +------------------+   +-----------------+   +-------------------+
```

**Tech Stack:** Next.js 15.5, TypeScript, Prisma v7, PostgreSQL (Neon), Tailwind CSS, shadcn/ui

**Authentication:** NextAuth v5 — email/password + Microsoft Entra ID (SSO)

**Database:** Standard PostgreSQL — any BI tool (Power BI, Metabase, pgAdmin) can connect directly via connection string.

---

## 2. Core Business Flow

```
  ENQUIRY        QUOTATION         ORDER            DELIVERY          CLOSE
    |                |                |                 |                |
    v                v                v                 v                v
 +------+      +----------+     +----------+     +-----------+     +--------+
 |  P0  | ---> |    P1    | --> |    P2    | --> |  P3 / P4  | --> |   P5   |
 |Enquiry|     |  Quote   |     |  Order   |     | Design/   |     |Handover|
 |Logged |     |  Sent    |     | Received |     | Produce/  |     | Close  |
 +------+      +----------+     +----------+     | Install   |     +--------+
                    |                |             +-----------+
                    v                v                  |
               Quote PDF      Project Created          v
               Generated      Products Added      Tracker Updates
                              Board Card Made      (per product)
```

### Lifecycle Gates (P0–P5)
| Gate | Name | What Happens |
|------|------|-------------|
| P0 | Enquiry | Customer enquiry logged, project created as OPPORTUNITY |
| P1 | Quotation | Quote built (cost × qty × margin), PDF sent to customer |
| P2 | Order Handover | Order received, project activated, products added to tracker |
| P3 | Design Review | Products progress through Design → Ops → Production |
| P4 | Production Complete | All products manufactured, ready for install/dispatch |
| P5 | Handover / Close | Installation complete, as-builts done, retentions noted |

---

## 3. Data Model — Entity Relationships

```
                    +------------+
                    |  Customer  |
                    +-----+------+
                          |
            +-------------+-------------+
            |                           |
       +----+----+                +-----+-----+
       | Project  |<--------------+   Quote    |
       +----+-----+               +-----+-----+
            |                           |
    +-------+-------+            +------+------+
    |       |       |            |  QuoteLine  |
    |       |       |            +-------------+
    |       |    +--+---+
    |       |    |Product|--- (the tracker item)
    |       |    +--+----+
    |       |       |
    |   +---+---+ +-+-------+
    |   |  NCR  | |PO + Lines|
    |   +-------+ +----------+
    |
    +---+---+---+---+---+---+---+---+
    |       |       |       |       |
 Retention PlantHire SubContract Variation SalesInvoice
```

### Key Models (20 tables)

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | Team members & auth | name, email, role (6 roles), passwordHash |
| **Customer** | Client companies | name, type, address, paymentTerms |
| **Supplier** | Vendors & subcontractors | name, whatTheySupply, paymentTerms |
| **Project** | Central hub — everything links here | projectNumber, status, lifecycleStage (P0-P5), contractValue, priority, ICU flag |
| **Product** | Individual items in the tracker | partCode, department, design/ops/production/install dates + estimated hours |
| **Quote** | Pricing documents | quoteNumber, totalCost, totalSell, overallMargin |
| **QuoteLine** | Line items on quotes | unitCost, quantity, marginPercent, sellPrice |
| **PurchaseOrder** | Orders to suppliers | poNumber, supplierId, totalValue |
| **NominalCode** | Cost code master list (Sage) | code, description, category |
| **ProjectCostCategory** | Budget vs actual per cost code | budgetAmount, actualAmount, committedAmount |
| **SalesInvoice** | Applications / invoices | invoiceNumber, applicationAmount, certifiedAmount |
| **RetentionHoldback** | Held retentions | retentionPercent, releaseDate, status |
| **PlantHire** | Hired equipment tracking | weeklyRate, hireStart/End, supplierId |
| **SubContractorWork** | Sub-contract packages | agreedValue, invoicedToDate |
| **NCR** | Non-conformance reports | severity, costImpact, status |
| **Variation** | Change orders | costImpact, valueImpact, type, status |
| **Document** | Attached files | filename, documentType |
| **AuditLog** | Who changed what, when | action, entity, field, oldValue, newValue |
| **DepartmentCapacity** | Weekly hours per dept | department, hoursPerWeek, headcount |
| **CustomerPortalToken** | External read-only access | token, expiresAt, active |

---

## 4. Page Map — What Each Screen Does

### Navigation Structure
```
Sidebar:
  Dashboard ........... /                  Overview KPIs + charts
  Board ............... /board             Kanban drag-drop by project status
  Projects ............ /projects          Project list + filters
    > Project Detail .. /projects/[id]     Tabs: Overview, Products, Quotes, NCRs, Finance...
    > New Project ..... /projects/new      Create project form
    > Edit Project .... /projects/[id]/edit Edit form
  Tracker ............. /tracker           All products across all projects (Excel-like)
  Quotes .............. /quotes            Quote list + create
    > Quote Detail .... /quotes/[id]       Line items, margin calc, PDF button
  Purchasing .......... /purchasing        Purchase orders
  Finance ............. /finance           Financial dashboard + KPIs
    > Job Costing ..... /finance/job-costing  Cost vs budget by project
    > Invoicing ....... /finance/invoicing    Applications for payment
    > Nominal Codes ... /finance/nominal-codes  Cost code master list
    > Sage Export ..... /finance/exports      CSV downloads for Sage
  Customers ........... /customers         Customer list + detail
  Suppliers ........... /suppliers         Supplier list + detail
  Catalogue ........... /catalogue         Product reference data
  Team ................ /team              User management
  Capacity ............ /capacity          Rough-cut capacity planning
  Reports ............. /reports           Reporting (placeholder)
  Import .............. /import            CSV/Excel bulk import
  Audit Trail ......... /settings/audit    Change history log

Auth:
  Login ............... /login             Email/password + Microsoft SSO
  Customer Portal ..... /portal/[token]    Read-only external view (no login)
```

---

## 5. API Endpoints — Full List

All endpoints are JSON REST. Protected by auth (except `/portal` and `/api/auth`).

### Projects & Products
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects` | List projects (with filters) |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[id]` | Get project with all relations |
| PATCH | `/api/projects/[id]` | Update project fields |
| DELETE | `/api/projects/[id]` | Delete project |
| PATCH | `/api/products/[id]/status` | Update any product field (dates, hours, status, etc.) |

### Quotes
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/quotes` | List / create quotes |
| GET/PATCH/DELETE | `/api/quotes/[id]` | Get / update / delete quote |
| GET/POST | `/api/quotes/[id]/lines` | List / add quote lines |
| PATCH/DELETE | `/api/quotes/[id]/lines/[lineId]` | Update / delete line |
| GET | `/api/quotes/[id]/pdf` | Download PDF |

### Finance
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/nominal-codes` | Nominal code master list |
| PATCH/DELETE | `/api/nominal-codes/[id]` | Update / delete code |
| GET/POST | `/api/cost-categories` | Project cost categories |
| GET/POST | `/api/sales-invoices` | Sales invoices / applications |
| GET/POST | `/api/retentions` | Retention holdbacks |
| GET/POST | `/api/plant-hires` | Plant hire records |
| GET/POST | `/api/sub-contracts` | Sub-contractor work |
| GET | `/api/export/sage?type=X` | Sage CSV export (6 types) |

### Other
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/customers` | Customers |
| GET/POST | `/api/suppliers` | Suppliers |
| GET/POST | `/api/purchase-orders` | Purchase orders |
| GET/POST | `/api/ncrs` | Non-conformance reports |
| GET/POST | `/api/variations` | Variations / change orders |
| GET/POST | `/api/catalogue` | Product catalogue |
| GET/POST | `/api/documents` | Document attachments |
| GET | `/api/users` | Team members |
| POST | `/api/import` | CSV/Excel bulk import |
| GET | `/api/capacity` | Department capacity settings |
| GET | `/api/capacity/load` | Product-driven capacity load |
| GET | `/api/audit` | Audit trail logs |
| POST | `/api/portal` | Generate customer portal token |

---

## 6. Product Tracker — Department Flow

Each **Product** moves through departments. The tracker shows all products across all projects.

```
PLANNING → DESIGN → OPS → PRODUCTION → INSTALLATION → REVIEW → COMPLETE
                              |
                    Production sub-stages:
                    AWAITING → CUTTING → FABRICATION → FITTING
                    → SHOTBLASTING → PAINTING → PACKING → DISPATCHED
```

### Per-Stage Data Captured
| Stage | Planned Start | Target Date | Completion Date | Est. Hours |
|-------|:---:|:---:|:---:|:---:|
| Design | Y | Y | Y | Y |
| Ops | Y | Y | Y | Y |
| Production | Y | Y | Y | Y |
| Installation | Y | Y | Y | Y |

Estimated hours + planned dates drive the **Capacity Planning** heatmap automatically.

---

## 7. Capacity Planning — How It Works

```
Product estimated hours + planned dates
            |
            v
    Hours spread across weeks
    (total hours / weeks between start & target)
            |
            v
    Compared against department capacity (hrs/week)
            |
            v
    Heatmap: GREEN (<80%) / AMBER (80-100%) / RED (>100%)
```

**Departments tracked:** Design, Ops, Production, Installation
**Data source:** Product-level (not project-level) — each product item has its own hours and dates.

---

## 8. Financial Flow

```
Quote (estimated cost + margin)
  |
  v
Project (contract value)
  |
  +---> Purchase Orders (committed cost to suppliers)
  +---> Plant Hire (weekly rates)
  +---> Sub-Contracts (agreed values)
  +---> Nominal Codes (cost categories: materials, labour, plant, etc.)
  +---> Cost Categories (budget vs actual per code)
  +---> Sales Invoices (applications for payment)
  +---> Retentions (held amounts + release dates)
  +---> Variations (cost/value impact of changes)
```

### Sage Integration
Export types: Customers, Suppliers, Nominal Codes, Invoices, Purchase Orders, Job Costing
Format: CSV with Sage-compatible column headers

---

## 9. Access & Security

### User Roles
| Role | Can Do |
|------|--------|
| ADMIN | Everything — full CRUD, user management, settings |
| ESTIMATOR | Create/edit quotes, view projects |
| PROJECT_COORDINATOR | Manage projects, products, POs, NCRs |
| DESIGNER | Update product design status, view projects |
| PRODUCTION_MANAGER | Update production status, view all |
| VIEWER | Read-only access to everything |

### Auth Methods
- **Email + Password** — bcrypt hashed, stored in database
- **Microsoft Entra ID (SSO)** — auto-creates user on first login

### External Access
- **Customer Portal** — token-based, read-only, no login needed
- **API** — all endpoints protected by session auth (except auth routes)

---

## 10. Database Connection (for BI tools / extensions)

The database is **standard PostgreSQL** hosted on Neon. Any tool that supports PostgreSQL can connect:

- **Connection:** `postgresql://[user]:[password]@ep-billowing-band-abyadc7j-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require`
- **Compatible with:** Power BI, Metabase, pgAdmin, DBeaver, Tableau, Excel (via ODBC), any SQL client
- **Read-only access** can be granted via a separate Neon database role

### Table naming convention
All tables use snake_case: `projects`, `products`, `quotes`, `quote_lines`, `purchase_orders`, `nominal_codes`, etc.

---

## 11. Extension Points

### Adding a new module
1. Add models to `prisma/schema.prisma`
2. Run `npx prisma db push` + `npx prisma generate`
3. Create API route in `src/app/api/[module]/route.ts`
4. Create page in `src/app/[module]/page.tsx`
5. Add to sidebar in `src/components/layout/sidebar.tsx`

### Integrations possible
- **Sage** — CSV export already built, could add direct API
- **Microsoft 365** — SSO already working, could add SharePoint/Teams
- **Power BI** — Direct PostgreSQL connection to any table
- **Webhook/API** — REST endpoints accept/return JSON
- **Email** — SMTP templates ready (nodemailer), needs server config

### Code structure
```
mme-app/
  prisma/
    schema.prisma          ← Data model (single source of truth)
  src/
    app/
      api/                 ← REST API endpoints
      [page]/              ← UI pages (React server/client components)
    components/            ← Reusable UI components
    lib/                   ← Business logic (auth, utils, calculations)
    hooks/                 ← Client-side React hooks
    generated/prisma/      ← Auto-generated database client
```

---

## 12. What's Built vs. What's Planned

### Built & Working
- [x] Quote builder (cost × qty × margin, rounding, PDF)
- [x] Project management (create, edit, lifecycle gates P0-P5)
- [x] Product tracker (department flow, production sub-stages)
- [x] Kanban "Motherboard" board (drag-drop)
- [x] Finance module (nominal codes, cost categories, invoicing, retentions)
- [x] Plant hire & sub-contractor tracking
- [x] Purchase orders
- [x] NCR management
- [x] Variations / change orders
- [x] Dashboard with charts
- [x] Authentication (email/password + Microsoft SSO)
- [x] Role-based access control (6 roles)
- [x] Audit trail
- [x] Customer portal (token-based)
- [x] Sage CSV export (6 types)
- [x] Capacity planning (product-driven, 4 departments)
- [x] Mobile responsive layout
- [x] CSV/Excel bulk import
- [x] Email notification templates

### Planned / Future
- [ ] Time tracking (actual hours logged per product)
- [ ] Actual vs. estimated hours comparison
- [ ] User management admin page
- [ ] Document file upload (currently schema only)
- [ ] Global search
- [ ] In-app notifications (bell icon)
- [ ] Purchase order approval workflow
- [ ] Production scheduling (Gantt/calendar)
- [ ] Automated email triggers (on status change)
- [ ] Print-friendly views for workshop

---

*This document is the single reference for how the MME ETO system is structured. Update it as the system evolves.*
