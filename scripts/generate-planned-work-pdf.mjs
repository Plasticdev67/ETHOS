/**
 * ETHOS Planned Work & Feature Roadmap PDF Report — MME Brand Design
 * Follows same template as rollout report: PX Grotesk font, SVG logo, navy/coral theming
 * Usage: node scripts/generate-planned-work-pdf.mjs [output.pdf]
 */
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = JSON.parse(readFileSync(resolve(__dirname, 'pdf-assets.json'), 'utf8'));
const OUTPUT = process.argv[2] || 'ETHOS-Planned-Work.pdf';

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
const REPORT_TITLE = 'ETHOS Planned Work &amp; Feature Roadmap';
function header() {
  return `<div class="page-header">
    <div class="hdr-bar"><div class="hdr-inner">${logoHeaderWhite}<span class="hdr-title">${REPORT_TITLE}</span></div></div>
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
function badge(text, color) { return '<span style="display:inline-block;background:' + color + ';color:' + WHITE + ';padding:2px 8px;border-radius:3px;font-size:8.5px;font-weight:700;letter-spacing:0.5px;">' + text + '</span>'; }

// ── Pre-computed badges (avoid quote nesting in template literal) ────────
const B_LIVE = badge('LIVE', '#22c55e');
const B_NEXT = badge('NEXT UP', '#f59e0b');
const B_PLANNED = badge('PLANNED', '#6366f1');
const B_MAJOR = badge('MAJOR FEATURE', '#dc2626');
const B_FUTURE = badge('FUTURE', '#8b5cf6');
const B_ONGOING = badge('ONGOING', '#f59e0b');
const B_P0 = badge('P0', '#dc2626');
const B_P1 = badge('P1', '#f59e0b');
const B_P2 = badge('P2', '#6366f1');
const B_P3 = badge('P3', '#8b5cf6');
const B1 = badge('1', '#dc2626');
const B2 = badge('2', '#dc2626');
const B3 = badge('3', '#f59e0b');
const B4 = badge('4', '#f59e0b');
const B5 = badge('5', '#f59e0b');
const B6 = badge('6', '#6366f1');
const B7 = badge('7', '#6366f1');
const B8 = badge('8', '#6366f1');
const B9 = badge('9', '#8b5cf6');
const B10 = badge('10', '#8b5cf6');
const B11 = badge('11', '#8b5cf6');
const B12 = badge('12', '#8b5cf6');
const B13 = badge('13', '#8b5cf6');
const B14 = badge('14', '#8b5cf6');
const B15 = badge('15', '#8b5cf6');
const B16 = badge('16', '#8b5cf6');
const B17 = badge('17', '#8b5cf6');

// ── Total pages ─────────────────────────────────────────────────────────
const TOTAL = 21;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@font-face { font-family:'PX Grotesk'; font-weight:300; src:url(data:font/woff2;base64,${assets.fontLightB64}) format('woff2'); }
@font-face { font-family:'PX Grotesk'; font-weight:400; src:url(data:font/woff2;base64,${assets.fontRegularB64}) format('woff2'); }
@font-face { font-family:'PX Grotesk'; font-weight:700; src:url(data:font/woff2;base64,${assets.fontBoldB64}) format('woff2'); }

@page { size: A4; margin: 0; }
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'PX Grotesk','Segoe UI',sans-serif; font-size:10.5px; line-height:1.6; color:${NAVY}; }

/* ── Cover ─────────────────────────────── */
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
</style></head><body>

<!-- ═══ COVER ═══ -->
<div class="cover">
  <div class="logo-wrap">${logoWhite}</div>
  <div class="divider"></div>
  <h1>Planned Work &amp;<br>Feature Roadmap</h1>
  <div class="subtitle">ETHOS — ERP / Project Management Platform</div>
  <div class="status-badge">
    <div class="status-text">DEVELOPMENT ROADMAP</div>
  </div>
  <div class="meta">
    Document: ETHOS-ROADMAP-001&nbsp;&nbsp;|&nbsp;&nbsp;Version 1.1<br>
    5 March 2026<br><br>
    Prepared for MM Engineered Solutions Ltd<br>
    Port Talbot, Wales
  </div>
  <div class="confidential">CONFIDENTIAL — Internal Use Only</div>
</div>

<!-- ═══ CONTENTS ═══ -->
<div class="page">${header()}<div class="page-content contents">
  <h2>Contents</h2>
  <ul>
    <li>1. Overview &amp; What's Already Built</li>
    <li>2. Recently Completed Work</li>
    <li>3. Sage XLSX Import</li>
    <li>4. Quote System Enhancements</li>
    <li>5. BOM Code Relabelling &amp; Size-Based Scaling</li>
    <li>6. BOM Access &amp; Per-Line Material Ordering</li>
    <li>7. Drawing Register / Vault Lite</li>
    <li>8. Project Passport &amp; Change Orders</li>
    <li>9. Production Work Logging &amp; Operations</li>
    <li>10. AI Spec Extraction &amp; Compliance Checking</li>
    <li>11. Warehouse &amp; Inventory</li>
    <li>12. Quality Management &amp; ISO 9001</li>
    <li>13. Product Compliance &amp; Spec Intelligence</li>
    <li>14. Inspection &amp; Test Plans (ITPs)</li>
    <li>15. Workflow Improvements &amp; Customer Live Tracking</li>
    <li>16. Handover Documentation &amp; O&amp;M Packs</li>
    <li>17. API Hardening &amp; Technical Debt</li>
    <li>18. Priority Roadmap</li>
  </ul>
</div>${footer(2, TOTAL)}</div>

<!-- ═══ 1. OVERVIEW ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>1. Overview — What's Already Built</h2>
  <p>ETHOS manages MME's full project lifecycle from sales enquiry through design, production, installation, and close-out. The following modules are <strong>built and operational</strong>:</p>
  ${tbl(['Module','Status','Key Capabilities'],[
    ['<strong>CRM Pipeline</strong>',B_LIVE,'Prospects, opportunities, quote builder, pipeline board, WON/LOST tracking'],
    ['<strong>Project Management</strong>',B_LIVE,'Board/tracker/timeline views, lifecycle gates (P0-P5), status management'],
    ['<strong>Design Module</strong>',B_LIVE,'Job cards, designer assignment, BOM editor, design-to-production handover'],
    ['<strong>Production Board</strong>',B_LIVE,'Stage tracking (CUTTING-DISPATCHED), kanban board, workshop view'],
    ['<strong>BOM Management</strong>',B_LIVE,'Catalogue with 48 BOM codes, 2,586 base items, auto-populate on design cards'],
    ['<strong>Purchasing</strong>',B_LIVE,'PO creation, approval workflow, Quick PO from BOM'],
    ['<strong>Customer/Supplier</strong>',B_LIVE,'Full CRM with contacts, account codes, Sage alignment'],
    ['<strong>Dashboard</strong>',B_LIVE,'ICU carousel, project health, pipeline summary'],
    ['<strong>NCR Tracking</strong>',B_LIVE,'Non-conformance reports with cost tracking'],
    ['<strong>Auth &amp; Permissions</strong>',B_LIVE,'Role-based access, 9 system roles, audit logging'],
    ['<strong>Customer Portal</strong>',B_LIVE,'External customer access to project status'],
    ['<strong>Product Catalogue</strong>',B_LIVE,'5 families, 42 types, 48 variants from Sage BOMs'],
  ])}
  <h3>Tech Stack</h3>
  <p>Next.js 15 (App Router), TypeScript 5, React 19, PostgreSQL on Supabase via Prisma ORM 7, Tailwind CSS 4 + shadcn/ui, NextAuth v5, Recharts, PDFKit, Puppeteer for reports.</p>
</div>${footer(3, TOTAL)}</div>

<!-- ═══ 2. RECENTLY COMPLETED ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>2. Recently Completed Work</h2>
  <p>Changes completed in the last two weeks:</p>
  ${tbl(['Date','Feature','Impact'],[
    ['5 Mar','<strong>Lock Design BOM Costs</strong>','Unit costs auto-populated from Sage, read-only for designers. Enables quote vs actual cost comparison.'],
    ['5 Mar','<strong>Work Stream on Quotes</strong>','Sales selects work stream (Utilities/Bespoke/Community/Blast/etc) on quotes. Carries through to project on conversion.'],
    ['5 Mar','<strong>Add Product &rarr; BOM Codes</strong>','Product dialog wired to 48 real BOM codes (was querying empty table). Products now link to correct BOM templates via variantId.'],
    ['3 Mar','<strong>Sage BOM Import (partial)</strong>','593 stock items, 78 BOM headers, 1,457 components imported. Catalogue rebuilt: 5 families, 42 types, 48 variants, 2,586 base BOM items.'],
    ['3 Mar','<strong>BOM Code Concept</strong>','"Variant" relabelled conceptually to "BOM Code". Users pick Family &rarr; Type &rarr; BOM Code, enter bespoke dimensions.'],
    ['2 Mar','<strong>CRM Opportunity Detail</strong>','Salesforce-style activity timeline on opportunity pages.'],
    ['1 Mar','<strong>Code Audit v2</strong>','Comprehensive hardening: auth, validation, toDecimal, error handling across API routes.'],
    ['1 Mar','<strong>Concurrency-Safe Numbering</strong>','Project numbers generated via database sequences — no more race conditions.'],
    ['28 Feb','<strong>Supabase Migration</strong>','Database moved from Neon to Supabase PostgreSQL.'],
    ['28 Feb','<strong>ETO/CTO Classification</strong>','ITO renamed to ETO, added CTO classification for configure-to-order products.'],
  ])}
</div>${footer(4, TOTAL)}</div>

<!-- ═══ 3. SAGE XLSX IMPORT ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>3. Sage XLSX Import</h2>
  <p>${B_NEXT} Fresh Sage 200 exports need importing to replace the partial old CSV import.</p>
  <h3>The 6 Export Files</h3>
  ${tbl(['File','Content','Rows','Action'],[
    ['Stock Items Mega','Full stock item data (23 columns)','1,082','Import &rarr; <code>SageStockItem</code>'],
    ['BOM Headers','Reference, description, version','191','Import &rarr; <code>SageBomHeader</code>'],
    ['BOM Structure','Flat parent+child relationships','5,514','Import &rarr; <code>SageBomComponent</code>'],
    ['Suppliers','Supplier accounts','534','Upsert &rarr; <code>Supplier</code>'],
    ['Customers','Customer accounts','212','Upsert &rarr; <code>Customer</code>'],
    ['Stock Items Slim','4-column subset','1,082','Skip (Mega is superset)'],
  ])}
  <h3>Implementation</h3>
  <ul>
    <li>Single script: <code>scripts/sage-xlsx-import.ts</code> with 5 phases</li>
    <li>Clear staging tables &rarr; Import stock items &rarr; Import BOM headers &rarr; Import BOM structure &rarr; Upsert customers &amp; suppliers</li>
    <li>Post-import: run <code>sync-from-sage</code> + <code>propagate-prices</code> pipeline to rebuild catalogue</li>
    <li>Customer/supplier upserts protect manually-enriched ETHOS fields (only update if null)</li>
    <li>Remove old <code>Bom Database/</code> folder and legacy import script after verification</li>
  </ul>
  ${bq('<strong>Why this matters:</strong> Full Sage data import unblocks accurate BOM auto-population, correct cost prices on design BOMs, and complete customer/supplier records. Currently running on a partial import.')}
</div>${footer(5, TOTAL)}</div>

<!-- ═══ 4. QUOTE ENHANCEMENTS ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>4. Quote System Enhancements</h2>
  <p>${B_PLANNED} Identified gaps in the quoting workflow that affect commercial accuracy and client communication.</p>

  <h3>Commercial Essentials</h3>
  ${tbl(['Feature','Why It Matters'],[
    ['<strong>Payment terms</strong>','Net 30, staged payments, deposit requirements — displayed on PDF'],
    ['<strong>Valid until date</strong>','Field exists but hidden. Auto-calculate 30-day default, show prominently.'],
    ['<strong>Delivery / lead time</strong>','Per-line lead time + overall quote lead time. Manufacturing needs this for planning.'],
    ['<strong>Shipping / freight</strong>','Distinct line type so delivery costs are separated from product margin calculations.'],
    ['<strong>Assumptions &amp; exclusions</strong>','Rich text section: "price excludes foundations, builders work, crane hire". Critical for avoiding disputes.'],
  ])}

  <h3>Engineering Specifics</h3>
  ${tbl(['Feature','Why It Matters'],[
    ['<strong>Drawing references</strong>','Link GA drawings to individual quote line items'],
    ['<strong>Material / finish specs</strong>','Customer-facing spec summary on the quote'],
    ['<strong>Certifications required</strong>','CE marking, fire rating, ISO references as checkboxes/tags'],
    ['<strong>Installation scope</strong>','Supply Only vs Supply &amp; Install vs Supply, Install &amp; Commission'],
    ['<strong>Site survey / travel costs</strong>','Distinct line type, excluded from product margin calcs'],
  ])}

  <h3>Workflow Gaps</h3>
  <ul>
    <li><strong>Revision change log</strong> — track what changed between revisions, not just the revision number</li>
    <li><strong>Quote expiry notifications</strong> — auto-reminder when validity date approaching</li>
    <li><strong>Decline reason tracking</strong> — capture why (price, spec, competitor, timing) for win/loss analysis</li>
    <li><strong>Follow-up scheduling</strong> — reminder dates to chase unresponded quotes</li>
    <li><strong>Quote PDF improvements</strong> — branded cover letter, intro paragraph, T&amp;Cs section</li>
  </ul>
</div>${footer(6, TOTAL)}</div>

<!-- ═══ 5. BOM CODE + SCALING ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>5. BOM Code Relabelling &amp; Size-Based Scaling</h2>
  <p>${B_PLANNED} The product configurator shows "Variant" with size-specific names, but MME's products are bespoke — every size is different.</p>

  <h3>The Problem</h3>
  <p>Users need to pick a <strong>BOM template</strong> (the Sage stock code that carries the base bill of materials), then enter bespoke dimensions. The current variant model already does this — it just has the wrong label and UX.</p>

  <h3>The New Flow</h3>
  ${tbl(['Step','What the User Sees'],[
    ['1. Family','Flood Doors'],
    ['2. Type','Standard Flood Door'],
    ['3. BOM Code','<code>SFD-001</code> — dropdown of available Sage BOMs for this type'],
    ['4. Dimensions','Bespoke width &times; height (always manual entry)'],
    ['5. System scales','BOM quantities adjusted from reference size to entered dimensions'],
    ['6. Design modifies','Auto-populated BOM is the starting point — designers adjust from there'],
  ])}

  <h3>Size-Based Scaling Logic</h3>
  <ul>
    <li>Each <code>ProductType</code> gets a <strong>reference size</strong> (refW &times; refH) — the standard for scaling</li>
    <li>Each <code>BaseBomItem</code> tagged with scaling method: <strong>FIXED</strong>, <strong>SCALES_BY_AREA</strong>, or <strong>SCALES_BY_PERIMETER</strong></li>
    <li>Fixed items (hinges, locks) stay constant regardless of size</li>
    <li>Area items (sheet steel, paint) scale by area ratio: <code>(W&times;H) / (refW&times;refH)</code></li>
    <li>Perimeter items (seals, frame sections) scale by perimeter ratio: <code>(W+H) / (refW+refH)</code></li>
  </ul>
  ${bq('<strong>No schema changes needed</strong> — ProductVariant model stays, just relabelled as "BOM Code" in the UI. All 16 files referencing variantId keep working unchanged.')}
</div>${footer(7, TOTAL)}</div>

<!-- ═══ 6. BOM ACCESS & ORDERING ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>6. BOM Access &amp; Per-Line Material Ordering</h2>
  <p>${B_PLANNED} BOMs are currently only accessible from the Design Board. Production can't see materials. Ordering is bulk-only.</p>

  <h3>BOM Visibility</h3>
  ${tbl(['Feature','Who Benefits'],[
    ['<strong>Read-only BOM at handover</strong>','Production Manager reviews materials before acknowledging handover'],
    ['<strong>BOM link on production cards</strong>','Production staff see materials while building'],
    ['<strong>BOM tab on project detail</strong>','PM sees aggregated BOMs across all products in project'],
    ['<strong>Product row &rarr; BOM link</strong>','Direct access: BOM editor (design) or BOM viewer (production/PM)'],
  ])}

  <h3>Per-Line Material Ordering</h3>
  <p>Replaces the bulk "Quick PO" approach with granular control:</p>
  <ul>
    <li>Each BOM line shows PO status: <strong>Unpurchased</strong> / <strong>PO-0045 Draft</strong> / <strong>PO-0045 Approved</strong></li>
    <li>Checkbox to select lines, then "Create POs for Selected" — groups by supplier into one PO per supplier</li>
    <li>Lines with no supplier assigned get flagged — can't order until supplier is set</li>
    <li><strong>"Order Materials" button</strong> on project detail page — shortcut to unpurchased buy items</li>
    <li>After handover acknowledgement: prompt "X buy items need purchasing — review and order?"</li>
  </ul>
  ${bq('<strong>Why per-line:</strong> Steel ordered weeks before seals/fixings. Long-lead items at design freeze, short-lead at handover. Purchasing needs control over what gets ordered when.')}
</div>${footer(8, TOTAL)}</div>

<!-- ═══ 7. DRAWING REGISTER ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>7. Drawing Register / Vault Lite</h2>
  <p>${B_PLANNED} No formal tracking of drawing revisions, approvals, or project links. GA approval is informal (verbal/email).</p>

  <h3>Core Concept</h3>
  <p>ETHOS tracks the <strong>metadata</strong> — not the files themselves. Files stay on OneDrive/SharePoint. ETHOS becomes the single source of truth for "what's the current revision, who approved it, and when?"</p>

  <h3>Drawing Model</h3>
  ${tbl(['Field','Purpose'],[
    ['<code>drawingNumber</code>','e.g. "GA-2401-001"'],
    ['<code>title</code>, <code>fileType</code>','GA / DETAIL / FABRICATION / INSTALLATION'],
    ['<code>revision</code>','A, B, C — current revision letter'],
    ['<code>status</code>','DRAFT &rarr; FOR_REVIEW &rarr; APPROVED &rarr; RELEASED &rarr; SUPERSEDED'],
    ['<code>filePath</code>','OneDrive/SharePoint URL or path'],
    ['<code>productId</code> + <code>designCardId</code>','Links to project product and design card'],
    ['<code>approvedBy</code> / <code>approvedAt</code>','Formal approval tracking'],
    ['<code>checkedOutBy</code>','Soft advisory lock — "James is editing this"'],
  ])}

  <h3>Key Features</h3>
  <ul>
    <li><strong>Drawing register on project page</strong> — all drawings grouped by product, with status/revision/approval</li>
    <li><strong>Revision history</strong> — every revision tracked with who/when/why</li>
    <li><strong>Approval workflow</strong> — designer marks "For Review", lead approves/rejects with comments</li>
    <li><strong>GA sign-off integration</strong> — design card "Signed Off" could require all GAs to be APPROVED</li>
    <li><strong>Search</strong> — find drawings across all projects by number, description, status</li>
  </ul>

  <h3>BOM Reconciliation (Phase 2)</h3>
  <ul>
    <li>Designer exports Inventor parts list as CSV/Excel, uploads to ETHOS</li>
    <li>"Compare to Drawing BOM" diffs upload against design BOM</li>
    <li>Highlights: items in drawing but not BOM, items in BOM but not drawing, quantity mismatches</li>
  </ul>
</div>${footer(9, TOTAL)}</div>

<!-- ═══ 8. PASSPORT & CHANGE ORDERS ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>8. Project Passport &amp; Change Orders</h2>
  <p>${B_MAJOR} One living record per project. Born at creation, travels through every stage. Each team adds their section.</p>

  <h3>Stage Sections</h3>
  ${tbl(['Stage','What Gets Captured'],[
    ['<strong>Sales</strong>','Project context, client goals, site realities, access constraints, verbal agreements, known risks'],
    ['<strong>Design</strong>','Key decisions and reasoning, critical tolerances, material specifics, compromises and why'],
    ['<strong>Production</strong>','Fabrication notes, NCRs/concessions, known issues for install team, deviations from spec'],
    ['<strong>Install</strong>','Site conditions update, progress, snags, client sign-off, lessons learned'],
    ['<strong>Running</strong>','Comms log (conversations, decisions, commitments), risk register'],
  ])}

  <h3>How It Gets Filled In</h3>
  <ul>
    <li>Guided prompts appear in context when people are already working</li>
    <li>Small inputs at the right moments — not a big form at handover</li>
    <li>"Log" button for quick comms entries (who, what was agreed, 10 seconds)</li>
    <li>Design prompted "why?" when they change material/approach — one line captures the gold</li>
    <li>At stage gate: review what you've entered, add watch items summary, submit</li>
    <li><strong>Hard gate:</strong> outgoing section must be complete before project advances</li>
  </ul>

  <h3>Change Orders</h3>
  <p>Client requests a change mid-project. It cascades — design rework, material scrap, production rescheduling, cost impact. Currently managed through phone calls, emails, spreadsheets.</p>
  <ul>
    <li><strong>Classification:</strong> Client Variation (chargeable) / Internal Change (MME cost) / Contract Ambiguity (negotiate)</li>
    <li><strong>Impact assessment:</strong> design hours, material cost delta, production impact, programme impact</li>
    <li><strong>Status:</strong> Raised &rarr; Under Review &rarr; Approved &rarr; Implemented &rarr; Invoiced (or Rejected)</li>
    <li><strong>Live cost position:</strong> original value + approved variations + pending + internal changes = true position</li>
  </ul>
</div>${footer(10, TOTAL)}</div>

<!-- ═══ 8b. PASSPORT PHASING ═══ -->
<div class="page">${header()}<div class="page-content">
  <h3>Implementation Phasing</h3>
  ${tbl(['Phase','What','AI Required?'],[
    ['<strong>Phase 1</strong>','Passport shell + manual entry. Guided prompts, comms log, risk register, gate checks. Pure UI + data model.','No'],
    ['<strong>Phase 2</strong>','AI document extraction. Upload tender pack/spec/sub-contract &rarr; AI extracts key data &rarr; human confirms.','Yes'],
    ['<strong>Phase 3</strong>','Spec compliance checking. Text-vs-text first (specs vs BOMs/schedules), then drawing interpretation.','Yes'],
  ])}
  ${bq('<strong>Phase 1 delivers 80% of the value</strong> with zero AI dependency. Build it, ship it, learn what fields actually get used. Real-world usage informs what to automate in Phase 2.')}

  <h3>Quote &rarr; Project Auto-Population</h3>
  <p>When a quote converts to a project, passport auto-populates from quote data (product specs, client details, commercial terms). PM adds operational context on top. Reduces the key Sage pain point: project requirements don't flow from quote.</p>

  <h3>Design Considerations</h3>
  <ul>
    <li>Gate logic needs an escape valve: PM override with logged reason for urgent situations</li>
    <li>Drawing checks should be advisory flags, not hard gates</li>
    <li>Keep it lightweight: quick raise in 60 seconds, detailed assessment follows later</li>
  </ul>
</div>${footer(11, TOTAL)}</div>

<!-- ═══ 9. PRODUCTION WORK LOGGING ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>9. Production Work Logging &amp; Operations</h2>
  <p>${B_MAJOR} The production board tracks <strong>where</strong> a product is but not <strong>who is working on it</strong> or <strong>how long they've spent</strong>. Labour is invisible in project costs.</p>

  <h3>Operation-Level Time Tracking</h3>
  <p>Each product has a routing from Sage BOMs with estimated hours per operation. Workers log on/off specific operations.</p>
  ${tbl(['Model','Purpose'],[
    ['<code>ProductionOperation</code>','Auto-created from Sage BOM operations at handover. Operation code, description, estimated hours.'],
    ['<code>WorkLog</code>','Each start/stop event: production card + operation + user + timestamps + duration.'],
  ])}

  <h3>Concurrent Multi-Operation Support</h3>
  ${bq('Multiple workers must be able to log onto <strong>different operations on the same product simultaneously</strong>. One welder on frame assembly while another preps brackets. Cutting starts on panels while welding continues on the main frame.')}

  <h3>What This Enables</h3>
  ${tbl(['Capability','Value'],[
    ['<strong>Actual vs Estimated</strong>','Welder logs 35h against 28h estimate &rarr; 25% over &rarr; visible during production'],
    ['<strong>Labour costing</strong>','Actual hours &times; rate = real labour cost in project P&amp;L'],
    ['<strong>Live visibility</strong>','PM sees who is on what, how long they have been on it'],
    ['<strong>NCR cost attribution</strong>','Rework hours logged against NCR, not original work order'],
    ['<strong>Estimating feedback</strong>','Double Flood Doors actually take 32h welding, not 28 &rarr; better quotes'],
    ['<strong>Queue time visibility</strong>','Finished cutting 2pm, welding did not start until next morning &rarr; 18h queue'],
  ])}

  <h3>Shop Floor Requirements</h3>
  <ul>
    <li>Touchscreen or tablet near each workstation — one tap start, one tap stop</li>
    <li>Simplified UI: big buttons, current job prominent, available jobs in queue</li>
    <li>Auto-timeout at shift end, supervisor reconciles next morning</li>
  </ul>
</div>${footer(12, TOTAL)}</div>

<!-- ═══ 10. AI SPEC CHECKING ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>10. AI Spec Extraction &amp; Compliance Checking</h2>
  <p>${B_FUTURE} AI-powered document processing and specification compliance verification.</p>

  <h3>What AI Can Do Now (Reliably)</h3>
  <p><strong>Text-vs-text checking:</strong></p>
  <ul>
    <li>Spec says S355 steel, BOM says S275 — <strong>flagged</strong></li>
    <li>Spec says HDG 85&mu;m, paint schedule says 2-pack epoxy — <strong>flagged</strong></li>
    <li>Spec says EXC3, drawing notes say EXC2 — <strong>flagged</strong></li>
    <li>Sub-contract says max 7.5t vehicle, dispatch plan has 12m trailer — <strong>flagged</strong></li>
    <li>Required documentation not yet produced — <strong>flagged</strong></li>
  </ul>
  <p><strong>Title block / drawing notes extraction</strong> via vision models — extract drawing number, revision, material notes, parts lists from PDF drawings.</p>

  <h3>Implementation Steps</h3>
  ${tbl(['Step','What','AI Level'],[
    ['<strong>Step 1</strong>','Manual spec checklist — material grades, coatings, execution class, testing requirements. Each item tracked as compliant/non-compliant/pending.','None'],
    ['<strong>Step 2</strong>','AI reads uploaded spec PDF, extracts key requirements into structured fields. Human confirms.','Text extraction (LLM)'],
    ['<strong>Step 3</strong>','Automated cross-referencing: spec requirements vs BOM (material grades, stock codes), vs drawing notes, vs documentation tracker.','Cross-reference logic'],
    ['<strong>Step 4</strong>','Upload GA PDF, AI reads dimensions and notes, compares against spec. "Panel height 1850mm vs spec max 1800mm."','Vision model'],
  ])}
  ${bq('<strong>Key principle:</strong> Advisory flags, not hard gates. "Here are 5 things that look wrong — designer please check." Human judgement stays in the loop. Step 1 (manual checklist) delivers value with zero AI.')}
</div>${footer(13, TOTAL)}</div>

<!-- ═══ 11. WAREHOUSE ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>11. Warehouse &amp; Inventory</h2>
  <p>${B_PLANNED} Current gaps in goods receipting and no inventory tracking at all.</p>

  <h3>Goods Receipting — Bugs &amp; Improvements</h3>
  ${tbl(['Priority','Issue','Fix'],[
    [B_P0,'receivedQty <strong>overwrites</strong> instead of accumulating','Make cumulative, or introduce GoodsReceipt line model'],
    [B_P1,'No server-side validation on receivedQty','Zod validation: positive, &le; remaining qty'],
    [B_P1,'No guard on PO status before receipt','Only allow receipt on SENT or PARTIALLY_RECEIVED'],
    [B_P2,'Goods receipting buried in PO expansion','Standalone <code>/goods-in</code> page for warehouse staff'],
    [B_P2,'No receipt audit trail','GoodsReceipt model: who, what, when, delivery note ref, GRN number'],
    [B_P3,'No discrepancy reporting','Short/over delivery flags with reason capture'],
  ])}

  <h3>Stock Levels &amp; Locations (Future)</h3>
  <ul>
    <li>New models: <code>StockItem</code>, <code>StockLocation</code>, <code>StockMovement</code></li>
    <li>Link to goods receipting (PO receipt = inbound movement) and production (material issue = outbound)</li>
    <li>Stock level dashboard: what's on hand, where it is, what's allocated to projects</li>
  </ul>
</div>${footer(14, TOTAL)}</div>

<!-- ═══ 12. QUALITY MANAGEMENT & ISO 9001 ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>12. Quality Management &amp; ISO 9001</h2>
  <p>${B_PLANNED} ISO 9001 requires controlled documents, CAPA processes, audit trails, and management review inputs. Currently managed via Safety Culture and spreadsheets.</p>

  <h3>Document Control</h3>
  ${tbl(['Feature','Purpose'],[
    ['<strong>Controlled document register</strong>','Every QMS document (procedures, work instructions, forms) tracked with version, owner, review date'],
    ['<strong>Revision workflow</strong>','Draft &rarr; Review &rarr; Approved &rarr; Superseded. Old versions archived, not deleted.'],
    ['<strong>Review reminders</strong>','Auto-alert when a document is due for periodic review (annual, biannual)'],
    ['<strong>Distribution tracking</strong>','Record who has acknowledged reading the current revision'],
  ])}

  <h3>Audit &amp; CAPA (Corrective/Preventive Action)</h3>
  <ul>
    <li><strong>Audit schedule</strong> — internal and external audit calendar with assigned auditors</li>
    <li><strong>Finding tracker</strong> — non-conformities from audits, customer complaints, NCRs all feed into CAPA</li>
    <li><strong>Root cause analysis</strong> — structured fields for 5-Why or fishbone findings</li>
    <li><strong>Action tracking</strong> — corrective actions assigned to owners with due dates and effectiveness verification</li>
    <li><strong>Management review inputs</strong> — auto-generated summary: NCR trends, audit findings, customer feedback, CAPA status</li>
  </ul>

  <h3>Approved Supplier List</h3>
  <ul>
    <li>Suppliers rated and categorised by capability (steel, seals, coatings, fasteners)</li>
    <li>Assessment records: initial evaluation, periodic re-evaluation, delivery performance</li>
    <li>Link to PO performance data — on-time delivery %, quality rejection rate</li>
    <li>Approval status: Approved / Conditional / Suspended / Removed</li>
  </ul>
</div>${footer(15, TOTAL)}</div>

<!-- ═══ 13. PRODUCT COMPLIANCE & SPEC INTELLIGENCE ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>13. Product Compliance &amp; Spec Intelligence</h2>
  <p>${B_FUTURE} Intelligent rules engine that knows the compliance requirements for each product type and flags issues before they reach site.</p>

  <h3>Certification Matrix</h3>
  ${tbl(['Feature','How It Works'],[
    ['<strong>Product &rarr; Cert mapping</strong>','Each ProductType has required certifications: CE, UKCA, fire rating, flood rating, blast rating'],
    ['<strong>Project cert tracker</strong>','Dashboard showing which certs are needed, which are obtained, which are outstanding'],
    ['<strong>Cert document links</strong>','Upload or link to actual certificates. Track expiry dates for time-limited certs.'],
    ['<strong>Auto-reminders</strong>','Alert when a cert is approaching expiry or when a required cert is still missing at stage gate'],
  ])}

  <h3>Fire Door Intelligence</h3>
  <p>Fire-rated products have strict rules. ETHOS can enforce them:</p>
  <ul>
    <li><strong>Tested configuration limits</strong> — max size, handing restrictions, glazing area limits per test evidence</li>
    <li><strong>Material constraints</strong> — intumescent type must match test evidence, specific core materials required</li>
    <li><strong>Hardware requirements</strong> — closer type, hinge quantity, lock mechanism all governed by test report</li>
    <li>If a bespoke quote exceeds tested limits &rarr; <strong>automatic flag</strong> requiring engineering sign-off</li>
  </ul>

  <h3>Material Traceability</h3>
  <ul>
    <li><strong>3.1 mill certificates</strong> — link steel batch/heat numbers to specific projects and products</li>
    <li><strong>Weld procedure tracking</strong> — WPS/PQR references per product, welder qualification records</li>
    <li><strong>Coating records</strong> — DFT readings, batch numbers, application conditions logged per product</li>
    <li>Full traceability chain: raw material &rarr; product &rarr; project &rarr; installed location</li>
  </ul>
</div>${footer(16, TOTAL)}</div>

<!-- ═══ 14. INSPECTION & TEST PLANS ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>14. Inspection &amp; Test Plans (ITPs)</h2>
  <p>${B_PLANNED} Formal quality hold points through manufacturing. Currently informal — supervisors check as they go, nothing recorded.</p>

  <h3>ITP Structure</h3>
  ${tbl(['Stage','Hold Point','Who Signs Off'],[
    ['Material receipt','3.1 cert verified, visual inspection, dimensions checked','QA / Stores'],
    ['After cutting','Dimensions to drawing, material identification transferred','Supervisor'],
    ['After welding','Visual weld inspection, dimensional check, NDE if specified','QA / Welding Inspector'],
    ['After blasting','Surface profile, cleanliness grade (Sa 2.5 etc)','QA'],
    ['After painting','DFT readings, visual, adhesion test if specified','QA / Paint Inspector'],
    ['Pre-dispatch','Final dimensional, operation check, packaging, labelling','QA'],
    ['FAT (if required)','Factory Acceptance Test per spec — client witness point','Client / QA'],
  ])}

  <h3>Implementation</h3>
  <ul>
    <li><strong>ITP templates</strong> per ProductType — auto-assigned when production card created</li>
    <li>Each hold point: pass/fail/N-A with comments, photos, measurement records</li>
    <li><strong>Client witness points</strong> marked — notification sent when approaching, requires client sign-off</li>
    <li><strong>NCR auto-link</strong> — failed hold point can raise NCR directly</li>
    <li>ITP completion required before dispatch — hard gate on PACKING &rarr; DISPATCHED transition</li>
  </ul>
  ${bq('<strong>Business value:</strong> Replaces paper checklists. Creates auditable quality records. Clients requesting to see ITPs get a PDF export instantly instead of someone hunting through filing cabinets.')}
</div>${footer(17, TOTAL)}</div>

<!-- ═══ 15. WORKFLOW IMPROVEMENTS & CUSTOMER LIVE TRACKING ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>15. Workflow Improvements &amp; Customer Live Tracking</h2>
  <p>${B_PLANNED} Operational workflow features that improve internal efficiency and transform how customers see MME.</p>

  <h3>Quote-to-Cash Visibility</h3>
  ${tbl(['Feature','Value'],[
    ['<strong>Pipeline forecasting</strong>','Weighted pipeline value by probability. Monthly/quarterly forecast vs target.'],
    ['<strong>Quote conversion analytics</strong>','Win rate by work stream, customer, value bracket. What types of work do we win?'],
    ['<strong>Revenue recognition</strong>','Track invoiced vs certified vs paid per project. Cash flow visibility.'],
    ['<strong>Invoice matching</strong>','Auto-match supplier invoices to POs. Flag discrepancies before payment.'],
  ])}

  <h3>Customer Live Tracking Portal</h3>
  <p>Transform the existing customer portal into a real-time project tracker:</p>
  <ul>
    <li><strong>Production progress</strong> — customer sees "Your flood doors: Fabrication 70% complete" with stage visualisation</li>
    <li><strong>Milestone notifications</strong> — auto-email when key stages complete (design approved, production started, dispatched)</li>
    <li><strong>Delivery tracking</strong> — expected dispatch date, actual dispatch, carrier details, delivery confirmation</li>
    <li><strong>Document access</strong> — customers download their drawings, test certs, O&amp;M manuals from the portal</li>
    <li><strong>Photo updates</strong> — production team uploads progress photos, visible to customer in real-time</li>
  </ul>

  <h3>Warranty &amp; Defect Tracking</h3>
  <ul>
    <li>Warranty period per product (typically 12 months from install, varies by contract)</li>
    <li>Defect reports linked to original project, product, and production records</li>
    <li>Warranty cost tracking — feeds back into product quality analysis</li>
    <li>Automated warranty expiry reminders to the commercial team</li>
  </ul>
</div>${footer(18, TOTAL)}</div>

<!-- ═══ 16. HANDOVER DOCUMENTATION & O&M PACKS ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>16. Handover Documentation &amp; O&amp;M Packs</h2>
  <p>${B_PLANNED} Every project needs a documentation pack at handover. Currently assembled manually from multiple sources — often late, often incomplete.</p>

  <h3>Auto-Assembled Documentation</h3>
  ${tbl(['Document','Source in ETHOS'],[
    ['<strong>As-built drawings</strong>','Drawing Register — latest approved revision per product'],
    ['<strong>Material certificates</strong>','Material traceability records — 3.1 certs linked to products'],
    ['<strong>Test certificates</strong>','ITP records — all passed hold points with measurements'],
    ['<strong>Weld records</strong>','WPS/PQR references, welder qualifications from compliance module'],
    ['<strong>Paint/coating records</strong>','DFT readings, batch numbers from ITP or production logs'],
    ['<strong>CE/UKCA declarations</strong>','Certification matrix — auto-generated DoP from product data'],
    ['<strong>O&amp;M manual</strong>','Template per ProductType, populated with project-specific data'],
    ['<strong>Warranty information</strong>','Auto-generated from contract terms and install completion date'],
  ])}

  <h3>How It Works</h3>
  <ul>
    <li><strong>Checklist per project</strong> — auto-generated from ProductType requirements. Shows what's complete vs outstanding.</li>
    <li><strong>One-click PDF pack</strong> — compile all documents into a single branded PDF or ZIP for client handover</li>
    <li><strong>Completeness gate</strong> — project can't move to COMPLETE until documentation pack is assembled</li>
    <li><strong>Client portal delivery</strong> — documentation pack available in customer portal automatically</li>
  </ul>
  ${bq('<strong>Why this matters:</strong> Documentation packs currently take days to assemble. Clients chase for them. Missing documents delay final payment. ETHOS auto-assembles from data already captured during the project — handover documentation becomes a by-product of normal work, not a separate task.')}
</div>${footer(19, TOTAL)}</div>

<!-- ═══ 17. TECH DEBT ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>17. API Hardening &amp; Technical Debt</h2>
  <p>${B_ONGOING} Security and code quality work that needs completing across the codebase.</p>

  <h3>API Routes Needing Auth + Validation</h3>
  <p>14 mutative API routes still missing <code>requireAuth()</code>, <code>requirePermission()</code>, <code>validateBody()</code>, or <code>toDecimal()</code>:</p>
  ${tbl(['Route','Needed'],[
    ['<code>api/projects/[id]</code> PATCH/DELETE','Auth + permission'],
    ['<code>api/quotes</code> POST','Auth + validation + concurrency-safe numbering'],
    ['<code>api/quotes/[id]</code> PATCH/DELETE','Auth + permission'],
    ['<code>api/purchase-orders</code> POST','Auth + validation + toDecimal'],
    ['<code>api/purchase-orders/[id]</code> PATCH/DELETE','Auth + permission'],
    ['<code>api/users</code> POST, <code>api/users/[id]</code> PUT/DELETE','Auth + permission (team:manage)'],
    ['<code>api/customers</code> POST, <code>api/suppliers</code> POST','Auth + validation'],
    ['<code>api/opportunities</code> POST','Auth + validation + toDecimal'],
    ['<code>api/ncrs</code> POST','Auth + validation + toDecimal'],
  ])}

  <h3>Technical Debt</h3>
  <ul>
    <li><strong>Remove <code>as any</code> casts</strong> — catalogue routes use type escape hatches. Replace with typed repository delegates.</li>
    <li><strong>Remove <code>@ts-nocheck</code></strong> on <code>catalogue/seed/route.ts</code></li>
    <li><strong>Quote number concurrency</strong> — uses <code>findFirst(orderBy desc) + 1</code>, same race condition fixed for projects. Wire in <code>getNextSequenceNumber('quote')</code>.</li>
    <li><strong>Configurator schema redesign</strong> — remove SpecBomModifier and SpecDependency models. Different materials = different ProductVariants with their own BOMs.</li>
    <li><strong>Mobile audit</strong> — quick pass through main pages on 375px viewport</li>
  </ul>
</div>${footer(20, TOTAL)}</div>

<!-- ═══ 18. PRIORITY ROADMAP ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>18. Priority Roadmap</h2>
  <p>Recommended build order based on business impact and dependencies:</p>

  ${tbl(['Priority','Feature','Rationale'],[
    [B1,'<strong>Sage XLSX Import</strong>','Unblocks everything. Full stock items, BOMs, customers, suppliers flowing through correctly.'],
    [B2,'<strong>API Hardening</strong>','Security. 14 routes need auth/validation before production use.'],
    [B3,'<strong>Goods Receipting Fix (P0)</strong>','receivedQty bug — data integrity issue affecting all PO receipts.'],
    [B4,'<strong>BOM Code Relabelling</strong>','UX improvement. "Variant" &rarr; "BOM Code" in UI. Small change, big clarity.'],
    [B5,'<strong>BOM Access &amp; Per-Line Ordering</strong>','Production visibility into materials. Staged purchasing by lead time.'],
    [B6,'<strong>Drawing Register</strong>','Formal revision tracking, approval workflow. Foundation for spec compliance.'],
    [B7,'<strong>Quote Enhancements</strong>','Payment terms, lead times, assumptions. Commercial accuracy.'],
    [B8,'<strong>Project Passport (Phase 1)</strong>','Living context record. Manual entry, guided prompts, stage gates. No AI.'],
    [B9,'<strong>Quality Management / ISO 9001</strong>','Document control, CAPA, audit tracking. ISO compliance built into daily workflow.'],
    [B10,'<strong>ITPs &amp; Product Compliance</strong>','Hold points, cert tracking, fire door intelligence. Audit-ready quality records.'],
    [B11,'<strong>Production Work Logging</strong>','Operation-level time tracking. Requires shop floor hardware.'],
    [B12,'<strong>Change Orders</strong>','Formal variation management with cost tracking.'],
    [B13,'<strong>Customer Live Tracking</strong>','Real-time portal: production progress, milestones, delivery tracking, documents.'],
    [B14,'<strong>Handover Docs &amp; O&amp;M</strong>','Auto-assembled documentation packs. One-click PDF export for clients.'],
    [B15,'<strong>Workflow &amp; Analytics</strong>','Pipeline forecasting, quote analytics, invoice matching, warranty tracking.'],
    [B16,'<strong>AI Spec Extraction</strong>','Document processing and compliance checking. Builds on Passport + Drawing Register.'],
    [B17,'<strong>Warehouse / Inventory</strong>','Stock levels, locations, movements. Biggest build, lowest immediate priority.'],
  ])}

  ${bq('<strong>Priorities 1&ndash;3</strong> are data integrity and security — do these before going live.<br><strong>Priorities 4&ndash;8</strong> are operational improvements that make daily use smoother.<br><strong>Priorities 9&ndash;14</strong> are quality, compliance, and customer-facing features.<br><strong>Priorities 15&ndash;17</strong> are transformative features that change how the business operates.')}

  <br><br>
  <hr>
  <p style="text-align:center;color:${MGRAY};font-size:9px;margin-top:14px;">Report prepared by ETHOS Development Team&nbsp;&nbsp;|&nbsp;&nbsp;Document ETHOS-ROADMAP-001 v1.1&nbsp;&nbsp;|&nbsp;&nbsp;5 March 2026</p>
</div>${footer(21, TOTAL)}</div>

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
