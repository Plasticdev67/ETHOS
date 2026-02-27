# MME ETO System — User Guide

**MM Engineered Solutions Ltd**
**Version 1.0 — February 2026**

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started](#2-getting-started)
3. [Dashboard](#3-dashboard)
4. [Board (Motherboard)](#4-board-motherboard)
5. [Projects](#5-projects)
6. [Tracker](#6-tracker)
7. [Quotes](#7-quotes)
8. [Purchasing](#8-purchasing)
9. [Finance](#9-finance)
10. [Customers](#10-customers)
11. [Suppliers](#11-suppliers)
12. [Catalogue](#12-catalogue)
13. [Team](#13-team)
14. [Reports](#14-reports)
15. [Data Import](#15-data-import)
16. [Common Workflows](#16-common-workflows)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. System Overview

The MME ETO System is a bespoke Engineer-to-Order business management platform built specifically for MM Engineered Solutions. It tracks the complete lifecycle of engineering projects from first enquiry through to project close.

### What it replaces
- Excel tracker spreadsheets
- Manual quote spreadsheets
- Disconnected project folders
- Scattered financial data across Sage and spreadsheets

### Key concepts
- **Project** — A job for a customer. Has a unique project number (e.g. 100001).
- **Product** — A line item within a project (e.g. a blast door, bund wall, kiosk). Each product moves through departments: Planning → Design → Production → Installation → Review → Complete.
- **Quote** — A priced proposal for a customer. Contains quote lines with cost, margin, and sell price calculations.
- **Nominal Code** — A cost code that mirrors your Sage Chart of Accounts. Used to tag every cost to a category.
- **Lifecycle Gates (P0–P5)** — Stage gates from Enquiry to Handover/Close.

### Navigation
The sidebar on the left contains all main sections. Click the collapse arrow at the bottom to minimise it. Each section is described in detail below.

---

## 2. Getting Started

### First-time setup — recommended order

1. **Team** — Add your users first (estimators, coordinators, designers, production managers). These are needed so you can assign people to projects and products.

2. **Nominal Codes** — Go to Finance → Nominal Codes and set up your cost codes to match your Sage Chart of Accounts (e.g. 4000 Materials, 4100 Sub-contract, 5000 Plant Hire).

3. **Customers** — Add your customer list. You can do this manually or use the Import tool.

4. **Suppliers** — Add your supplier list.

5. **Catalogue** — Add your standard product catalogue with guide pricing (optional but helpful for quoting).

6. **Import existing data** — If migrating from another system, use the Import page to bulk-load customers, suppliers, nominal codes, projects, and products from CSV or Excel paste.

---

## 3. Dashboard

**URL:** / (home page)

The dashboard gives you a real-time overview of the entire business.

### Top section — Pipeline Values
Four cards showing:
- **Total Pipeline** — Combined value of all active projects (opportunities + quoted + on order)
- **Opportunities** — Value of projects at sales stage "Opportunity"
- **Quoted** — Value of projects at sales stage "Quoted"
- **On Order** — Value of projects at sales stage "Order" (confirmed work)

### ICU / Critical Alerts
A red banner appears if any projects are flagged as ICU (Intensive Care Unit) or have Critical priority. Click the project numbers to go directly to them.

### Quick Stats Row
- Total Projects, Active Projects, Total Products, Total Quotes, Awaiting Response (submitted quotes not yet accepted/declined), Open NCRs

### Main Content
- **Product Pipeline by Department** — Shows how many products are in each department (Planning, Design, Production, Installation, Review, Complete)
- **Recent Projects** — Table of the 10 most recently updated projects with values and project managers
- **Recent Quotes** — Latest 5 quotes with status and values
- **Needs Attention** — Products past their required completion date
- **Projects by Stage** — Breakdown of projects by their current status

---

## 4. Board (Motherboard)

**URL:** /board

A Kanban-style visual board showing all active projects as cards, organised by their current status.

### Columns
Projects flow left to right through these columns:
- **Opportunity** → **Quotation** → **Design** → **Manufacture** → **Installation** → **Review**

Completed projects are hidden from the board.

### Project Cards
Each card shows:
- Project number and name
- Customer name
- Estimated/contract value
- Project manager
- Product count
- RAG status (Red/Amber/Green) based on deadline proximity
- Priority badge (if High or Critical)
- Classification badge (if Mega or Sub-Contract)

### Drag and Drop
Drag a project card from one column to another to update its status. For example, dragging from "Design" to "Manufacture" automatically updates the project status.

### Filters
Above the board you'll find:
- **Search** — Filter by project name, number, or customer
- **Classification** — Filter to show only Mega projects, Sub-contracts, or Normal
- **Priority** — Filter by Critical, High, or Normal

The count indicator shows "Showing X of Y projects" when filters are active.

### ICU Banner
Projects flagged as ICU or Critical priority appear in a red banner at the top of the board for immediate visibility.

---

## 5. Projects

### Project List

**URL:** /projects

Shows all projects in a table with columns:
- Project Number, Name, Customer, Type, Work Stream, Status, Sales Stage, Coordinator, Products count, RAG

#### Filters
- **Status** — Opportunity, Quotation, Design, Manufacture, Installation, Review, Complete
- **Sales Stage** — Opportunity, Quoted, Order
- **Work Stream** — Community, Utilities, Bespoke, Blast, Bund/Containment, Refurbishment, Adhoc
- **Priority** — Normal, High, Critical
- **Classification** — Normal, Mega, Sub-Contract

Click **New Project** to create a project.

### Creating a New Project

**URL:** /projects/new

Fill in:
- **Project Name** (required) — A descriptive name for the job
- **Customer** — Select from existing customers
- **Coordinator** — The project coordinator from your team
- **Project Manager** — The PM overseeing the job
- **Install Manager** — The person managing site installation
- **Type** — Standard or Bespoke Major
- **Work Stream** — Community, Utilities, Bespoke, etc.
- **Contract Type** — NEC, Standard, Framework Call-off, Other
- **Priority** — Normal, High, Critical
- **Classification** — Normal, Mega, Sub-Contract
- **Estimated Value** — The anticipated project value in £
- **Region** — Geographic region for the project

A project number is auto-generated (starting from 100001).

### Project Detail

**URL:** /projects/[id]

The project detail page is the central hub for everything related to a single project.

#### Header
Shows the project name, status badges, priority/ICU/classification indicators, and an Edit button.

Quick info cards show: Customer, Project Manager, Product count, Target completion date.

Financial cards (when values are set): Estimated Value, Contract Value, Current Cost, NCR Cost.

#### Lifecycle Stepper
A visual P0–P5 progression bar showing which lifecycle gate the project is at:
- **P0** — Enquiry
- **P1** — Quotation
- **P2** — Order Handover
- **P3** — Design Review
- **P4** — Production Complete
- **P5** — Handover / Close

Each gate shows its date when completed. Use the Edit Project form to advance lifecycle stages.

#### Tabs

**Products Tab**
- Table of all products in the project
- Shows: Part Code, Description, Department (colour-coded badge), Production Stage, Designer, Due Date
- Click a department badge to change a product's department status
- **Add Product** button opens a dialog to add new products
- Department summary pills at the top show counts per department

**Overview Tab**
- Lifecycle stepper (P0–P5 with dates)
- Project details: number, type, work stream, classification, priority, location, region, notes
- Key dates: enquiry received, quote submitted, order received, target/actual completion

**NCRs Tab**
- Table of all Non-Conformance Reports for this project
- Shows: NCR Number, Title, Product, Severity (Minor/Major/Critical), Status, Cost Impact, Dates
- **Raise NCR** button to create a new NCR

**Financials Tab**
- **Retention Holdbacks** — Retention %, amount, status (Held/Partially Released/Released), release date
- **Plant Hire** — Description, supplier, hire dates, weekly rate, total cost, status
- **Sub-Contractor Work** — Description, supplier, product, agreed value, invoiced to date, status
- **Cost Categories** — Cost code, description, budget, committed, actual, variance. Totals row at bottom with colour-coded variance.

**Documents Tab**
- Upload files (drawings, specifications, certificates, test reports, photos, correspondence)
- Each document can be linked to a specific product or be project-level
- Download and delete documents
- Shows file name, type badge, description, related product, file size, upload date

### Editing a Project

Click the **Edit** button on the project detail page. You can update:
- All basic fields (name, type, work stream, contract type, etc.)
- Lifecycle stage and P-gate dates
- Priority, ICU flag, classification
- Financial values
- Location and notes
- Key dates

---

## 6. Tracker

**URL:** /tracker

An Excel-style view of ALL products across ALL projects. This is the digital replacement for your Excel tracker spreadsheet.

### Columns
- **Project** (sticky left column) — Project number and name
- **Job No.** — Product job number
- **Part Code** — Product part code
- **Description** — Product description
- **Details** — Additional details
- **Qty** — Quantity
- **Department** — Current department (clickable to change)
- **Production Stage** — Detailed production status
- **Designer** — Allocated designer
- **Coordinator** — Product coordinator
- **Design Status** — Free text design notes
- **Install Status** — Free text install notes
- **Due Date** — Required completion date
- **RAG** — Calculated Red/Amber/Green based on deadline

### Filters
- **Department** — Show only products in a specific department
- **Production Stage** — Filter by detailed production stage
- **Designer** — Show only one designer's products
- **Coordinator** — Filter by coordinator
- **Search** — Search across description, part code, details, job number, and project

### Department Summary
Pills at the top show counts: Planning (X), Design (X), Production (X), etc.

### Changing Status
Click a department badge on any product to open a dropdown. Select the new department to move the product forward in the workflow.

---

## 7. Quotes

### Quote List

**URL:** /quotes

Table showing all quotes:
- Quote Number, Customer, Subject, Project (linked if exists), Status, Lines count, Cost Total, Sell Total, Overall Margin %, Created date

Status badges: Draft (grey), Submitted (blue), Accepted (green), Declined (red), Revised (amber).

Click **New Quote** to create a quote.

### Creating a Quote

The new quote dialog asks for:
- **Customer** (required) — Select from existing customers
- **Subject** — Description of what's being quoted
- **Notes** — Any additional notes

A quote number is auto-generated in Q-XXXX format.

### Quote Detail

**URL:** /quotes/[id]

#### Header
Shows quote number, revision, status badge, customer, linked project (if any), created date.

#### Status Actions
Buttons change based on current status:
- **Draft** → "Submit Quote" button
- **Submitted** → "Accept" (green) or "Decline" (red) buttons
- **Accepted** → "Revise" or "Create Project" buttons
- **Declined** → "Revise" button
- **Revised** → "Re-submit" button

#### Quote Lines
Table of all line items:
- Part Code, Description, Quantity, Units, Unit Cost, Cost Total, Margin %, Sell Price, Optional flag

**How pricing works:**
1. Enter **Unit Cost** — what it costs you
2. Enter **Quantity**
3. **Cost Total** = Unit Cost × Quantity (calculated automatically)
4. Enter **Margin %** (minimum 25% enforced with a warning)
5. **Sell Price** = Cost Total ÷ (1 - Margin% ÷ 100), rounded to nearest £25
6. Lines can be marked as **Optional** (extras not included in main total)

#### Totals
- Total Cost, Total Sell, Overall Margin %
- Profit = Sell - Cost
- Optional extras shown separately

#### Converting Quote to Project
When a quote is accepted, click **Create Project**. A dialog confirms:
- The project name (from quote subject)
- Customer (carried from quote)
- Sales stage set to "Order"
- Status set to "Design"

**All non-optional quote lines are automatically created as products** on the new project, in the Planning department. If the customer only ordered some items, you can delete the products you don't need from the project — much quicker than re-adding them.

---

## 8. Purchasing

### Purchase Order List

**URL:** /purchasing

Shows all purchase orders with:
- PO Number, Project, Supplier, Status, Date Raised, Expected Delivery, Total Value, Lines count

Summary stats in header: Total POs, Open POs, Total Value.

Status badges: Draft (grey), Sent (blue), Partially Received (amber), Complete (green), Cancelled (red).

### Creating a PO

Click **New PO**. Fill in:
- **Project** (required) — Select from active projects
- **Supplier** — Select from existing suppliers
- **Total Value** — Overall PO value
- **Expected Delivery** — When goods/services are expected
- **Notes** — Any additional info

A PO number is auto-generated in PO-XXXX format.

---

## 9. Finance

### Finance Dashboard

**URL:** /finance

Company-wide financial overview across all on-order projects.

#### KPI Cards
- **Total Contract Value** — Sum of all on-order project contract values
- **Total Committed** — Sum of all PO values + plant hire + sub-contract agreed values
- **Overall Margin** — (Contract Value - Committed) ÷ Contract Value × 100
- **Outstanding Debtors** — Total invoiced minus total paid

#### Secondary KPIs
On-order project count, total invoiced, total paid, retention held, nominal code count, projects over budget.

#### Over-Budget Alert
A red banner appears if any projects have committed costs exceeding their contract value.

#### Project Financial Summary
Table showing each project with contract value, committed costs, and margin %. Colour-coded:
- Green: margin ≥ 25%
- Amber: margin 0-25%
- Red: margin negative (over budget)

#### Outstanding Invoices
List of recently submitted/certified invoices awaiting payment.

#### Nominal Codes by Category
Summary of how many nominal codes exist per category.

### Job Costing / CVR

**URL:** /finance/job-costing

**Cost Value Reconciliation** — the most important finance report for an engineering company.

For every on-order project, shows:
- **Contract Value** — What the customer is paying
- **PO Costs** — Total purchase order values
- **Plant** — Total plant hire costs
- **Sub-Con** — Total sub-contractor agreed values
- **Total Committed** — Sum of all costs (highlighted column)
- **Forecast Final** — The higher of committed or actual costs
- **Variance** — Contract Value minus Forecast Final (green = under budget, red = over)
- **Margin %** — Forecast margin percentage
- **Invoiced** — Total applications for payment submitted
- **Paid** — Total payments received

Summary cards at top show company-wide totals.

Projects over budget are highlighted with a red background.

### Invoicing

**URL:** /finance/invoicing

Track applications for payment, certificates, CIS deductions, and retention.

#### Creating an Invoice / Application

Click **New Invoice**. Fill in:
- **Project** (required) — Select from active projects
- **Type** — Application for Payment, Interim Invoice, Final Account, Retention Release, or Variation
- **Application Amount** — The value you're applying for
- **Retention Held** — Retention deducted (usually 5% of application)
- **CIS Deduction** — Construction Industry Scheme tax deduction (usually 20% for sub-contractors)
- **Period From / To** — The valuation period
- **Due Date** — When payment is expected
- **Notes** — Cert reference, valuation notes, etc.

**Net Payable** is calculated automatically: Application Amount - Retention - CIS.

An invoice number is auto-generated in INV-XXXX format.

#### Invoice Table
Shows all invoices with: Invoice Number, Project, Customer, Type, Status, Period, Applied, Certified, Retention, CIS, Net Payable, Paid, Due Date.

Status badges: Draft, Submitted, Certified, Overdue, Paid, Disputed.

KPI cards show: Total invoices, Total applied, Total certified, Total paid, Outstanding count.

### Nominal Codes

**URL:** /finance/nominal-codes

Manage your cost codes. These mirror your Sage Chart of Accounts so finance can reconcile easily.

#### Adding a Code
Click **Add Code**. Enter:
- **Code** — The nominal code number (e.g. 4000, 4100, 5000)
- **Description** — What the code is for (e.g. "Steel / Raw Materials")
- **Category** — Materials, Labour, Plant Hire, Sub-Contract, Transport, Overheads, Prelims, Design, Other

#### Managing Codes
- **Edit** — Click the pencil icon to edit code, description, or category
- **Active/Inactive** — Click "Active" to deactivate a code (hidden from dropdowns but data preserved)
- **Delete** — Only available if the code has zero usage (not linked to any PO lines, plant hire, etc.)
- **Usage count** — Shows how many records use this code

#### Suggested Sage-compatible codes:
| Code | Description | Category |
|------|------------|----------|
| 4000 | Steel / Raw Materials | Materials |
| 4001 | Fixings & Fasteners | Materials |
| 4002 | Paint & Coatings | Materials |
| 4100 | Sub-Contract Labour | Sub-Contract |
| 4200 | Sub-Contract Specialist | Sub-Contract |
| 5000 | Plant Hire | Plant Hire |
| 5100 | Transport & Haulage | Transport |
| 6000 | Direct Labour | Labour |
| 6100 | Design & Drawing | Design |
| 7000 | Site Prelims | Prelims |
| 7100 | Overhead Recovery | Overheads |

---

## 10. Customers

### Customer List

**URL:** /customers

Table showing: Name, Type (badge), Email, Phone, Projects count, Contacts count.

Customer types: Main Contractor (blue), Utility (purple), Council (green), Direct (amber), Defence (red), Other (grey).

Click **New Customer** to add a customer.

Click a customer name to view their detail page.

### Customer Detail

**URL:** /customers/[id]

Shows:
- Info cards: Email, Phone, Payment Terms, Total Quoted Value
- **Contacts** table — Name, Role, Email, Phone, Primary contact badge
- **Quotes** table — All quotes for this customer with: Quote Number, Subject, Status, Linked Project, Date, Lines, Value. Includes "X accepted — £Y won" summary.
- **Projects** table — All projects for this customer with: Project Number, Name, Status, Sales Stage, Coordinator, Product count
- **Notes** — Customer notes

---

## 11. Suppliers

### Supplier List

**URL:** /suppliers

Table showing: Name, What They Supply, Email, Phone, Payment Terms, PO count.

Click **New Supplier** to add a supplier.

Click a supplier name to view their detail page.

### Supplier Detail

**URL:** /suppliers/[id]

Shows:
- Info cards: Email, Phone, Payment Terms, Total PO Value
- **Contacts** table — Name, Role, Email, Phone, Primary contact badge
- **Purchase Orders** table — All POs for this supplier
- **Plant Hire** table — All plant hire records linked to this supplier
- **Sub-Contract Work** table — All sub-contract records for this supplier
- **Notes** — Supplier notes

---

## 12. Catalogue

**URL:** /catalogue

The product catalogue stores your standard products with guide pricing. When creating quote lines, you can select from the catalogue to pre-fill descriptions and guide costs.

Table shows: Part Code, Description, Class, Guide Unit Cost, Guide Margin %, Default Units, Active.

Click **New Item** to add a catalogue entry.

### Fields
- **Part Code** (required, unique) — Your standard part code
- **Description** — Product description
- **Class ID** — Product classification (default: PROD)
- **Guide Unit Cost** — Your typical unit cost for this product
- **Guide Margin %** — Your standard margin target
- **Default Units** — Measurement units (e.g. "each", "metres", "tonnes")
- **Active** — Whether this item appears in selection dropdowns

---

## 13. Team

**URL:** /team

Manage users who can be assigned to projects and products.

### Adding Users
Click **Add User**. Enter:
- **Name** (required)
- **Email** (required, unique)
- **Role** — Admin, Estimator, Project Coordinator, Designer, Production Manager, Viewer
- **Password**

### Roles
| Role | Typical use |
|------|------------|
| Admin | Full access — IT / management |
| Estimator | Creates and manages quotes |
| Project Coordinator | Manages project delivery and products |
| Designer | Assigned to products for design work |
| Production Manager | Oversees manufacturing / production |
| Viewer | Read-only access |

### Assignment Counts
The table shows how many projects, designed products, and coordinated products each user is assigned to.

---

## 14. Reports

**URL:** /reports

Business intelligence and analytics page.

### KPI Cards
- **Total Pipeline** — Value of all active projects
- **Confirmed Orders** — Value of projects at sales stage "Order"
- **Quote Conversion Rate** — Accepted ÷ (Accepted + Declined) as a percentage
- **Average Quote Margin** — Mean overall margin across all quotes

### Sections
- **Pipeline by Sales Stage** — Visual progress bars showing Opportunity / Quoted / Order values and counts
- **Pipeline by Work Stream** — Breakdown by work stream (Community, Utilities, Bespoke, etc.)
- **Quote Funnel** — Visualization of quote flow: Draft → Submitted → Accepted / Declined / Revised
- **NCR Summary** — Total NCRs, Open count, Total cost impact, breakdown by severity
- **Project Profitability** — Table of projects with contract value, cost (including NCR), profit, and margin %. Colour-coded by margin health.
- **Recent Quotes — Margin Analysis** — Latest 20 quotes showing status and margin percentage

---

## 15. Data Import

**URL:** /import

Bulk import data from Sage, Excel, or CSV files.

### Import Types Available
1. **Customers** — Import your customer list
2. **Suppliers** — Import your supplier list
3. **Nominal Codes** — Import from Sage Chart of Accounts
4. **Projects** — Import project data from your existing system
5. **Products / Line Items** — Import products into existing projects (from your Excel tracker)

### How to Import

#### Step 1: Choose what to import
Click one of the import type cards.

#### Step 2: Paste or Upload
**From Excel:**
1. Open your spreadsheet
2. Select the rows you want to import (including the header row)
3. Copy (Ctrl+C)
4. Paste (Ctrl+V) into the text area on the left

**From CSV:**
1. Export from Sage or your system as CSV
2. Click the file upload area on the right
3. Select your .csv file

The system detects whether data is tab-separated (from Excel) or comma-separated (CSV).

#### Step 3: Map Columns
The system reads your column headers and tries to auto-map them to the correct fields. For example:
- "Account Name" automatically maps to "Name"
- "Tel" automatically maps to "Phone"

For each field, you can change the mapping using the dropdown. A sample value from your first row is shown to help you verify.

Required fields are marked with *. All required fields must be mapped before continuing.

#### Step 4: Preview
A table shows the first 50 rows as they will be imported. Check the data looks correct.

#### Step 5: Import
Click **Import X rows**. The system will:
- Create each record
- Show a count of successful imports
- List any rows that had errors (with the row number and reason)

### Import Order
Import data in this order to ensure relationships work:
1. **Customers** and **Suppliers** first
2. **Nominal Codes**
3. **Projects** (matches customer names to link them)
4. **Products** (matches project numbers to link them)

### Smart Matching
The import system handles messy data:
- **Status fields** — "In Production", "Manufacturing", "Fabrication" all map to MANUFACTURE
- **Money values** — "£125,000.00" is cleaned automatically (strips £ and commas)
- **Customer types** — "Main Contractor", "MC", "Contractor" all map to MAIN_CONTRACTOR
- **Customer matching** — When importing projects, customer names are fuzzy matched
- **User matching** — Designer and coordinator names are fuzzy matched to team members

---

## 16. Common Workflows

### Workflow 1: New Enquiry to Quote

1. **Dashboard** — Notice a new enquiry needs processing
2. **Projects** → **New Project** — Create the project with customer, coordinator, estimated value. Status: Opportunity.
3. **Quotes** → **New Quote** — Create a quote for the customer
4. Open the quote → **Add Lines** — Add each item with unit cost, quantity, margin
5. Review totals and margins
6. Click **Submit Quote** — Status changes to Submitted
7. Update the project: Edit → Sales Stage = "Quoted"

### Workflow 2: Quote Accepted → Project Starts

1. Open the accepted quote
2. Click **Accept** → then **Create Project** (or link to existing)
3. All quote lines become products automatically in the Planning department
4. Delete any products the customer didn't order
5. Assign designers and coordinators to products
6. Set required completion dates
7. Move lifecycle to P2 (Order Handover)
8. The project now appears on the Board in the "Design" column

### Workflow 3: Moving Products Through Departments

1. **Tracker** — Filter by department to see what's where
2. Click a product's department badge → select new department
3. Or go to the project detail → Products tab → click department badges
4. Products flow: Planning → Design → Production → Installation → Review → Complete
5. In Production, track detailed stages: Cutting → Fabrication → Fitting → Shotblasting → Painting → Packing → Dispatched

### Workflow 4: Raising an NCR

1. Go to the project detail → NCRs tab
2. Click **Raise NCR**
3. Fill in: Title, Description, Severity (Minor/Major/Critical), Product (optional), Cost Impact
4. NCR number auto-generated
5. Track through: Open → Investigating → Resolved → Closed
6. Cost impact feeds into the project's NCR Cost

### Workflow 5: Monthly Finance Review

1. **Finance** → **Job Costing** — Review the CVR for all on-order projects
2. Check variance column — any projects over budget (red)?
3. Check margin column — any projects below target margin?
4. **Finance** → **Invoicing** — Review outstanding invoices
5. Create new applications for payment for the month
6. Update paid amounts when payments are received
7. **Finance Dashboard** — Review overall KPIs: debtors, margin, committed vs contract

### Workflow 6: Purchasing Materials

1. **Purchasing** → **New PO**
2. Select the project and supplier
3. Enter the total value and expected delivery
4. Add notes about what's being ordered
5. PO number auto-generated
6. Track PO: Draft → Sent → Partially Received → Complete

### Workflow 7: Project Close

1. Ensure all products are in "Complete" department
2. All NCRs are closed
3. Final account / retention release invoices submitted
4. Update lifecycle to P5 (Handover/Close)
5. Set actual completion date
6. Change project status to Complete
7. Project disappears from the Board (but remains in Projects list)

---

## 17. Troubleshooting

### Page is slow to load
On first access after a restart, pages may take a few seconds to compile. This is normal with the development server. Subsequent loads are fast.

### Data not updating after changes
Try refreshing the page (F5). The system uses server-side rendering, so changes made via the Board drag-drop or dialogs should auto-refresh, but occasionally a manual refresh is needed.

### Quote margins showing warnings
The system enforces a 25% minimum margin floor. If you enter a margin below 25%, you'll see a warning. You can override this but it flags that the margin may be too low.

### Import errors
Common import issues:
- **"Name is required"** — The name column wasn't mapped or the cell is empty
- **"Project not found"** — When importing products, the project number must match an existing project exactly
- **"Duplicate"** — A record with the same unique identifier (email, project number, etc.) already exists

### Financial values showing £0.00
Ensure you've entered contract values and/or estimated values on your projects. The finance pages aggregate these values — if they're not set, everything shows as zero.

---

## Quick Reference

### Keyboard Shortcuts
- **Ctrl+K** — Quick search (browser)
- **F5** — Refresh page

### Status Colours
| Colour | Meaning |
|--------|---------|
| Grey | Draft / Inactive / Planning |
| Blue | Submitted / In Progress / Design |
| Amber | Partially done / Warning / Quoted |
| Green | Accepted / Complete / On budget |
| Red | Declined / Overdue / Over budget |
| Purple | Utility / Specialist |

### Auto-Generated Numbers
| Entity | Format | Example |
|--------|--------|---------|
| Project | 6-digit number | 100001, 100002 |
| Quote | Q-XXXX | Q-0001, Q-0002 |
| NCR | NCR-XXXX | NCR-0001 |
| Purchase Order | PO-XXXX | PO-0001 |
| Sales Invoice | INV-XXXX | INV-0001 |

### Lifecycle Gates
| Gate | Name | Meaning |
|------|------|---------|
| P0 | Enquiry | Initial customer enquiry received |
| P1 | Quotation | Quote prepared and submitted |
| P2 | Order Handover | Order confirmed, project starts |
| P3 | Design Review | Design phase complete, ready for production |
| P4 | Production Complete | All products manufactured |
| P5 | Handover / Close | Installed, reviewed, project closed |

### Department Flow
```
Planning → Design → Production → Installation → Review → Complete
```

### Production Stages (within Production department)
```
Awaiting → Cutting → Fabrication → Fitting → Shotblasting → Painting → Packing → Dispatched
```

---

*Document generated February 2026. For the latest version, contact the system administrator.*
