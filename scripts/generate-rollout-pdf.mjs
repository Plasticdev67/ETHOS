/**
 * ETHOS Rollout & Operational Readiness PDF Report — MME Brand Design
 * Follows same template as audit report: PX Grotesk font, SVG logo, navy/coral theming
 * Usage: node scripts/generate-rollout-pdf.mjs [output.pdf]
 */
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = JSON.parse(readFileSync(resolve(__dirname, 'pdf-assets.json'), 'utf8'));
const OUTPUT = process.argv[2] || 'ETHOS-Rollout-Plan.pdf';

// ── Brand ───────────────────────────────────────────────────────────────
const NAVY = '#23293a';
const CORAL = '#e95445';
const GREEN = '#4ade80';
const WHITE = '#ffffff';
const LGRAY = '#f8f9fa';
const MGRAY = '#999';

// ── Logo SVGs ───────────────────────────────────────────────────────────
const logoWhite = assets.svgLogoWhite.replace(/width="[^"]*"/, 'width="200"').replace(/height="[^"]*"/, 'height="29"');
const logoHeaderWhite = assets.svgLogoWhite.replace(/width="[^"]*"/, 'width="150"').replace(/height="[^"]*"/, 'height="22"');

// ── Helpers ─────────────────────────────────────────────────────────────
function header() {
  return `<div class="page-header">
    <div class="hdr-bar"><div class="hdr-inner">${logoHeaderWhite}<span class="hdr-title">ETHOS Rollout &amp; Operational Readiness Plan</span></div></div>
    <div class="hdr-line"></div>
  </div>`;
}
function footer(n, total) {
  return `<div class="page-footer"><span class="ft-left">ETHOS&nbsp;&nbsp;|&nbsp;&nbsp;MM Engineered Solutions&nbsp;&nbsp;|&nbsp;&nbsp;CONFIDENTIAL</span><span class="ft-right">${n} / ${total}</span></div>`;
}
function tbl(heads, rows) {
  return `<table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr${i%2?` class="alt"`:''}>` + r.map(c=>`<td>${c}</td>`).join('') + '</tr>').join('')}</tbody></table>`;
}
function bq(t) { return `<blockquote>${t}</blockquote>`; }

// ── Total pages ─────────────────────────────────────────────────────────
const TOTAL = 14;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@font-face { font-family:'PX Grotesk'; font-weight:300; src:url(data:font/woff2;base64,${assets.fontLightB64}) format('woff2'); }
@font-face { font-family:'PX Grotesk'; font-weight:400; src:url(data:font/woff2;base64,${assets.fontRegularB64}) format('woff2'); }
@font-face { font-family:'PX Grotesk'; font-weight:700; src:url(data:font/woff2;base64,${assets.fontBoldB64}) format('woff2'); }

@page { size: A4; margin: 0; }
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'PX Grotesk','Segoe UI',sans-serif; font-size:10.5px; line-height:1.6; color:${NAVY}; }

/* ── Cover ─────────────────────────────────── */
.cover { width:100%; min-height:100vh; background:${NAVY}; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; page-break-after:always; padding:60px 40px; position:relative; }
.cover .logo-wrap { margin-bottom:30px; }
.cover .divider { width:60px; height:3px; background:${CORAL}; margin:20px auto; }
.cover h1 { font-size:36px; font-weight:700; color:${WHITE}; margin:20px 0 8px; }
.cover .subtitle { font-size:17px; color:${CORAL}; font-weight:300; margin-bottom:40px; }
.cover .status-badge { display:inline-block; border:2px solid ${CORAL}; border-radius:6px; padding:12px 30px; margin:10px 0 50px; }
.cover .status-text { font-size:22px; font-weight:700; color:${CORAL}; letter-spacing:2px; }
.cover .meta { color:${GREEN}; font-size:12px; line-height:1.8; font-weight:300; }
.cover .confidential { position:absolute; bottom:50px; color:${GREEN}; font-size:11px; letter-spacing:1px; font-weight:400; }

/* ── Page layout ──────────────────────────── */
.page { position:relative; min-height:100vh; padding:0; page-break-after:always; display:flex; flex-direction:column; }
.page:last-child { page-break-after:auto; }
.page-header { flex-shrink:0; }
.hdr-bar { background:${NAVY}; padding:14px 40px; display:flex; align-items:center; }
.hdr-inner { width:100%; display:flex; justify-content:space-between; align-items:center; }
.hdr-title { color:${GREEN}; font-size:10px; font-weight:300; }
.hdr-line { height:3px; background:${CORAL}; }
.page-content { flex:1; padding:30px 50px 20px; }
.page-footer { flex-shrink:0; padding:10px 50px 14px; display:flex; justify-content:space-between; font-size:8px; color:${MGRAY}; font-weight:300; }

/* ── Typography ───────────────────────────── */
h2 { font-size:22px; font-weight:700; color:${NAVY}; border-left:4px solid ${CORAL}; padding-left:14px; margin:0 0 14px; line-height:1.3; }
h3 { font-size:14px; font-weight:700; color:${CORAL}; margin:20px 0 8px; }
h4 { font-size:11px; font-weight:700; color:${NAVY}; margin:14px 0 6px; }
p { margin:6px 0; font-weight:300; }
strong { font-weight:700; color:${NAVY}; }

/* ── Tables ───────────────────────────────── */
table { width:100%; border-collapse:collapse; margin:10px 0 14px; font-size:10px; page-break-inside:avoid; }
th { background:${NAVY}; color:${WHITE}; padding:7px 10px; text-align:left; font-weight:400; font-size:9.5px; }
td { padding:6px 10px; border-bottom:1px solid #e5e7eb; font-weight:300; vertical-align:top; }
tr.alt { background:${LGRAY}; }

/* ── Blockquotes ──────────────────────────── */
blockquote { border-left:3px solid ${CORAL}; background:${LGRAY}; padding:10px 14px; margin:10px 0; font-size:10px; color:#374151; font-weight:300; page-break-inside:avoid; }

/* ── Lists ────────────────────────────────── */
ul { margin:6px 0 6px 20px; list-style:none; }
ul li { position:relative; padding-left:14px; margin:4px 0; font-weight:300; }
ul li::before { content:''; position:absolute; left:0; top:7px; width:6px; height:6px; border-radius:50%; background:${CORAL}; }

code { background:#f0f0f0; padding:1px 4px; border-radius:3px; font-size:9.5px; font-family:Consolas,monospace; color:${CORAL}; }
.contents ul { list-style:none; margin:0; padding:0; }
.contents li { padding:8px 0; border-bottom:1px solid #f0f0f0; font-size:13px; font-weight:300; }
.contents li::before { display:none; }
hr { border:none; border-top:1px solid #ddd; margin:14px 0; }

/* ── Flow diagram ────────────────────────── */
.flow-chain { background:${LGRAY}; border-radius:6px; padding:16px 20px; margin:10px 0; font-size:10px; font-family:Consolas,monospace; line-height:1.8; }
.flow-chain .arrow { color:${CORAL}; font-weight:700; }
.flow-chain .role { color:${NAVY}; font-weight:700; }
.flow-chain .action { color:${MGRAY}; font-weight:300; }
</style></head><body>

<!-- ═══ COVER ═══ -->
<div class="cover">
  <div class="logo-wrap">${logoWhite}</div>
  <div class="divider"></div>
  <h1>Rollout &amp; Operational<br>Readiness Plan</h1>
  <div class="subtitle">ETHOS — ERP / Project Management Platform</div>
  <div class="status-badge">
    <div class="status-text">PRE-ROLLOUT</div>
  </div>
  <div class="meta">
    Document: ETHOS-ROLLOUT-001&nbsp;&nbsp;|&nbsp;&nbsp;Version 1.0<br>
    3 March 2026<br><br>
    Prepared for MM Engineered Solutions Ltd<br>
    Port Talbot, Wales
  </div>
  <div class="confidential">CONFIDENTIAL — Internal Use Only</div>
</div>

<!-- ═══ CONTENTS ═══ -->
<div class="page">${header()}<div class="page-content contents">
  <h2>Contents</h2>
  <ul>
    <li>1. Executive Summary</li>
    <li>2. System Roles &amp; Accountability</li>
    <li>3. Non-System Roles</li>
    <li>4. Production: Work Logging &amp; Operations</li>
    <li>5. Process Changes Required</li>
    <li>6. Rollout Sequence</li>
    <li>7. Hardware &amp; Infrastructure</li>
    <li>8. What Kills Adoption (and How to Prevent It)</li>
    <li>9. Planned System Features Supporting Rollout</li>
    <li>10. Success Metrics</li>
  </ul>
</div>${footer(2, TOTAL)}</div>

<!-- ═══ 1. EXECUTIVE SUMMARY ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>1. Executive Summary</h2>
  <p>ETHOS manages MME's full project lifecycle: sales enquiry → design → production → installation → close-out. It enforces workflow gates, handover processes, and approval chains that require specific people in specific roles to function.</p>
  <p>This document defines the <strong>human infrastructure, process changes, and rollout sequence</strong> needed to make ETHOS adoption successful.</p>
  ${bq('The system is built. The risk is not technology — it\'s <strong>adoption</strong>. Without the right people, processes, and discipline, ETHOS becomes another unused tool and the team reverts to Sage, spreadsheets, and email.')}
  <h3>What This Document Covers</h3>
  <ul>
    <li><strong>9 system roles</strong> mapped to 12 critical workflow gates — every gate needs a named person</li>
    <li><strong>3 non-system roles</strong> (System Champion, Data Custodian, Stores Person) essential for day-to-day operations</li>
    <li><strong>Operation-level work logging</strong> — tracking who worked on what, for how long, at what stage</li>
    <li><strong>5 process changes</strong> required for adoption (No PO No Order, daily standups, formal handovers)</li>
    <li><strong>5-phase rollout sequence</strong> over 9+ weeks, department by department</li>
    <li><strong>Hardware requirements</strong> for shop floor and goods-in areas</li>
    <li><strong>8 adoption failure modes</strong> with specific prevention strategies</li>
  </ul>
</div>${footer(3, TOTAL)}</div>

<!-- ═══ 2. SYSTEM ROLES ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>2. System Roles &amp; Accountability</h2>
  <p>ETHOS has <strong>12 critical workflow gates</strong>. Each gate requires a named person with the right permissions to action it. If any seat is empty, that gate becomes a dead zone and work stalls.</p>
  <h3>2.1 Role Map</h3>
  ${tbl(['Role','ETHOS Function','Gate(s) Controlled'],[
    ['<strong>Sales Owner</strong>','Creates prospects, works CRM pipeline, builds quotes, marks WON','CRM pipeline → Opportunity WON'],
    ['<strong>Project Manager</strong>','Converts opportunities to projects, manages full lifecycle (P0→P5), raises POs, manages variations','Opportunity → Project, all lifecycle gates'],
    ['<strong>Engineering Manager</strong>','Assigns designers, reviews/approves job cards, signs off designs, submits handovers','Design approval chain, design-to-production handover'],
    ['<strong>Production Manager</strong>','Acknowledges handovers, oversees production board, rejects handovers back to design','Handover acknowledgement (starts production)'],
    ['<strong>Production Supervisor(s)</strong>','Moves cards through stages (CUTTING→DISPATCHED), raises NCRs','Day-to-day production stage progression'],
    ['<strong>Finance / PO Approver</strong>','Approves purchase orders before issue to suppliers','PO approval gate (DRAFT→APPROVED→SENT)'],
    ['<strong>Goods Receiver</strong>','Receipts deliveries against POs, logs quantities and dates','Goods receipt (PO line completion)'],
    ['<strong>Designer(s)</strong>','Picks up job cards, builds project-specific BOMs, submits for review','Job card progression (READY→SUBMITTED)'],
    ['<strong>Site Manager</strong>','Updates install progress, creates NCRs, collects SAT evidence','Install phase progression'],
  ])}
</div>${footer(4, TOTAL)}</div>

<!-- ═══ 2b. HANDOFF CHAIN ═══ -->
<div class="page">${header()}<div class="page-content">
  <h3>2.2 The Critical Handoff Chain</h3>
  <p>Every arrow is a gate that needs a human to action it:</p>
  <div class="flow-chain">
    <span class="role">Sales Owner</span> <span class="arrow">→</span> <span class="role">Project Manager</span> <span class="arrow">→</span> <span class="role">Engineering Manager</span> <span class="arrow">→</span> <span class="role">Production Manager</span> <span class="arrow">→</span> <span class="role">Site Manager</span> <span class="arrow">→</span> <span class="role">PM (close-out)</span><br>
    <span class="action">&nbsp;&nbsp;creates&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;converts to&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;assigns designers&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;acknowledges&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;installs &amp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;reviews &amp;</span><br>
    <span class="action">&nbsp;&nbsp;opportunity&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;project&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;approves designs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;handover&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;collects SAT&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;closes</span><br>
    <span class="action">&nbsp;&nbsp;builds quote&nbsp;&nbsp;&nbsp;&nbsp;raises POs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;submits handover&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;runs prod board&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;raises NCRs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;final sign-off</span><br>
    <span class="action">&nbsp;&nbsp;marks WON&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;manages lifecycle&nbsp;&nbsp;signs off designs&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;dispatches</span>
  </div>
  ${bq('<strong>Every gap in this chain breaks the flow.</strong> If the Engineering Manager seat is empty, design work piles up with no approvals and production never starts.')}

  <h3>Key Permissions per Role</h3>
  ${tbl(['Role','Key ETHOS Permissions'],[
    ['Sales Owner','<code>crm:create</code>, <code>crm:edit</code>, <code>quotes:create</code>'],
    ['Project Manager','<code>projects:create/edit</code>, <code>crm:convert</code>, <code>purchasing:create</code>, <code>variations:create</code>'],
    ['Engineering Manager','<code>design:manage</code>, <code>design:assign</code>, <code>design:signoff</code>, <code>design:handover-create</code>'],
    ['Production Manager','<code>design:handover-acknowledge</code>, <code>production:manage</code>, <code>production:inspect</code>'],
    ['Finance / PO Approver','<code>purchasing:approve-high</code>, <code>finance:edit</code>'],
    ['Goods Receiver','<code>purchasing:edit</code>'],
    ['Designer(s)','<code>design:start</code>, <code>design:review</code>'],
    ['Site Manager','<code>projects:edit</code>, <code>ncrs:create</code>'],
  ])}
</div>${footer(5, TOTAL)}</div>

<!-- ═══ 3. NON-SYSTEM ROLES ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>3. Non-System Roles</h2>
  <p>These roles don't sit at a specific workflow gate but are essential for the system to function.</p>

  <h3>3.1 ETHOS System Champion</h3>
  <p><strong>What they do:</strong></p>
  <ul>
    <li>Owns the system day-to-day — first call when something is confusing or broken</li>
    <li>Morning check: are all departments updating? Is the production board current? Are POs being receipted?</li>
    <li>Spots when people work around the system (phoning suppliers without a PO, moving to production without a handover) and closes those gaps</li>
    <li>Runs weekly "system health" review — are records accurate? Are projects in the correct stage?</li>
    <li>Feeds back to development what's not working, what's missing, what's confusing</li>
    <li>Trains new starters and writes internal SOPs</li>
    <li>Manages the rollout sequence and user acceptance testing</li>
  </ul>
  ${bq('<strong>Who this should be:</strong> Not IT. Not the MD. Someone operational who understands every department — a senior Project Coordinator, an Operations Manager, or a newly created role. Needs 2–3 days/week during rollout, dropping to half a day/week at steady state.')}
  ${bq('<strong>If this person doesn\'t exist:</strong> The system rots. Data goes stale. People stop trusting it. Within 3 months they\'re back on spreadsheets.')}

  <h3>3.2 Master Data Custodian(s)</h3>
  <h4>Product Catalogue &amp; BOM Library (Engineering)</h4>
  <ul>
    <li>Maintains standard BOMs in the catalogue — when Sage BOMs change, re-imports and validates</li>
    <li>Adds new product variants with correct BOM templates</li>
    <li>Updates stock items when suppliers change part numbers or discontinue components</li>
    <li>Reviews BOM accuracy after projects: "we used 30 fixings, BOM said 24 — update the master"</li>
  </ul>
  <h4>Customer &amp; Supplier Records (Finance/Procurement)</h4>
  <ul>
    <li>Creates new suppliers/customers in ETHOS with correct account codes matching Sage</li>
    <li>Maintains contact details, payment terms, what-they-supply fields</li>
    <li>Cleans up dormant records (56% of Sage customers have no contact details)</li>
  </ul>
  <h4>Nominal Codes &amp; Cost Categories (Finance)</h4>
  <ul>
    <li>Maintains chart of accounts in ETHOS aligned with Sage</li>
    <li>Ensures PO lines are allocated to correct nominals for accurate job costing</li>
  </ul>
</div>${footer(6, TOTAL)}</div>

<!-- ═══ 3b. STORES PERSON ═══ -->
<div class="page">${header()}<div class="page-content">
  <h3>3.3 Stores / Goods-In Person</h3>
  <p><strong>What they do:</strong></p>
  <ul>
    <li>Every delivery that arrives gets receipted against its PO in ETHOS <strong>on the day it arrives</strong></li>
    <li>Searches by PO number or supplier delivery note</li>
    <li>Logs quantities received, notes any shorts or damage</li>
    <li>Flags discrepancies ("expected 10, received 8 — 2 short")</li>
  </ul>
  <p><strong>What they need:</strong></p>
  <ul>
    <li>ETHOS access at the goods-in area (tablet or screen)</li>
    <li>Training on the Goods In interface</li>
    <li>Clear instruction: no delivery goes unreceipted</li>
  </ul>
  ${bq('<strong>If nobody does this:</strong> POs stay in SENT forever. The system doesn\'t know what\'s arrived. Job costing is wrong. Supplier invoices can\'t be matched.')}

  <h3>Role Summary</h3>
  ${tbl(['Non-System Role','Time Commitment','If Missing...'],[
    ['<strong>System Champion</strong>','2–3 days/week (rollout) → 0.5 day/week (steady state)','System rots within 3 months'],
    ['<strong>Data Custodian — Engineering</strong>','2–4 hrs/week','BOMs drift, costing inaccurate, POs wrong'],
    ['<strong>Data Custodian — Finance</strong>','1–2 hrs/week','Sage codes misaligned, reporting unreliable'],
    ['<strong>Stores / Goods-In</strong>','30 min/day (per delivery batch)','POs stuck, job costing fiction, no invoice matching'],
  ])}
</div>${footer(7, TOTAL)}</div>

<!-- ═══ 4. PRODUCTION WORK LOGGING ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>4. Production: Work Logging &amp; Operations</h2>
  <h3>4.1 The Gap Today</h3>
  <p>The production board tracks <strong>where</strong> a product is (which stage) but not <strong>who is working on it</strong> or <strong>how long they've spent</strong>. Labour is currently invisible in project costs.</p>

  <h3>4.2 Operation-Level Time Tracking</h3>
  <p>Each product has a routing from Sage BOMs with estimated hours per operation:</p>
  ${tbl(['Op','Description','Est. Labour','Labour Ref'],[
    ['10','CUTTING — Cutting &amp; Kitting','3h 30m','Cutter'],
    ['20','WELDING — Fabrication &amp; Welding','28h 0m','Welder'],
    ['30','ASSEMBLY — Assembly','11h 0m','Assembly'],
    ['40','PREPARATION — Surface Prep','varies','Prep'],
    ['50','PAINTING — Painting','varies','Painter'],
    ['60','PACKING — Packing','varies','Packer'],
  ])}
  <p><strong>Target state:</strong> Shop floor workers log on/off specific operations on specific products. The system captures:</p>
  <ul>
    <li><strong>Who</strong> worked on it</li>
    <li><strong>What</strong> operation (CUTTING, WELDING, etc.)</li>
    <li><strong>How long</strong> (actual hours vs estimated)</li>
    <li><strong>When</strong> (start/end timestamps)</li>
  </ul>

  <h3>4.3 Concurrent Multi-Operation Support</h3>
  ${bq('<strong>Key requirement:</strong> Multiple workers must be able to log onto <strong>different operations on the same product at the same time</strong>. Parts of a job may be in different work areas simultaneously — e.g. one welder on frame assembly while another preps brackets, or cutting starts on panels while welding continues on the main frame.')}
</div>${footer(8, TOTAL)}</div>

<!-- ═══ 4b. WHAT THIS ENABLES ═══ -->
<div class="page">${header()}<div class="page-content">
  <h3>4.4 What This Enables</h3>
  ${tbl(['Capability','How'],[
    ['<strong>Actual vs Estimated hours</strong>','Welder logs 35h against a 28h estimate → 25% over → visible during production, not 3 months later'],
    ['<strong>Labour costing per project</strong>','Actual hours × rate per operation = real labour cost flowing into project P&amp;L'],
    ['<strong>Utilisation</strong>','Of 7.5h working day, how much is productive vs idle/rework/untracked'],
    ['<strong>Live "who\'s on what"</strong>','Production Manager sees at a glance: Dave on the gate for 2451, 3h in. Sarah idle.'],
    ['<strong>NCR cost attribution</strong>','Rework hours logged against the NCR, not the original work order — true cost of quality failures'],
    ['<strong>Estimating feedback loop</strong>','"Double Flood Doors actually take 32h welding on average, not 28" → better quotes'],
    ['<strong>Queue/wait time visibility</strong>','Product finished cutting at 2pm, welding didn\'t start until next morning → 18h queue time'],
  ])}

  <h3>4.5 Shop Floor Requirements</h3>
  <ul>
    <li><strong>Touchscreen or tablet</strong> at or near each workstation area — one tap to start, one tap to stop</li>
    <li><strong>Simplified UI</strong> — not the PM's interface. Big buttons, current job displayed prominently, list of available jobs in queue</li>
    <li><strong>Start with supervisors logging</strong> if individual operators resist — "Dave and Mike started the gate at 8am, finished at 4pm" still captures the data</li>
    <li><strong>Production Manager accountable</strong> for ensuring hours are logged daily — checks at end of shift</li>
  </ul>

  <h3>4.6 Adoption Risks &amp; Mitigation</h3>
  ${tbl(['Risk','Mitigation'],[
    ['"I\'m too busy welding to update a computer"','One-tap interface, supervisor can log on behalf'],
    ['Seen as surveillance','Frame as "estimates are wrong, we need data to quote better and protect margins"'],
    ['Nobody checks accuracy','Daily standup using ETHOS board — if hours are missing, they get logged there and then'],
    ['Forgotten at break/end of day','Auto-timeout after shift end; supervisor reconciles next morning'],
  ])}
</div>${footer(9, TOTAL)}</div>

<!-- ═══ 5. PROCESS CHANGES ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>5. Process Changes Required</h2>

  <h3>5.1 No PO, No Order</h3>
  <p><strong>The rule:</strong> Nothing gets ordered from a supplier without a PO in ETHOS first. No phoning suppliers and backdating a PO later.</p>
  <p><strong>Why:</strong> Without this, materials arrive with no PO to receipt against, invoices come in with no matching record, and job costing is fiction.</p>
  <p><strong>How to enforce:</strong></p>
  <ul>
    <li>MD must back the policy explicitly</li>
    <li>Suppliers are told: "if you don't have a PO number, don't ship"</li>
    <li>Finance refuses to pay invoices without a matching PO</li>
    <li>Emergency POs can be created after the fact but flagged as "retrospective" with mandatory reason</li>
  </ul>

  <h3>5.2 Daily Standups Using ETHOS</h3>
  <p><strong>Production:</strong> Start of shift, Production Manager + Supervisors review the production board on screen. What's in each stage? What's the priority? Any blockers? Does the board match reality?</p>
  ${bq('<strong>Purpose:</strong> Forces board accuracy. If a product\'s been in PAINTING for 3 days but the board says CUTTING, it gets corrected immediately.')}
  <p><strong>Requirement:</strong> TV/large screen on the shop floor showing the production board (read-only display).</p>

  <h3>5.3 Design Work in ETHOS</h3>
  <p><strong>The expectation:</strong> Designers build BOMs in the ETHOS BOM editor, not in Excel spreadsheets. They submit job cards for review through the system, not by telling the Engineering Manager in passing.</p>
  <p><strong>Why:</strong> The BOM data is what generates POs and feeds into project costing. If it's in Excel, none of the downstream automation works.</p>
  <p><strong>Who enforces:</strong> Engineering Manager. If a designer hasn't submitted their card in ETHOS, it doesn't count as done.</p>

  <h3>5.4 Handover is a Formal Event</h3>
  <p><strong>Not:</strong> "I'll email you the drawings"</p>
  <p><strong>Instead:</strong> Design Manager submits handover in ETHOS. Production Manager reviews the BOM and design notes. Acknowledges or rejects with reasons. The system creates production tasks automatically.</p>
  ${bq('<strong>Recommended:</strong> 15-minute handover meeting alongside the system action. Walk through the BOM, flag unusual items, discuss lead times on outstanding materials.')}
</div>${footer(10, TOTAL)}</div>

<!-- ═══ 5b. REPORTING RHYTHM ═══ -->
<div class="page">${header()}<div class="page-content">
  <h3>5.5 Reporting Rhythm</h3>
  ${tbl(['Frequency','Who','What','ETHOS Module'],[
    ['Daily','Production Manager + Supervisors','Production board review, priorities, blockers','Production Board'],
    ['Daily','Stores / Warehouse','Receipt deliveries, flag shorts','Goods In'],
    ['Weekly','PM + Engineering Manager','Design progress, upcoming handovers, BOM status','Design Board, Project Detail'],
    ['Weekly','PM + Finance','PO status, cost position, outstanding invoices','Purchasing, Finance'],
    ['Fortnightly','MD + Directors','Pipeline review, project health, margin summary','Dashboard, Reports'],
    ['Monthly','Full management','Performance review — on-time %, NCR rate, hours accuracy','Reports Module'],
  ])}

  <h2>6. Rollout Sequence</h2>
  <p>Do not go live everywhere at once. Phase the rollout by department, starting with the smallest group and highest motivation.</p>

  <h3>Phase 1: CRM + Projects (Week 1–2)</h3>
  <ul>
    <li><strong>Who:</strong> Sales (1–2 people) + Project Managers (1–2 people)</li>
    <li><strong>What:</strong> Create real prospects, work the pipeline, build quotes, convert to projects</li>
    <li><strong>Why first:</strong> Smallest group, highest pain (currently trapped between Sage/Excel/email), proves the system works before touching the shop floor</li>
  </ul>
  ${bq('<strong>Success criteria:</strong> 5+ real opportunities flowing through the CRM, 2+ projects created via conversion')}

  <h3>Phase 2: Design (Week 3–4)</h3>
  <ul>
    <li><strong>Who:</strong> Engineering Manager + Design team (7 people, 2 teams)</li>
    <li><strong>What:</strong> Assign designers, work job cards, build BOMs in ETHOS, submit for review</li>
    <li><strong>Key person:</strong> Engineering Manager — they enforce adoption. If they don't use it, designers won't.</li>
    <li><strong>Start with:</strong> One project going through the full design workflow end-to-end</li>
  </ul>
  ${bq('<strong>Success criteria:</strong> One complete design handover submitted through the system')}
</div>${footer(11, TOTAL)}</div>

<!-- ═══ 6b. ROLLOUT PHASES 3-5 ═══ -->
<div class="page">${header()}<div class="page-content">
  <h3>Phase 3: Production (Week 5–6)</h3>
  <ul>
    <li><strong>Who:</strong> Production Manager + Supervisors (2–3 people)</li>
    <li><strong>What:</strong> Acknowledge handovers, track products through production stages</li>
    <li><strong>Hardware needed:</strong> Shop floor screen + tablet/PC for supervisor</li>
    <li><strong>Start with:</strong> Tracking only (no hard gates enforced) — let the team get used to updating the board</li>
    <li><strong>Then:</strong> Turn on the handover acknowledgement gate</li>
  </ul>
  ${bq('<strong>Success criteria:</strong> Production board reflects physical reality within 24 hours')}

  <h3>Phase 4: Purchasing + Finance (Week 7–8)</h3>
  <ul>
    <li><strong>Who:</strong> Finance Manager + Accounts (2–3 people)</li>
    <li><strong>What:</strong> PO approval gates go live, goods receipting starts, "No PO No Order" policy introduced</li>
  </ul>
  ${bq('<strong>Success criteria:</strong> All POs going through ETHOS, goods receipted on day of arrival')}

  <h3>Phase 5: Install + Close-out (Week 9+)</h3>
  <ul>
    <li><strong>Who:</strong> Site Manager(s) (1–2 people)</li>
    <li><strong>What:</strong> Update install progress, raise NCRs, collect SAT evidence</li>
    <li><strong>Last because:</strong> Depends on everything upstream flowing correctly</li>
  </ul>
  ${bq('<strong>Success criteria:</strong> One project completed end-to-end through ETHOS')}

  <h2>7. Hardware &amp; Infrastructure</h2>
  ${tbl(['Item','Location','Purpose'],[
    ['Large display screen (TV/monitor)','Shop floor, visible to production team','Read-only production board — real-time visibility'],
    ['Tablet or shared PC','Production manager\'s desk / near board area','Supervisor updates production cards'],
    ['Tablet or screen','Goods-in area','Receipting deliveries against POs'],
    ['Shop floor touchscreen(s)','Near workstations (future, for work logging)','Workers log on/off operations'],
  ])}
</div>${footer(12, TOTAL)}</div>

<!-- ═══ 8. ADOPTION RISKS ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>8. What Kills Adoption (and How to Prevent It)</h2>
  ${tbl(['Failure Mode','How It Happens','Prevention'],[
    ['<strong>No system champion</strong>','Nobody owns ETHOS after go-live. Complaints go nowhere.','Name the champion before Phase 1 starts'],
    ['<strong>No enforcement from top</strong>','MD doesn\'t use it or reference it. Team sees it as optional.','MD must reference ETHOS data in management meetings, not spreadsheets'],
    ['<strong>Parallel running</strong>','People can still do things the old way (quote in Sage, PO by phone, track in Excel)','Set a cutover date per module. After that date, only ETHOS counts.'],
    ['<strong>No training</strong>','People open ETHOS, get confused, close it, go back to Excel','Per-department training sessions before each phase. 30 mins, hands-on, with their real data.'],
    ['<strong>Too much too fast</strong>','All departments at once, everyone confused, nobody has time to learn','Phased rollout. Master one department before starting the next.'],
    ['<strong>Data quality</strong>','Dirty customer/supplier data, wrong BOMs, missing nominal codes','Clean master data before go-live. System champion validates weekly.'],
    ['<strong>Shop floor resistance</strong>','Production team sees ETHOS as paperwork / surveillance','Start with tracking only (no enforcement). Show value before adding gates. Frame as "better quotes = more work = job security".'],
    ['<strong>Engineering Manager bottleneck</strong>','Single person controls all design approvals. If they\'re away, everything stops.','PM-override with audit trail for emergencies. Consider deputy sign-off.'],
  ])}

  <h2>9. Planned System Features</h2>
  <p>These features are in the development backlog and directly support the operational plan above:</p>
  ${tbl(['Feature','Supports'],[
    ['BOM review at handover','Production Manager reviewing materials before acknowledging'],
    ['Per-line material ordering','Staged purchasing by lead time'],
    ['Standalone Goods In page','Warehouse receipting without navigating PO tables'],
    ['GoodsReceipt audit trail','Tracking partial deliveries and discrepancies'],
    ['receivedQty bug fix (P0)','Accurate receipt tracking'],
    ['Work logging / operations tracking','Shop floor time capture, actual vs estimated, labour costing'],
    ['Project Passport','Contextual handover data, stage gates, comms log'],
    ['Change Orders','Formal variation tracking with cost impact'],
  ])}
</div>${footer(13, TOTAL)}</div>

<!-- ═══ 10. SUCCESS METRICS ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>10. Success Metrics</h2>
  <p>After 3 months of full rollout, measure:</p>
  ${tbl(['Metric','Target','How to Measure'],[
    ['CRM pipeline populated','100% of live enquiries in ETHOS','Count of active opportunities vs known enquiries'],
    ['Projects created via ETHOS','100% of new projects','No projects existing only in Sage/Excel'],
    ['Design handovers through system','100%','All handovers via ETHOS, not email'],
    ['Production board accuracy','Reflects reality within 24h','Spot-check physical vs system weekly'],
    ['POs through ETHOS','100% of purchase orders','No POs raised outside the system'],
    ['Goods receipted on day of arrival','&gt;90%','Receipt date vs delivery date delta'],
    ['Design hours logged','&gt;80% of designer time','Actual vs available hours per designer'],
    ['Production hours logged (future)','&gt;80% of shop floor time','Actual vs available hours per operator'],
  ])}

  <h3>Key Milestones</h3>
  ${tbl(['Milestone','When','Indicator'],[
    ['First real opportunity in CRM','Week 1','Sales team using ETHOS for live enquiries'],
    ['First quote converted to project','Week 2','End-to-end CRM → Project flow working'],
    ['First design handover through system','Week 4','Design → Production gate functioning'],
    ['Production board matching reality','Week 6','&lt;24h lag between physical and system state'],
    ['"No PO No Order" policy active','Week 8','Zero supplier orders without ETHOS PO'],
    ['First project completed end-to-end','Week 10+','Full lifecycle in ETHOS from enquiry to close-out'],
  ])}

  <br><br>
  <hr>
  <p style="text-align:center;color:${MGRAY};font-size:9px;margin-top:14px;">Report prepared by ETHOS Development Team&nbsp;&nbsp;|&nbsp;&nbsp;Document ETHOS-ROLLOUT-001 v1.0&nbsp;&nbsp;|&nbsp;&nbsp;3 March 2026</p>
</div>${footer(14, TOTAL)}</div>

</body></html>`;

async function generatePDF() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  console.log('Generating PDF...');
  await page.pdf({
    path: OUTPUT,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
  await browser.close();
  console.log('PDF generated:', OUTPUT);
}

generatePDF().catch(e => { console.error(e); process.exit(1); });
