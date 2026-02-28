# ETHOS Design Process — Standard Operating Procedure

**Module:** Design
**Version:** 1.0
**Last updated:** 2026-02-28

---

## 1. Overview

The ETHOS Design module manages the complete lifecycle of engineering design work — from the moment a project enters the design phase through to formal handover to production. Every product on a project gets its own **Design Card** with four sequential **Job Cards** that must be completed in order.

---

## 2. Who Does What

| Role | What they can do |
|---|---|
| **Engineering Manager** | Activate design, assign designers, start/review/approve/reject jobs, sign off jobs, propose handover |
| **Project Manager / Coordinator** | Activate design, assign designers, propose handover |
| **Design Engineer** | Start jobs, submit for review, approve/reject peer work |
| **R&D Manager** | Start jobs, submit for review |
| **Production Manager** | Acknowledge or reject handovers from design |
| **Directors (MD, TD)** | All of the above including sign-off and handover acknowledgement |

**Key distinction:** Design Engineers can start, submit, and peer-review work. Only Engineering Manager and Directors can **sign off** — this is the senior quality gate.

---

## 3. The Design Lifecycle — Step by Step

### Step 1: Project Enters Design

A project reaches the "Design" stage (via the projects board or after a quote converts to a project). Products have been defined but no design work has started. The project appears in the **Waiting** column on the Design Board (`/design`).

### Step 2: Activate Design

**Who:** Engineering Manager, Project Manager, Project Coordinator, or Admin

On the Design Board, click the project in the Waiting column and select **Activate Design**.

**What happens in the system:**
- One **Design Card** is created for each product on the project
- Each Design Card gets **4 Job Cards** in fixed order:
  1. GA Drawing
  2. Production Drawings
  3. BOM Finalisation
  4. Design Review
- The first job (GA Drawing) is set to **Ready** — the rest are **Blocked** until the previous job is approved
- Target dates are auto-calculated based on the project deadline

### Step 3: Assign a Designer

**Who:** Engineering Manager, Project Manager, Project Coordinator, or Admin

From the Design Board, click **Assign** on a design card. Two options:

- **Quick assign** — assigns one designer to the entire card (all 4 jobs)
- **Granular assign** — opens the Assign Jobs dialog where you can assign different designers to individual job cards and set deadlines per job

**What happens:**
- When a designer is assigned and the card was in the queue, it moves to **In Progress**
- The actual start date is recorded
- The designer sees the work on their **My Work** view

**Valid designers:** Only users with Design Engineer, Engineering Manager, R&D Manager, or Admin roles can be assigned design work.

### Step 4: Start a Job Card

**Who:** The assigned designer (Design Engineer, Engineering Manager, R&D Manager)

The designer opens their assigned job card and clicks **Start**. This is only available when the job status is **Ready** (or **Rejected** for rework — see Step 7b).

**What happens:**
- Job card moves to **In Progress**
- Start timestamp recorded

### Step 5: Submit for Review

**Who:** The designer working on the job

When the designer finishes their work, they click **Submit for Review**. They can optionally add review notes and log actual hours spent.

**What happens:**
- Job card moves to **Submitted**
- The parent Design Card moves to **Review** status
- The submission timestamp is recorded

### Step 6: Review the Submission

A reviewer (Engineering Manager, senior designer, or peer) reviews the submitted work. Two outcomes:

#### Step 6a: Approve

Click **Approve** on the submitted job card. Optionally add review notes.

**What happens:**
- Job card moves to **Approved**
- The **next job card** in sequence automatically unlocks (moves from Blocked to Ready)
  - e.g. approving GA Drawing unlocks Production Drawings
- The Design Card moves back to **In Progress**

#### Step 6b: Reject

Click **Reject** — you **must** provide a rejection reason explaining what needs to be fixed.

**What happens:**
- Job card moves to **Rejected** with the reason recorded
- The Design Card moves back to **In Progress**
- The designer sees the rejection reason and a **Re-work** button
- Clicking Re-work starts the job again from In Progress (rejection timestamps are cleared)

### Step 7: Sign Off

**Who:** Engineering Manager, Managing Director, Technical Director, or Admin only

After a job card is approved, a senior authority can **Sign Off** — this is the final quality gate.

**What happens:**
- Job card moves to **Signed Off**
- If **all 4 job cards** on the design card are now signed off:
  - The Design Card moves to **Complete**
  - The actual end date is recorded
- If **all design cards** across the entire project are complete:
  - The project automatically advances to **Design Freeze** status

### Step 8: Propose Handover to Production

**Who:** Engineering Manager, Project Manager, Project Coordinator, or Directors

Once design cards are complete, click **Propose Handover** on the Design Board. This opens the handover form.

**The handover includes:**
- A checklist (auto-populated):
  - All GA drawings approved
  - All production drawings signed off
  - BOM finalised for all products
  - Design review completed
  - Drawing numbers assigned
- Design notes (any special instructions for production)
- Which products to include (supports **partial handover** — hand over completed products while others are still in design)

**What happens:**
- A handover record is created with status **Submitted**
- Production team is notified

### Step 9: Production Acknowledges or Rejects

**Who:** Production Manager, Directors, or Admin

#### Acknowledge

Production Manager reviews the handover package and clicks **Acknowledge**.

**What happens:**
- Handover status moves to **Acknowledged**
- For each handed-over product:
  - A **Production Task** is automatically created (starting at Cutting stage)
  - The product's department changes from Design to Production
- If all products are handed over:
  - Project status advances to **Manufacture**

#### Reject

If the handover package isn't ready, Production Manager clicks **Reject** with a reason.

**What happens:**
- Handover status moves to **Rejected** with reason recorded
- No production tasks are created
- Design team must address the issues and **resubmit** the handover

---

## 4. NCR Rework (Post-Handover Design Changes)

If a Non-Conformance Report (NCR) is raised that requires design to redo work after production has already started:

1. An NCR rework is triggered against the design card
2. Specified job cards are reset back to In Progress / Ready
3. The Design Card reverts to In Progress
4. If the handover was already acknowledged, it reverts to Draft
5. Design must complete the rework and resubmit the handover

---

## 5. BOM Management

Each Design Card has an associated Bill of Materials (BOM) accessible from the BOM editor.

- **Auto-populated** on first access from the product's catalogue item or keyword-matched template
- **Categories:** Materials, Labour, Hardware, Seals, Finish, Other
- **Each line:** description, part number, supplier, quantity, unit, unit cost, notes
- BOM is managed during the BOM Finalisation job card stage but can be edited at any time

---

## 6. Job Card Dependency Chain

Jobs must be completed in strict sequential order. A job cannot start until the previous one is approved or signed off.

```
GA Drawing (Ready immediately)
    |
    v  [Approved/Signed Off]
Production Drawings
    |
    v  [Approved/Signed Off]
BOM Finalisation
    |
    v  [Approved/Signed Off]
Design Review
    |
    v  [All 4 Signed Off]
Design Card = COMPLETE
```

---

## 7. Status Reference

### Design Card Statuses
| Status | Meaning |
|---|---|
| **Queued** | Design activated, waiting for designer assignment |
| **In Progress** | Designer assigned, job cards being worked on |
| **Review** | A job card has been submitted for review |
| **Complete** | All 4 job cards signed off |
| **On Hold** | Manually paused |

### Job Card Statuses
| Status | Meaning |
|---|---|
| **Blocked** | Waiting for previous job to be approved |
| **Ready** | Can be started |
| **In Progress** | Designer actively working |
| **Submitted** | Sent for review |
| **Approved** | Reviewer approved — unlocks next job |
| **Rejected** | Reviewer rejected — needs rework |
| **Signed Off** | Senior sign-off complete |

### Handover Statuses
| Status | Meaning |
|---|---|
| **Draft** | Not yet submitted (or reverted by NCR) |
| **Submitted** | Awaiting production acknowledgement |
| **Acknowledged** | Production accepted — tasks created |
| **Rejected** | Production rejected — design must resubmit |

---

## 8. Where to Find Things in ETHOS

| What | Where |
|---|---|
| Design Board (Kanban) | `/design` — main view |
| My Work (designer's view) | `/design` → My Work tab |
| Workload overview | `/design` → Workload tab |
| Assign designers | Click a card on the board → Assign |
| BOM editor | Click into a design card → BOM tab |
| Handover form | Design Board → Propose Handover on a completed project |
| Pending handovers (production side) | `/design` → Handovers tab |
| Overdue cards | `/design` → Overdue section |

---

## 9. Automatic Project Status Progression

The design module automatically advances the project through these stages:

1. **Design** — project has products awaiting design work
2. **Design Freeze** — all design cards complete, all job cards signed off
3. **Manufacture** — handover acknowledged, production tasks created

No manual status changes needed — the system tracks completion and advances automatically.
