/**
 * ETHOS Audit Report v2 PDF Generator — MME Brand Design
 * Matches v1 PDF format exactly: PX Grotesk font, SVG logo, navy/coral theming
 * Usage: node scripts/generate-audit-pdf.mjs [output.pdf]
 */
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assets = JSON.parse(readFileSync(resolve(__dirname, 'pdf-assets.json'), 'utf8'));
const OUTPUT = process.argv[2] || 'ETHOS-Code-Audit-Report-v2.pdf';

// ── Brand ───────────────────────────────────────────────────────────────
const NAVY = '#23293a';
const CORAL = '#e95445';
const GREEN = '#4ade80';
const WHITE = '#ffffff';
const LGRAY = '#f8f9fa';
const MGRAY = '#999';

// ── Logo SVGs ───────────────────────────────────────────────────────────
const logoWhite = assets.svgLogoWhite.replace(/width="[^"]*"/, 'width="200"').replace(/height="[^"]*"/, 'height="29"');
const logoCoral = assets.svgLogoCoral.replace(/width="[^"]*"/, 'width="160"').replace(/height="[^"]*"/, 'height="24"');
const logoHeaderWhite = assets.svgLogoWhite.replace(/width="[^"]*"/, 'width="150"').replace(/height="[^"]*"/, 'height="22"');

// ── Helpers ─────────────────────────────────────────────────────────────
let pageNum = 1;
function header() {
  return `<div class="page-header">
    <div class="hdr-bar"><div class="hdr-inner">${logoHeaderWhite}<span class="hdr-title">ETHOS Code Audit Report v2.0</span></div></div>
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
function scoreBar(label, v1, v2, delta) {
  const pct = (v2/10)*100;
  const clr = v2>=7?'#22c55e':v2>=5?'#f59e0b':CORAL;
  const bold = label==='OVERALL'?'font-weight:700;':'';
  return `<tr style="${bold}"><td class="sc-label">${label}</td><td class="sc-v1">${v1}/10</td><td class="sc-bar"><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${clr}"></div></div></td><td class="sc-score">${v2} / 10</td><td class="sc-delta" style="color:${delta.startsWith('+')?'#22c55e':MGRAY}">${delta}</td></tr>`;
}

// ── Total pages (we know from structure) ────────────────────────────────
const TOTAL = 12; // cover not counted, so content pages 2-12 + cover = ~12 numbered

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
.cover .score { font-size:76px; font-weight:700; font-style:italic; color:${CORAL}; line-height:1; margin:10px 0; }
.cover .score-label { font-size:15px; color:${CORAL}; font-weight:300; margin-bottom:50px; }
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
.ft-left, .ft-right { }

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

/* ── Score card ───────────────────────────── */
.score-card table { border:none; }
.score-card td { border:none; padding:6px 8px; }
.sc-label { width:130px; }
.sc-v1 { width:55px; text-align:center; color:${MGRAY}; }
.sc-bar { width:auto; }
.sc-score { width:60px; font-weight:600; text-align:right; }
.sc-delta { width:50px; text-align:center; }
.bar-track { background:#e5e7eb; border-radius:4px; height:20px; overflow:hidden; }
.bar-fill { height:100%; border-radius:4px; }

/* ── Blockquotes ──────────────────────────── */
blockquote { border-left:3px solid ${CORAL}; background:${LGRAY}; padding:10px 14px; margin:10px 0; font-size:10px; color:#374151; font-weight:300; page-break-inside:avoid; }

/* ── Lists ────────────────────────────────── */
ul { margin:6px 0 6px 20px; list-style:none; }
ul li { position:relative; padding-left:14px; margin:4px 0; font-weight:300; }
ul li::before { content:''; position:absolute; left:0; top:7px; width:6px; height:6px; border-radius:50%; background:${CORAL}; }

code { background:#f0f0f0; padding:1px 4px; border-radius:3px; font-size:9.5px; font-family:Consolas,monospace; color:${CORAL}; }
.resolved { color:#22c55e; font-weight:400; }
.improved { color:#f59e0b; font-weight:400; }
.unchanged { color:${MGRAY}; }
.new-finding { color:${CORAL}; font-weight:400; }
.worse { color:${CORAL}; }
.contents ul { list-style:none; margin:0; padding:0; }
.contents li { padding:8px 0; border-bottom:1px solid #f0f0f0; font-size:13px; font-weight:300; }
.contents li::before { display:none; }
hr { border:none; border-top:1px solid #ddd; margin:14px 0; }
</style></head><body>

<!-- ═══ COVER ═══ -->
<div class="cover">
  <div class="logo-wrap">${logoWhite}</div>
  <div class="divider"></div>
  <h1>Code Audit Report</h1>
  <div class="subtitle">ETHOS MK.1 — Comprehensive Assessment</div>
  <div class="score">7.0 / 10</div>
  <div class="score-label">Production-Readiness Score</div>
  <div class="meta">
    Document: ETHOS-AUDIT-002&nbsp;&nbsp;|&nbsp;&nbsp;Version 2.0<br>
    2 March 2026<br><br>
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
    <li>2. Score Card</li>
    <li>3. What Changed (v1 → v2)</li>
    <li>4. Critical Remaining Risks</li>
    <li>5. Security Assessment</li>
    <li>6. Data Integrity</li>
    <li>7. Performance</li>
    <li>8. Code Quality</li>
    <li>9. Compliance & Audit Trails</li>
    <li>10. Prioritised Remediation Plan</li>
    <li>11. Conclusion & Recommended Sequence</li>
  </ul>
</div>${footer(2, 12)}</div>

<!-- ═══ 1. EXECUTIVE SUMMARY ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>1. Executive Summary</h2>
  <p>ETHOS (Engineer-To-Order Hub Operating System) is a custom-built ERP system for MM Engineered Solutions Ltd, managing the full project lifecycle from sales enquiry through design, production, installation, and financial closeout. This is the <strong>second</strong> comprehensive code audit, conducted 24 hours after the first to measure the impact of focused remediation work.</p>
  <p>The audit reviewed all 198 API route files, the full Prisma schema (90+ models, 44 enums), all utility libraries, middleware, and representative page components.</p>
  <h3>Verdict</h3>
  ${bq('ETHOS has made <strong>significant progress</strong> toward production readiness. The P0 security issues from v1 are fully resolved. Data integrity is substantially hardened. The remaining gaps are concentrated in <strong>audit logging</strong>, <strong>input validation</strong>, and <strong>parseFloat replacement</strong> — all mechanical wiring work, not architectural issues. With focused effort on these areas, ETHOS is close to production-ready.')}
  <h3>Project Overview</h3>
  ${tbl(['Item','v1 Value','v2 Value'],[
    ['Framework','Next.js 15.5.12 / React 19 / TypeScript 5 (strict)','Unchanged'],
    ['Database','PostgreSQL on Supabase, via Prisma 7.3','Unchanged'],
    ['Authentication','NextAuth v5 beta 30 (Microsoft SSO + credentials)','Unchanged'],
    ['Total API Routes','198 route files across 33 API groups','<strong>198</strong> (unchanged)'],
    ['Total Page Routes','40+','<strong>114</strong> (full count)'],
    ['Prisma Models','90+ models, 44 enums','Unchanged'],
    ['Test Coverage','Effectively zero','<strong>Still zero</strong>'],
    ['npm Vulnerabilities','13 (3 high, 9 moderate, 1 low)','Unchanged'],
  ])}
</div>${footer(3, 12)}</div>

<!-- ═══ 2. SCORE CARD ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>2. Score Card</h2>
  <p>Each category is scored 1–10 based on the severity and breadth of findings. Comparison with v1 scores shown.</p>
  <div class="score-card"><table><thead><tr><th style="width:130px">Category</th><th style="width:55px;text-align:center">v1</th><th>v2 Score</th><th style="width:60px;text-align:right">  </th><th style="width:50px;text-align:center">Δ</th></tr></thead><tbody>
    ${scoreBar('Architecture',7,8,'+1')}
    ${scoreBar('Code Quality',6,6,'—')}
    ${scoreBar('Data Integrity',4,7,'+3')}
    ${scoreBar('Security',3,7,'+4')}
    ${scoreBar('Performance',5,7,'+2')}
    ${scoreBar('Compliance',4,5,'+1')}
    ${scoreBar('OVERALL',5.5,7,'+1.5')}
  </tbody></table></div>
  <h3>Three Strongest Aspects</h3>
  <ul>
    <li><strong>Security Transformation</strong> — Authentication coverage jumped from 8% to 85%. All 198 API routes are protected at the middleware level (session check), and 169 routes have explicit <code>requireAuth()</code> calls. 151 routes have <code>requirePermission()</code> for role-based access.</li>
    <li><strong>Data Integrity Hardening</strong> — All number generation systems now use the atomic <code>getNextSequenceNumber()</code> pattern (17 call sites). Status transition validation covers 10 models. Financial document immutability is enforced.</li>
    <li><strong>Performance Cleanup</strong> — The force-dynamic/revalidate conflict affecting 22 pages has been fully resolved. Dashboard uses tab-based data loading. Caching strategy is properly configured.</li>
  </ul>
  <h3>Three Most Critical Remaining Risks</h3>
  <ul>
    <li><strong>Audit Logging (34%)</strong> — Core business operations (project CRUD, quote CRUD, PO CRUD, invoice CRUD, NCR CRUD, finance) have zero audit logging. Cannot trace who changed what.</li>
    <li><strong>Input Validation</strong> — 125 of 134 routes accepting request bodies use raw <code>request.json()</code> with no schema validation. Only 9 use <code>validateBody()</code>.</li>
    <li><strong>parseFloat in Finance</strong> — 33 <code>parseFloat</code> calls remain in 16 financial routes. Bank transfers, payments, receipts, and quote lines still use floating-point parsing for money.</li>
  </ul>
</div>${footer(4, 12)}</div>

<!-- ═══ 3. WHAT CHANGED ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>3. What Changed (v1 → v2)</h2>
  <p>Summary of all improvements made in the 24-hour remediation sprint between audits.</p>
  <h3>Resolved P0 — Critical Items (All 7 Fixed)</h3>
  ${tbl(['ID','Finding','Resolution'],[
    ['SEC-02','Admin user creation without auth (<code>setup-sales/route.ts</code>)','<span class="resolved">DELETED</span>'],
    ['SEC-03','Finance module — 60+ routes with no auth','<span class="resolved">ALL SECURED</span> — requireAuth + requirePermission'],
    ['SEC-04','Portal token generation without auth','<span class="resolved">SECURED</span>'],
    ['SEC-01','92% of routes had no server-side auth','<span class="resolved">85% NOW HAVE requireAuth()</span>'],
    ['DATA-01','Dual project number generation (race condition)','<span class="resolved">ATOMIC</span> — getNextSequenceNumber("project")'],
    ['DATA-02','Dual quote number generation (race condition)','<span class="resolved">ATOMIC</span> — getNextSequenceNumber("quote")'],
    ['DATA-03','Dual journal number in auto-journal.ts','<span class="resolved">ATOMIC</span> — getNextSequenceNumber("journal")'],
  ])}
  <h3>Resolved P1 — High Items</h3>
  ${tbl(['ID','Finding','Resolution'],[
    ['DATA-05','<code>toDecimal()</code> precision loss via <code>Number()</code>','<span class="resolved">FIXED</span> — uses <code>Prisma.Decimal(String(value))</code>'],
    ['DATA-09','No status transition validation on any model','<span class="resolved">10 MODELS</span> — comprehensive system in status-guards.ts'],
    ['DATA-11','~35 missing FK indexes','<span class="resolved">97 @@index</span> declarations now in schema'],
    ['COMP-03','Quotes/invoices editable after approval','<span class="resolved">IMMUTABILITY ENFORCED</span> — checkImmutability()'],
    ['COMP-04','NCRs can be hard-deleted','<span class="resolved">SOFT DELETE</span> — isArchived/archivedAt pattern'],
    ['PERF-02','22 pages with force-dynamic/revalidate conflict','<span class="resolved">0 CONFLICTS</span> — all resolved'],
    ['CQ-03','<code>@ts-nocheck</code> on catalogue seed route','<span class="resolved">REMOVED</span>'],
    ['DATA-04','Opportunity quote numbers (findFirst+1)','<span class="resolved">ATOMIC</span> — sequence counter'],
  ])}
</div>${footer(5, 12)}</div>

<!-- ═══ 3b. METRICS MOVEMENT ═══ -->
<div class="page">${header()}<div class="page-content">
  <h3>Metrics Movement</h3>
  ${tbl(['Metric','v1','v2','Change'],[
    ['Routes with <code>requireAuth()</code>','16 / 197 (8.1%)','<strong>169 / 198 (85.4%)</strong>','<span class="resolved">+77%</span>'],
    ['Routes with <code>requirePermission()</code>','24 / 197 (12.2%)','<strong>151 / 198 (76.3%)</strong>','<span class="resolved">+64%</span>'],
    ['Routes with <code>validateBody()</code>','2 / 197 (1.0%)','<strong>9 / 198 (4.5%)</strong>','<span class="improved">+3.5%</span>'],
    ['<code>parseFloat</code> calls in routes','109','<strong>33</strong>','<span class="resolved">-70%</span>'],
    ['<code>toDecimal()</code> usage','8 routes','<strong>139 occurrences / 40 files</strong>','<span class="resolved">+17x</span>'],
    ['force-dynamic conflicts','22 pages','<strong>0</strong>','<span class="resolved">Eliminated</span>'],
    ['Sequence counters registered','0 atomic','<strong>13 atomic</strong>','<span class="resolved">All safe</span>'],
    ['Status transition models','0','<strong>10 (7 enforced, 3 defined)</strong>','<span class="resolved">New system</span>'],
    ['<code>as any</code> casts','26','26','<span class="unchanged">Unchanged</span>'],
    ['Test files','0','0','<span class="unchanged">Unchanged</span>'],
  ])}
</div>${footer(6, 12)}</div>

<!-- ═══ 4. CRITICAL REMAINING RISKS ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>4. Critical Remaining Risks</h2>
  <p>The three findings most likely to cause data integrity issues or compliance failures in production.</p>
  <h3>Risk 1: Audit Logging Covers Only 34% of Write Operations</h3>
  <p>Core business operations — project CRUD, quote CRUD, PO CRUD, invoice CRUD, NCR CRUD, and the entire finance module — have zero audit logging. The <code>logAudit()</code> function exists and works well in design/production modules, but has never been wired into the remaining 66% of write operations.</p>
  ${bq('<strong>Impact:</strong> Cannot trace who created, modified, or deleted projects, quotes, purchase orders, invoices, NCRs, or any financial records. For ISO 9001 compliance and financial auditability, this is a significant gap. The <code>AccountingAuditLog</code> model exists in the schema but has zero callers.')}
  <h3>Risk 2: 125 Routes Accept Unvalidated Request Bodies</h3>
  <p>Of 134 API routes that accept request bodies, 125 use raw <code>request.json()</code> with no schema validation. The <code>validateBody()</code> utility and Zod schemas exist for most models, but only 9 routes have been wired up.</p>
  ${bq('<strong>Impact:</strong> A malformed API request could write invalid data to the database — wrong types, missing required fields, or unexpected values. The Zod schemas and validateBody() function are ready to use; this is purely a wiring task.')}
  <h3>Risk 3: 33 parseFloat Calls in Financial Routes</h3>
  <p>Bank transfers, payments, receipts, contract applications, and quote lines still use <code>parseFloat()</code> for money instead of <code>toDecimal()</code>. IEEE 754 floating-point arithmetic introduces precision errors on financial calculations.</p>
  ${bq('<strong>Impact:</strong> Financial values may lose precision during parsing, leading to rounding errors on invoices, payments, and bank reconciliations. The fix is mechanical — replace parseFloat() with toDecimal() in 16 files.')}
</div>${footer(7, 12)}</div>

<!-- ═══ 5. SECURITY ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>5. Security Assessment</h2>
  <p>Score: <strong>7/10</strong> (was 3/10). Transformational improvement. The application's auth infrastructure is now wired into the vast majority of routes.</p>
  <h3>Authentication Coverage</h3>
  ${tbl(['Metric','v1','v2','Change'],[
    ['Routes with <code>requireAuth()</code>','16 / 197 (8.1%)','<strong>169 / 198 (85.4%)</strong>','+77%'],
    ['Routes with <code>requirePermission()</code>','24 / 197 (12.2%)','<strong>151 / 198 (76.3%)</strong>','+64%'],
    ['Routes with <code>validateBody()</code> (Zod)','2 / 197 (1.0%)','<strong>9 / 198 (4.5%)</strong>','+3.5%'],
    ['Routes using raw <code>request.json()</code>','131 / 133 (98.5%)','<strong>125 / 134 (93.3%)</strong>','-5%'],
  ])}
  <h3>Routes Without requireAuth() (29 of 198)</h3>
  <p>All 29 are still protected at the middleware level (session token check). The risk is defense-in-depth, not open access.</p>
  ${tbl(['Route','Risk','Justification'],[
    ['<code>api/auth/[...nextauth]</code>','None','NextAuth handler, must be public'],
    ['<code>api/badges</code>','Low','Read-only sidebar badge counts'],
    ['<code>api/design/*</code> (6 routes)','Low','Read-only design board views'],
    ['<code>api/docs/design-sop</code>','Low','Read-only documentation'],
    ['<code>api/audit/*</code> (2)','Low','Read-only audit views'],
    ['<code>api/bom-products</code>','Low','Read-only catalogue'],
    ['<code>api/capacity/load</code>','Low','Read-only planning'],
    ['<code>api/export/sage</code>','Medium','Data export — should have auth'],
    ['<code>api/planning/*</code> (4)','Medium','Read-only but internal scheduling data'],
    ['<code>api/quotes/[id]/pdf</code>','Medium','PDF generation — should have auth'],
    ['<code>api/documents/[id]/download</code>','Medium','File download — should have auth'],
  ])}
  <h3>Dependency Vulnerabilities</h3>
  ${tbl(['Package','Severity','Issue'],[
    ['nodemailer <=7.0.10','HIGH','Email domain conflict + DoS via recursive parser'],
    ['xlsx *','HIGH','Prototype pollution + ReDoS (no fix available)'],
    ['qs 6.7.0-6.14.1','MODERATE','arrayLimit bypass causing DoS'],
  ])}
</div>${footer(8, 12)}</div>

<!-- ═══ 6. DATA INTEGRITY ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>6. Data Integrity</h2>
  <p>Score: <strong>7/10</strong> (was 4/10). Major improvement. All critical number generation race conditions resolved. Status transitions implemented across 10 models. Financial immutability enforced.</p>
  <h3>Number Generation — All Resolved</h3>
  ${tbl(['ID','v1 Finding','v2 Status'],[
    ['DATA-01','Dual project number generation (race condition)','<span class="resolved">RESOLVED — atomic sequence counter</span>'],
    ['DATA-02','Dual quote number generation (race condition)','<span class="resolved">RESOLVED — atomic sequence counter</span>'],
    ['DATA-03','Dual journal number in auto-journal.ts','<span class="resolved">RESOLVED — atomic sequence counter</span>'],
    ['DATA-04','Opportunity quote numbers (findFirst+1)','<span class="resolved">RESOLVED — atomic sequence counter</span>'],
    ['DATA-14','Import route still uses findFirst+1','<span class="new-finding">NEW — needs fix</span>'],
  ])}
  <p><strong>Sequence counter system:</strong> 13 registered sequences, all using atomic <code>$transaction</code> with <code>upsert + increment</code>. 17 call sites confirmed.</p>
  <h3>Decimal/Money Handling</h3>
  ${tbl(['ID','Finding','v1 → v2'],[
    ['DATA-05','<code>toDecimal()</code> precision loss via <code>Number()</code>','<span class="resolved">RESOLVED — uses Prisma.Decimal(String(value))</span>'],
    ['DATA-06','<code>parseFloat</code> in API routes','<span class="improved">Improved (109 → 33 in 16 files)</span>'],
  ])}
  <h3>Status Transitions</h3>
  <p>Comprehensive system in <code>src/lib/status-guards.ts</code> covering 10 models.</p>
  ${tbl(['Category','Models'],[
    ['<span class="resolved">Enforced transitions (7)</span>','Quote, PurchaseOrder, SalesInvoice, Variation, Retention, PlantHire, SubContract'],
    ['<span class="improved">Defined but unenforced (3)</span>','NCR, Project, Opportunity — PATCH handlers skip validation'],
  ])}
  <h3>Financial Immutability — Resolved</h3>
  <p><code>checkImmutability()</code> now blocks edits on locked statuses for quotes, invoices, POs, variations, retentions, plant hires, and sub-contracts.</p>
  <h3>Schema & Indexes</h3>
  <ul>
    <li><strong>97 <code>@@index</code> declarations</strong> across schema (was ~60)</li>
    <li>Financial children use <code>onDelete: Restrict</code> (prevents accidental cascade deletion)</li>
    <li>NCR model has <code>isArchived</code>/<code>archivedAt</code> for soft delete — other models still hard-delete</li>
  </ul>
</div>${footer(9, 12)}</div>

<!-- ═══ 7. PERFORMANCE ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>7. Performance</h2>
  <p>Score: <strong>7/10</strong> (was 5/10). Caching conflicts resolved. Dashboard load optimised.</p>
  <h3>Improvements Since v1</h3>
  <ul>
    <li><strong>0 force-dynamic/revalidate conflicts</strong> (was 22 pages)</li>
    <li>Dashboard uses tab-based data loading — queries fire on-demand, not all at once</li>
    <li>30 pages use <code>revalidate: 60</code> for ISR caching</li>
    <li>5 pages correctly use <code>force-dynamic</code> for real-time data (dashboard, portal, production)</li>
  </ul>
  <h3>Remaining Issues</h3>
  ${tbl(['ID','Severity','Finding','Status'],[
    ['PERF-01','Medium','Dashboard overview tab fires 22 queries','<span class="improved">Improved — now on-demand</span>'],
    ['PERF-03','Medium','Reports pages fetch entire tables with no pagination','<span class="unchanged">Unchanged</span>'],
    ['PERF-05','Low','63 <code>JSON.parse(JSON.stringify())</code> for Prisma serialisation','<span class="worse">Worse (57 → 63)</span>'],
    ['PERF-06','Low','20+ nested routes missing <code>loading.tsx</code>','<span class="unchanged">Unchanged</span>'],
  ])}
  <h3>What's Working Well</h3>
  <ul>
    <li>Prisma singleton with pg.Pool connection pooling (max 5, min 0 — correct for serverless)</li>
    <li>No N+1 query patterns — consistent use of <code>Promise.all()</code> for parallel queries</li>
    <li>17 top-level loading skeletons covering all major routes</li>
    <li>Lucide and Radix optimised via <code>optimizePackageImports</code></li>
    <li>PDFKit correctly externalised via <code>serverExternalPackages</code></li>
  </ul>
</div>${footer(10, 12)}</div>

<!-- ═══ 8. CODE QUALITY + 9. COMPLIANCE ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>8. Code Quality</h2>
  <p>Score: <strong>6/10</strong> (unchanged). Clean codebase with strict TypeScript, but zero test coverage and type safety gaps in the catalogue module.</p>
  <h3>Strengths</h3>
  <ul>
    <li>TypeScript <code>strict: true</code> enabled</li>
    <li>No commented-out code blocks found</li>
    <li>Consistent error handling — 98.7% mutation handler try/catch coverage (150/152)</li>
    <li>No dead or orphaned files. Clean import organisation.</li>
    <li><code>@ts-nocheck</code> eliminated (was 1 file)</li>
  </ul>
  <h3>Issues</h3>
  ${tbl(['ID','Severity','Finding','v1 → v2'],[
    ['CQ-01','HIGH','Zero unit/integration tests. No test framework configured.','<span class="unchanged">Unchanged</span>'],
    ['CQ-02','MEDIUM','26 <code>as any</code> casts in catalogue module','<span class="unchanged">Unchanged (26 → 26)</span>'],
    ['CQ-04','MEDIUM','19 <code>exhaustive-deps</code> suppressions in finance pages','<span class="worse">Worse (16 → 19)</span>'],
    ['CQ-05b','LOW','22 GET handlers without try/catch (read-only)','<span class="new-finding">New finding</span>'],
    ['CQ-06','LOW','Unstructured logging — 236 <code>console.error()</code> calls','<span class="unchanged">Unchanged</span>'],
    ['PERF-05','LOW','63 <code>JSON.parse(JSON.stringify())</code>','<span class="worse">Worse (57 → 63)</span>'],
  ])}
  <p><strong>eslint-disable summary:</strong> 67 total across 35 files (42 no-explicit-any, 19 exhaustive-deps, 5 no-img-element, 1 unused-vars).</p>
</div>${footer(11, 12)}</div>

<!-- ═══ 9. COMPLIANCE ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>9. Compliance & Audit Trails</h2>
  <p>Score: <strong>5/10</strong> (was 4/10). Audit logging covers only ~34% of write operations. NCR workflow incomplete for ISO 9001. Financial records now have immutability guards.</p>
  <h3>Audit Logging Coverage</h3>
  ${tbl(['Module','v1','v2','Change'],[
    ['Design','Partial (job cards, handovers)','Partial (10 routes)','<span class="unchanged">Unchanged</span>'],
    ['Production','Partial (tasks, moves)','Partial (6 routes)','<span class="unchanged">Unchanged</span>'],
    ['CRM','Create, convert only','Create, convert (3 routes)','<span class="unchanged">Unchanged</span>'],
    ['Admin','—','Reset-data logged','<span class="resolved">NEW</span>'],
    ['<strong>Projects</strong>','Activate design only','<strong>Activate design only</strong>','<span class="unchanged">Unchanged</span>'],
    ['<strong>Quotes</strong>','None','<strong>None</strong>','<span class="unchanged">Unchanged</span>'],
    ['<strong>Purchase Orders</strong>','None','<strong>None</strong>','<span class="unchanged">Unchanged</span>'],
    ['<strong>NCRs</strong>','None','<strong>None</strong>','<span class="unchanged">Unchanged</span>'],
    ['<strong>Finance (all)</strong>','None','<strong>None</strong>','<span class="unchanged">Unchanged</span>'],
  ])}
  <h3>Financial Immutability — Resolved</h3>
  ${tbl(['Document','v1: Editable after approval?','v2: Editable after approval?'],[
    ['Quotes','Yes — no status guard','<span class="resolved">No — checkImmutability() blocks</span>'],
    ['Sales Invoices','Yes — PAID can be edited','<span class="resolved">No — checkImmutability() blocks</span>'],
    ['Purchase Orders','Yes — APPROVED can be edited','<span class="resolved">No — checkImmutability() blocks</span>'],
    ['Journal Entries','No — reverse only (correct)','Unchanged (correct)'],
  ])}
  <h3>User Accountability</h3>
  <ul>
    <li><code>createdById</code> on <strong>3 models</strong> only: Quote, PurchaseOrder, ProcurementEnquiry</li>
    <li><code>updatedById</code> on <strong>0 models</strong></li>
    <li>No GDPR data export or anonymisation mechanisms</li>
  </ul>
</div>${footer(12, 14)}</div>

<!-- ═══ 10. REMEDIATION PLAN ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>10. Prioritised Remediation Plan</h2>
  <h3 style="color:#22c55e;">P0 — Critical (None Remaining)</h3>
  <p>All P0 items from v1 have been resolved. No critical blockers remain.</p>
  <h3>P1 — High (Fix Before Production Use)</h3>
  ${tbl(['ID','Area','Finding & Fix','Effort'],[
    ['SEC-06','Security','Wire <code>validateBody()</code> + Zod into all POST/PATCH routes (125 routes)','L (10-16 hrs)'],
    ['COMP-01','Compliance','Wire <code>logAudit()</code> into project/quote/PO/invoice/NCR/finance CRUD','M (4-6 hrs)'],
    ['DATA-06','Data','Replace 33 <code>parseFloat</code> with <code>toDecimal()</code> in 16 financial routes','M (2-3 hrs)'],
    ['DATA-18','Data','Enforce status transitions on NCR/Project/Opportunity PATCH handlers','S (30 min)'],
    ['DATA-14','Data','Fix import route — use <code>getNextSequenceNumber("project")</code>','S (15 min)'],
  ])}
  <h3>P2 — Medium (Fix Within Quarter)</h3>
  ${tbl(['ID','Area','Finding & Fix','Effort'],[
    ['CQ-01','Quality','Set up Vitest, start with business-critical logic tests','L (ongoing)'],
    ['CQ-02','Quality','Replace 26 <code>as any</code> casts in catalogue module','M (3-4 hrs)'],
    ['DATA-13','Data','Add <code>isArchived</code> to Project, Quote, PO, Invoice','M (3-4 hrs)'],
    ['DATA-12','Data','Project delete: cascade products/design/production → soft delete','M (2-3 hrs)'],
    ['COMP-02','Compliance','Wire <code>AccountingAuditLog</code> into all finance routes','M (3-4 hrs)'],
    ['COMP-05','Compliance','NCR investigation/corrective action fields + enforce state machine','M (2-3 hrs)'],
    ['ARCH-01','Architecture','Remove <code>recharts</code> and <code>xlsx</code> phantom dependencies','S (5 min)'],
  ])}
  <h3>P3 — Low (Long-term Improvements)</h3>
  ${tbl(['ID','Area','Finding & Fix','Effort'],[
    ['PERF-05','Performance','Replace 63 <code>JSON.parse(JSON.stringify())</code> with superjson','M (2-3 hrs)'],
    ['CQ-04','Quality','Review 19 <code>exhaustive-deps</code> suppressions','S (1-2 hrs)'],
    ['ARCH-03','Architecture','Add GitHub Actions CI/CD for lint + typecheck + test','M (1-2 hrs)'],
    ['ARCH-04','Architecture','Upgrade nodemailer to v8 (breaking change)','S (1 hr)'],
    ['COMP-06','Compliance','GDPR anonymisation + export endpoints','L (4-6 hrs)'],
  ])}
</div>${footer(13, 14)}</div>

<!-- ═══ 11. CONCLUSION ═══ -->
<div class="page">${header()}<div class="page-content">
  <h2>11. Conclusion & Recommended Sequence</h2>
  <h3>Production-Readiness Verdict</h3>
  ${bq('<strong>APPROACHING READY</strong> — ETHOS has improved from 5.5/10 to <strong>7.0/10</strong> in one day of focused remediation. The P0 blockers are gone. Security has been transformed from 3/10 to 7/10. Data integrity is substantially hardened. The remaining gaps are concentrated in audit logging, input validation, and parseFloat replacement — all mechanical wiring work.')}
  <h3>Remaining Blockers for Go-Live</h3>
  <ul>
    <li><strong>Audit logging</strong> on core CRUD operations (projects, quotes, POs, invoices, NCRs, finance)</li>
    <li><strong>Input validation</strong> via <code>validateBody()</code> on remaining 125 routes</li>
    <li><strong>parseFloat replacement</strong> in the 16 remaining financial routes</li>
  </ul>
  <h3>Recommended Remediation Sequence</h3>
  <ul>
    <li><strong>Week 1:</strong> Wire <code>logAudit()</code> into project/quote/PO/invoice/NCR CRUD handlers. Fix the 3 unenforced status transition routes. Fix import route number generation.</li>
    <li><strong>Week 2:</strong> Replace remaining 33 <code>parseFloat</code> calls with <code>toDecimal()</code>. Wire <code>validateBody()</code> into high-risk mutation routes (finance first).</li>
    <li><strong>Week 3:</strong> Add soft delete to Project, Quote, PO, Invoice models. Wire <code>AccountingAuditLog</code> into finance routes.</li>
    <li><strong>Ongoing:</strong> Unit test coverage. Catalogue <code>as any</code> cleanup. CI/CD pipeline.</li>
  </ul>
  <br><br>
  <hr>
  <p style="text-align:center;color:${MGRAY};font-size:9px;margin-top:14px;">Report prepared by ETHOS Development Team&nbsp;&nbsp;|&nbsp;&nbsp;Document ETHOS-AUDIT-002 v2.0&nbsp;&nbsp;|&nbsp;&nbsp;2 March 2026</p>
</div>${footer(14, 14)}</div>

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
