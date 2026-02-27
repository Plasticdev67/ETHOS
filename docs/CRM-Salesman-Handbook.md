# CRM Salesman Handbook — ETHOS MK.I

## Quick Reference

| Stage | What to do | Where |
|-------|-----------|-------|
| New enquiry comes in | Create a Prospect, then a Lead | CRM > New Prospect / New Lead |
| Build a quote | Add line items, set margin | CRM > Quote Builder (click quote icon) |
| Submit quote for approval | Click "Submit for Approval" | Quote Builder page |
| Customer accepts | Drag card to WON or edit status | CRM Pipeline |
| Convert to project | Click "Convert to Project" on WON card | Edit Opportunity dialog |
| Pass to design team | Click "Hand over to designers" | WON opportunity card |

---

## 1. Navigating the CRM

Open the CRM from the left sidebar — click **CRM**. You will see the Pipeline view by default.

There are **three views** you can switch between using the toggle at the top:

- **Pipeline** — Kanban board. Drag cards between columns to change status. Best for day-to-day pipeline management.
- **Board** — Groups opportunities under each prospect/company. Best for account-based selling.
- **Table** — Spreadsheet list with filters. Best for searching, sorting, and bulk review.

---

## 2. Creating a Prospect (New Company)

A **Prospect** is a company you are pursuing. Every opportunity must belong to a prospect.

1. Click the **"New Prospect"** button (top-right area of the CRM page).
2. Fill in:
   - **Company Name** (required)
   - **Contact Name** — your main point of contact
   - **Phone** and **Email**
   - **Sector** — choose from: Defence, Utilities, Construction, Energy, Transport, Water, or Other
   - **Lead Source** — how you found this lead: Referral, Website, Trade Show, Cold Call, Repeat Business, Tender Portal, or Other
   - **Address** — company address
   - **Notes** — any background info
3. Click **Create**.

The prospect is now available when creating new opportunities.

---

## 3. Creating a Lead (New Opportunity)

A **Lead** (also called an Opportunity) is a specific deal or enquiry from a prospect.

1. Click the **"New Lead"** button.
2. Fill in:
   - **Prospect / Company** — select from the dropdown (required)
   - **Lead Name** — a short name for the deal, e.g. "Sellafield Flood Doors Phase 2" (required)
   - **Estimated Value (GBP)** — your best guess at deal value
   - **Expected Close Date** — when you expect to win or lose
   - **Contact Person** — who you are speaking to at this company
   - **Notes** — any extra detail
3. Click **Create**.

The new lead appears in the **Active Lead** column of the Pipeline.

---

## 4. Working the Pipeline

### Pipeline Columns

| Column | Meaning |
|--------|---------|
| **Active Lead** (blue) | You are actively pursuing this lead |
| **Pending Approval** (orange) | Quote has been submitted internally for approval |
| **Quoted** (amber) | Quote approved and sent (or ready to send) to customer |
| **Won** (green) | Customer has accepted — deal is won |
| **Lost** (red) | Did not win the deal |
| **Dead Lead** (grey) | Not pursuing — parked or disqualified |

### Moving Cards

- **Drag and drop** a card from one column to another to change its status.
- Or click on a card to open the **Edit Opportunity** dialog and change the status dropdown.

### Marking a Lead as Dead

If you decide not to pursue a lead:

1. Drag the card to **Dead Lead**, or change the status in the Edit dialog.
2. You will be asked for a **reason**: No budget, Went with competitor, Project cancelled, No response, Not a fit, or Other.
3. Dead leads can be **revived** later — just drag them back to Active Lead.

---

## 5. Building a Quote

When you are ready to price up an opportunity:

1. On the opportunity card, click the **quote icon** (document icon). This opens the **Quote Builder** page.
2. The page shows:
   - The opportunity name and prospect at the top
   - A table of **Quote Line Items**
   - Cost and margin inputs at the bottom

### Adding Line Items

Click **"Add Line"** and fill in:

- **Description** — what the item is (e.g. "SR4 Flood Door 1200x2100")
- **Type** — `Product` (physical item) or `Activity` (service/labour)
- **Quantity**
- **Unit Cost (GBP)** — your cost per unit
- **Classification**:
  - `Standard` — normal catalogue/repeat item
  - `Innovate to Order` — bespoke/custom item (triggers extra approval step, see Section 6)

The system automatically calculates **Total Cost = Quantity x Unit Cost**.

### Configuring a Product from the Catalogue

If you are quoting a catalogued product (e.g. a standard door type):

1. Click **"Configure Product"** instead of manual entry.
2. Select the **product variant** from the catalogue.
3. Specify dimensions:
   - **Width** (mm), **Height** (mm), **Depth** (mm)
   - **Leaf Count** (single/double)
   - **Opening Direction** (LH / RH)
   - **Clear Opening** (mm) and **Structural Opening** (mm)
4. Configure options:
   - **Transome** — enable/disable, type, position, height, material
   - **Vent** — enable/disable, type, size, position, quantity, fire-rated
   - **Lock** — lock type, brand, model, cylinder type, handle type, keyed-alike grouping
   - **Finish** — coating standard, paint system, RAL/BS colour, galvanised options, DFT (dry film thickness)
5. The system calculates a **BOM (Bill of Materials)** and cost automatically.
6. Click **Add** to insert the configured line into your quote.

### Setting Costs and Margin

Below the line items table:

- **RD Cost** — any R&D surcharge (optional, GBP)
- **Risk Cost** — contingency or risk premium (optional, GBP)
- **Margin %** — your markup percentage (e.g. 25 for 25%)

The system calculates the **Quoted Price** automatically:

> **Quoted Price = (Line Items Total + RD Cost + Risk Cost) x (1 + Margin% / 100)**

Example: Line items = GBP 10,000, RD = GBP 500, Risk = GBP 300, Margin = 25%
> Quoted Price = (10,000 + 500 + 300) x 1.25 = **GBP 13,500**

### Lifting Plan (Heavy / Oversized Products)

If the products require special delivery or crane lifting:

1. Scroll to the **Lifting Plan** section on the Quote Builder page.
2. Set **Lifting Plan Required**: Yes / No / TBC
3. If Yes, fill in:
   - **Estimated Weight** (kg)
   - **Max Lift Height** (metres)
   - **Crane Required**: Yes / No / TBC
   - **Site Access Notes** — any restrictions (narrow lanes, weight limits, permitted hours)
   - **Lifting Plan Cost** (GBP) — surcharge added to the quote
   - **Delivery Notes** — special instructions for dispatch
4. Changes save automatically.

---

## 6. Quote Approval

### Submitting for Approval

When your quote is complete:

1. On the Quote Builder page, click **"Submit for Approval"**.
2. The quote locks — you cannot edit line items, costs, or margin while it is pending.
3. The opportunity automatically moves to **Pending Approval** in the Pipeline.

> **Note:** You must have at least one line item before you can submit.

### What Happens Next

- A **Sales Director** or **Admin** reviews your quote.
- If the quote contains any **Innovate to Order** lines, only a Sales Director or Admin can approve it.
- **Approved** — the quote is ready to send to the customer. The opportunity moves to **Quoted**.
- **Rejected** — the quote returns to Draft status. You will see a red "Rejected" badge. Make your revisions and resubmit.

### Checking Approval Status

The Quote Builder page shows the current status as a badge:

- **Draft** — still editing
- **Pending Approval** (orange badge) — waiting for sign-off
- **Approved** (green badge) — good to go
- **Rejected** (red badge) — needs revision

---

## 7. Winning a Deal

When the customer confirms they want to proceed:

1. **Move the card to WON** — drag it in the Pipeline, or change the status to "Won" in the Edit dialog.
2. Click on the opportunity card to open the Edit dialog.
3. Click **"Convert to Project"**.

### What "Convert to Project" Does

The system automatically creates everything needed for the project:

1. **Customer record** — if this prospect has not been converted before, a new Customer is created with the company name, contact details, and address from the Prospect.
2. **Project** — with an auto-generated project number (e.g. 100023), status set to DESIGN, contract value from your quoted price, and today's date as the order received date.
3. **Formal Quote** — a quote record attached to the project containing all your line items, marked as ACCEPTED.
4. **Products** — one product record per quote line, each with a job number (e.g. 100023-01, 100023-02).

After conversion, the opportunity card will show a link to the new project.

---

## 8. Handing Over to the Design Team

Once the project is created, you need to pass it to the design team:

1. Find the WON opportunity card in the Pipeline (it has a green "WON" badge).
2. Click the **"Hand over to designers"** button that appears on the card.
3. The button shows "Handing over..." while processing.
4. Once complete, it changes to a green checkmark: **"Handed to designers"**.

This activates the design workflow — design cards are created for each product, and the project appears on the **Design Board** for designers to start work.

> **Important:** Do not skip this step. Without clicking "Hand over to designers", the design team will not see the project on their board.

**Your part is done at this point.** The project now moves through Design, then on to Production.

---

## 9. Losing a Deal

If you do not win a deal:

1. Move the card to **Lost** in the Pipeline, or change the status to Lost in the Edit dialog.
2. Add a note about why you lost — useful for future reference and win/loss analysis.

Lost deals remain visible in the Lost column for review.

---

## 10. Editing an Opportunity

Click on any opportunity card to open the **Edit Opportunity** dialog. You can change:

- **Status** — Active Lead, Quoted, Won, Lost, Dead Lead
- **Name** and **Description**
- **Contact Person**
- **Lead Source**
- **Estimated Value** and **Expected Close Date**
- **Notes**

Click **Save** to apply changes.

You can also **Delete** an opportunity from this dialog if it was created in error.

---

## 11. Tips and Best Practices

1. **Always create the Prospect first** — you cannot create a lead without a parent company.
2. **Keep estimated values up to date** — this feeds into business forecasting and pipeline reports.
3. **Use the Notes field** — record key conversations, competitor information, or customer requirements. Notes are visible to the whole team.
4. **Set realistic close dates** — helps management forecast the pipeline accurately.
5. **Use the correct Lead Source** — helps track which channels generate the most business.
6. **Mark dead leads with a clear reason** — do not leave stale leads sitting in Active Lead. Dead leads can always be revived later.
7. **Check quote approval status regularly** — if your quote has been pending for too long, follow up with the Sales Director.
8. **Convert as soon as you win** — the sooner you convert and hand over, the sooner the project enters design.
9. **Always complete the designer handover** — after converting to a project, click "Hand over to designers". This is a separate step from converting.
10. **Use the Table view for searching** — if you need to find a specific opportunity quickly, switch to Table view and use the search bar.

---

## 12. The Full Process at a Glance

```
1. CREATE PROSPECT (company)
        |
2. CREATE LEAD (opportunity/deal)
        |
3. BUILD QUOTE (add line items, set margin)
        |
4. SUBMIT FOR APPROVAL
        |
5. SALES DIRECTOR APPROVES
        |
6. SEND QUOTE TO CUSTOMER (status: QUOTED)
        |
    Customer says YES?
      /          \
   YES            NO
    |              |
7. MARK AS WON   MARK AS LOST
    |
8. CONVERT TO PROJECT
    |
9. HAND OVER TO DESIGNERS
    |
   DONE - project enters Design phase
```

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| **Prospect** | A company you are pursuing as a potential customer |
| **Opportunity / Lead** | A specific deal or enquiry from a prospect |
| **Quote Line** | An individual item on a quote (product or service) |
| **ITO (Innovate to Order)** | A bespoke/custom item requiring Sales Director approval |
| **RD Cost** | Research & Development surcharge added to the quote |
| **Risk Cost** | Contingency/risk premium added to the quote |
| **Margin %** | Markup percentage applied on top of total cost |
| **Quoted Price** | Final price presented to the customer (cost + margin) |
| **BOM** | Bill of Materials — components needed to build a product |
| **Lifting Plan** | Delivery and crane plan for heavy or oversized products |
| **DFT** | Dry Film Thickness — paint coating thickness in microns |
| **RAL / BS Colour** | European (RAL) or British Standard (BS) colour reference codes |
| **Pipeline** | The Kanban board showing all opportunities by status |
| **Convert** | Turning a won opportunity into a formal project with products |
| **Handover** | Passing a converted project from sales to the design team |

---

*ETHOS MK.I — CRM Salesman Handbook v1.0*
