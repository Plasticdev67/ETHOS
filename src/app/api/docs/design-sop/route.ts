import { NextResponse } from "next/server"
import PDFDocument from "pdfkit"

// MME brand colours
const NAVY = "#23293a"
const CORAL = "#e95445"
const CYAN = "#00b1eb"
const DARK_GRAY = "#333333"
const MID_GRAY = "#666666"
const LIGHT_GRAY = "#999999"

export async function GET() {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 50, right: 50 },
    info: {
      Title: "ETHOS Design Process — Standard Operating Procedure",
      Author: "MM Engineered Solutions",
      Subject: "Design Process SOP v1.0",
    },
  })

  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  })

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right

  // --- Helper functions ---
  function addHeader() {
    // Dark navy header bar
    doc
      .save()
      .rect(0, 0, doc.page.width, 90)
      .fill(NAVY)

    // MME logo text
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#ffffff")
      .text("MME", 50, 25, { continued: true })
      .font("Helvetica")
      .fontSize(12)
      .text("  MM Engineered Solutions", { baseline: "middle" })

    // Coral accent line
    doc
      .rect(0, 90, doc.page.width, 3)
      .fill(CORAL)

    doc.restore()
    doc.y = 110
  }

  function addFooter(pageNum: number) {
    const y = doc.page.height - 40
    doc
      .save()
      .rect(0, y - 5, doc.page.width, 1)
      .fill(CORAL)
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(LIGHT_GRAY)
      .text("ETHOS Design Process SOP v1.0", 50, y, { width: pageWidth / 2 })
      .text(`Page ${pageNum}`, 50 + pageWidth / 2, y, { width: pageWidth / 2, align: "right" })
    doc.restore()
  }

  let pageNum = 1

  doc.on("pageAdded", () => {
    pageNum++
    addHeader()
    addFooter(pageNum)
  })

  // --- First page ---
  addHeader()
  addFooter(1)

  // Title page content
  doc.y = 200

  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(NAVY)
    .text("Design Process", { align: "center" })
    .fontSize(28)
    .fillColor(CORAL)
    .text("Standard Operating Procedure", { align: "center" })

  doc.moveDown(2)

  // Coral divider
  const dividerX = (doc.page.width - 100) / 2
  doc
    .rect(dividerX, doc.y, 100, 2)
    .fill(CORAL)

  doc.moveDown(2)

  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor(MID_GRAY)
    .text("Module: Design", { align: "center" })
    .text("Version: 1.0", { align: "center" })
    .text("Last Updated: February 2026", { align: "center" })

  doc.moveDown(4)

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(LIGHT_GRAY)
    .text("CONFIDENTIAL — MM Engineered Solutions", { align: "center" })

  // --- Content pages ---
  doc.addPage()

  function sectionHeading(text: string) {
    if (doc.y > doc.page.height - 150) doc.addPage()
    doc.moveDown(0.5)
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(NAVY)
      .text(text)
    // Coral underline
    doc
      .rect(doc.page.margins.left, doc.y + 2, pageWidth, 1.5)
      .fill(CORAL)
    doc.moveDown(0.8)
  }

  function subHeading(text: string) {
    if (doc.y > doc.page.height - 120) doc.addPage()
    doc.moveDown(0.3)
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(CORAL)
      .text(text)
    doc.moveDown(0.3)
  }

  function subSubHeading(text: string) {
    if (doc.y > doc.page.height - 100) doc.addPage()
    doc.moveDown(0.2)
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(DARK_GRAY)
      .text(text)
    doc.moveDown(0.2)
  }

  function para(text: string) {
    if (doc.y > doc.page.height - 80) doc.addPage()
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(DARK_GRAY)
      .text(text, { lineGap: 3 })
    doc.moveDown(0.4)
  }

  function bullet(text: string, indent = 0) {
    if (doc.y > doc.page.height - 80) doc.addPage()
    const x = doc.page.margins.left + 10 + indent * 15
    const bulletWidth = pageWidth - 10 - indent * 15 - 10
    // Bullet dot
    doc
      .circle(x, doc.y + 5, 2)
      .fill(indent > 0 ? LIGHT_GRAY : CORAL)
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(DARK_GRAY)
      .text(text, x + 8, doc.y, { width: bulletWidth, lineGap: 2 })
    doc.moveDown(0.2)
  }

  function boldBullet(label: string, desc: string, indent = 0) {
    if (doc.y > doc.page.height - 80) doc.addPage()
    const x = doc.page.margins.left + 10 + indent * 15
    const bulletWidth = pageWidth - 10 - indent * 15 - 10
    doc
      .circle(x, doc.y + 5, 2)
      .fill(indent > 0 ? LIGHT_GRAY : CORAL)
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(DARK_GRAY)
      .text(label + " ", x + 8, doc.y, { width: bulletWidth, continued: true })
      .font("Helvetica")
      .text(desc, { lineGap: 2 })
    doc.moveDown(0.2)
  }

  function tableRow(cells: string[], isHeader = false) {
    if (doc.y > doc.page.height - 80) doc.addPage()
    const colWidth = pageWidth / cells.length
    const startY = doc.y
    const font = isHeader ? "Helvetica-Bold" : "Helvetica"
    const bg = isHeader ? NAVY : undefined
    const fg = isHeader ? "#ffffff" : DARK_GRAY

    if (bg) {
      doc.rect(doc.page.margins.left, startY, pageWidth, 20).fill(bg)
    }

    cells.forEach((cell, i) => {
      doc
        .font(font)
        .fontSize(9)
        .fillColor(fg)
        .text(cell, doc.page.margins.left + i * colWidth + 4, startY + 5, {
          width: colWidth - 8,
          height: 14,
          ellipsis: true,
        })
    })

    doc.y = startY + 20

    // Row border
    doc
      .rect(doc.page.margins.left, doc.y, pageWidth, 0.5)
      .fill("#e0e0e0")
  }

  // ============================================
  // SECTION 1: Overview
  // ============================================
  sectionHeading("1. Overview")
  para(
    "The ETHOS Design module manages the complete lifecycle of engineering design work — from the moment a project enters the design phase through to formal handover to production. Every product on a project gets its own Design Card with four sequential Job Cards that must be completed in order."
  )

  // ============================================
  // SECTION 2: Roles
  // ============================================
  sectionHeading("2. Who Does What")

  tableRow(["Role", "Permissions"], true)
  tableRow(["Engineering Manager", "Activate, assign, start/review/approve/reject, sign off, handover"])
  tableRow(["Project Manager / Coordinator", "Activate design, assign designers, propose handover"])
  tableRow(["Design Engineer", "Start jobs, submit for review, approve/reject peer work"])
  tableRow(["R&D Manager", "Start jobs, submit for review"])
  tableRow(["Production Manager", "Acknowledge or reject handovers"])
  tableRow(["Directors (MD, TD)", "All of the above including sign-off and handover"])

  doc.moveDown(0.5)
  para("Key distinction: Design Engineers can start, submit, and peer-review work. Only Engineering Manager and Directors can sign off — this is the senior quality gate.")

  // ============================================
  // SECTION 3: Design Lifecycle
  // ============================================
  sectionHeading("3. The Design Lifecycle — Step by Step")

  // Step 1
  subHeading("Step 1: Project Enters Design")
  para("A project reaches the \"Design\" stage (via the projects board or after a quote converts to a project). Products have been defined but no design work has started. The project appears in the Waiting column on the Design Board.")

  // Step 2
  subHeading("Step 2: Activate Design")
  para("Who: Engineering Manager, Project Manager, Project Coordinator, or Admin")
  para("On the Design Board, click the project in the Waiting column and select Activate Design.")
  para("What happens in the system:")
  bullet("One Design Card is created for each product on the project")
  bullet("Each Design Card gets 4 Job Cards in fixed order:")
  bullet("GA Drawing", 1)
  bullet("Production Drawings", 1)
  bullet("BOM Finalisation", 1)
  bullet("Design Review", 1)
  bullet("The first job (GA Drawing) is set to Ready — the rest are Blocked")
  bullet("Target dates are auto-calculated based on the project deadline")

  // Step 3
  subHeading("Step 3: Assign a Designer")
  para("Who: Engineering Manager, Project Manager, Project Coordinator, or Admin")
  para("From the Design Board, click Assign on a design card. Two options:")
  boldBullet("Quick assign —", "assigns one designer to the entire card (all 4 jobs)")
  boldBullet("Granular assign —", "opens the Assign Jobs dialog where you can assign different designers to individual job cards and set deadlines per job")
  para("When a designer is assigned and the card was in the queue, it moves to In Progress. The actual start date is recorded. The designer sees the work on their My Work view.")
  para("Valid designers: Only users with Design Engineer, Engineering Manager, R&D Manager, or Admin roles can be assigned design work.")

  // Step 4
  subHeading("Step 4: Start a Job Card")
  para("Who: The assigned designer (Design Engineer, Engineering Manager, R&D Manager)")
  para("The designer opens their assigned job card and clicks Start. This is only available when the job status is Ready (or Rejected for rework).")
  bullet("Job card moves to In Progress")
  bullet("Start timestamp recorded")

  // Step 5
  subHeading("Step 5: Submit for Review")
  para("Who: The designer working on the job")
  para("When the designer finishes their work, they click Submit for Review. They can optionally add review notes and log actual hours spent.")
  bullet("Job card moves to Submitted")
  bullet("The parent Design Card moves to Review status")
  bullet("The submission timestamp is recorded")

  // Step 6
  subHeading("Step 6: Review the Submission")
  para("A reviewer (Engineering Manager, senior designer, or peer) reviews the submitted work. Two outcomes:")

  subSubHeading("Step 6a: Approve")
  bullet("Job card moves to Approved")
  bullet("The next job card in sequence automatically unlocks (Blocked → Ready)")
  bullet("The Design Card moves back to In Progress")

  subSubHeading("Step 6b: Reject")
  para("Click Reject — you must provide a rejection reason explaining what needs to be fixed.")
  bullet("Job card moves to Rejected with the reason recorded")
  bullet("The Design Card moves back to In Progress")
  bullet("The designer sees the rejection reason and a Re-work button")
  bullet("Clicking Re-work starts the job again from In Progress")

  // Step 7
  subHeading("Step 7: Sign Off")
  para("Who: Engineering Manager, Managing Director, Technical Director, or Admin only")
  para("After a job card is approved, a senior authority can Sign Off — this is the final quality gate.")
  bullet("Job card moves to Signed Off")
  bullet("If all 4 job cards are signed off: Design Card → Complete, actual end date recorded")
  bullet("If all design cards on the project are complete: project advances to Design Freeze")

  // Step 8
  subHeading("Step 8: Propose Handover to Production")
  para("Who: Engineering Manager, Project Manager, Project Coordinator, or Directors")
  para("Once design cards are complete, click Propose Handover on the Design Board. The handover includes:")
  bullet("A checklist: all GA drawings approved, production drawings signed off, BOM finalised, design review completed, drawing numbers assigned")
  bullet("Design notes (special instructions for production)")
  bullet("Partial handover support — hand over completed products while others are still in design")
  para("A handover record is created with status Submitted. Production team is notified.")

  // Step 9
  subHeading("Step 9: Production Acknowledges or Rejects")
  para("Who: Production Manager, Directors, or Admin")

  subSubHeading("Acknowledge")
  bullet("Handover status → Acknowledged")
  bullet("For each handed-over product: a Production Task is created (starting at Cutting stage)")
  bullet("Product's department changes from Design to Production")
  bullet("If all products handed over: project status advances to Manufacture")

  subSubHeading("Reject")
  bullet("Handover status → Rejected with reason recorded")
  bullet("No production tasks are created")
  bullet("Design team must address issues and resubmit the handover")

  // ============================================
  // SECTION 4: NCR Rework
  // ============================================
  sectionHeading("4. NCR Rework (Post-Handover)")
  para("If a Non-Conformance Report (NCR) is raised that requires design to redo work after production has already started:")
  bullet("An NCR rework is triggered against the design card")
  bullet("Specified job cards are reset back to In Progress / Ready")
  bullet("The Design Card reverts to In Progress")
  bullet("If the handover was already acknowledged, it reverts to Draft")
  bullet("Design must complete the rework and resubmit the handover")

  // ============================================
  // SECTION 5: BOM Management
  // ============================================
  sectionHeading("5. BOM Management")
  para("Each Design Card has an associated Bill of Materials (BOM) accessible from the BOM editor.")
  bullet("Auto-populated on first access from the product's catalogue item or keyword-matched template")
  boldBullet("Categories:", "Materials, Labour, Hardware, Seals, Finish, Other")
  boldBullet("Each line:", "description, part number, supplier, quantity, unit, unit cost, notes")
  bullet("BOM is managed during the BOM Finalisation job card stage but can be edited at any time")

  // ============================================
  // SECTION 6: Job Card Dependency Chain
  // ============================================
  sectionHeading("6. Job Card Dependency Chain")
  para("Jobs must be completed in strict sequential order. A job cannot start until the previous one is approved or signed off.")
  doc.moveDown(0.3)

  // Visual chain
  const chainItems = ["GA Drawing", "Production Drawings", "BOM Finalisation", "Design Review", "DESIGN CARD COMPLETE"]
  const boxWidth = 160
  const boxHeight = 28
  const chainX = (doc.page.width - boxWidth) / 2

  chainItems.forEach((item, i) => {
    if (doc.y > doc.page.height - 100) doc.addPage()
    const isLast = i === chainItems.length - 1
    const bg = isLast ? CORAL : NAVY

    doc
      .roundedRect(chainX, doc.y, boxWidth, boxHeight, 4)
      .fill(bg)
    doc
      .font(isLast ? "Helvetica-Bold" : "Helvetica")
      .fontSize(9)
      .fillColor("#ffffff")
      .text(item, chainX, doc.y - boxHeight + 9, { width: boxWidth, align: "center" })

    doc.y += 4

    if (!isLast) {
      // Arrow
      const arrowX = doc.page.width / 2
      doc
        .moveTo(arrowX, doc.y)
        .lineTo(arrowX, doc.y + 12)
        .stroke(CYAN)
      doc
        .moveTo(arrowX - 4, doc.y + 8)
        .lineTo(arrowX, doc.y + 14)
        .lineTo(arrowX + 4, doc.y + 8)
        .fill(CYAN)
      doc.y += 16
    }
  })

  doc.moveDown(1)

  // ============================================
  // SECTION 7: Status Reference
  // ============================================
  sectionHeading("7. Status Reference")

  subHeading("Design Card Statuses")
  tableRow(["Status", "Meaning"], true)
  tableRow(["Queued", "Design activated, waiting for designer assignment"])
  tableRow(["In Progress", "Designer assigned, job cards being worked on"])
  tableRow(["Review", "A job card has been submitted for review"])
  tableRow(["Complete", "All 4 job cards signed off"])
  tableRow(["On Hold", "Manually paused"])

  doc.moveDown(0.5)

  subHeading("Job Card Statuses")
  tableRow(["Status", "Meaning"], true)
  tableRow(["Blocked", "Waiting for previous job to be approved"])
  tableRow(["Ready", "Can be started"])
  tableRow(["In Progress", "Designer actively working"])
  tableRow(["Submitted", "Sent for review"])
  tableRow(["Approved", "Reviewer approved — unlocks next job"])
  tableRow(["Rejected", "Reviewer rejected — needs rework"])
  tableRow(["Signed Off", "Senior sign-off complete"])

  doc.moveDown(0.5)

  subHeading("Handover Statuses")
  tableRow(["Status", "Meaning"], true)
  tableRow(["Draft", "Not yet submitted (or reverted by NCR)"])
  tableRow(["Submitted", "Awaiting production acknowledgement"])
  tableRow(["Acknowledged", "Production accepted — tasks created"])
  tableRow(["Rejected", "Production rejected — design must resubmit"])

  // ============================================
  // SECTION 8: Navigation
  // ============================================
  sectionHeading("8. Where to Find Things in ETHOS")
  tableRow(["What", "Where"], true)
  tableRow(["Design Board (Kanban)", "/design — main view"])
  tableRow(["My Work (designer's view)", "/design → My Work tab"])
  tableRow(["Workload overview", "/design → Workload tab"])
  tableRow(["Assign designers", "Click a card on the board → Assign"])
  tableRow(["BOM editor", "Click into a design card → BOM tab"])
  tableRow(["Handover form", "Design Board → Propose Handover"])
  tableRow(["Pending handovers", "/design → Handovers tab"])
  tableRow(["Overdue cards", "/design → Overdue section"])

  // ============================================
  // SECTION 9: Auto Progression
  // ============================================
  sectionHeading("9. Automatic Project Status Progression")
  para("The design module automatically advances the project through these stages:")
  boldBullet("Design —", "project has products awaiting design work")
  boldBullet("Design Freeze —", "all design cards complete, all job cards signed off")
  boldBullet("Manufacture —", "handover acknowledged, production tasks created")
  para("No manual status changes needed — the system tracks completion and advances automatically.")

  // Finalize
  doc.end()

  const pdfBuffer = await pdfReady

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="ETHOS-Design-Process-SOP-v1.0.pdf"',
    },
  })
}
