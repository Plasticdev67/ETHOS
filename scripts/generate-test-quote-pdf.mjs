/**
 * ETHOS Quote PDF Generator — Parametric GA Drawing Engine
 * Generates a branded MME quote PDF with:
 *   Page 1: Cover page (portrait)
 *   Page 2: Pricing table (portrait) — client-facing, sell prices only
 *   Page 3: GA Drawing (landscape) — parametric SVG, not screenshots
 *   Page 4: Product specification (portrait)
 *
 * Usage: node scripts/generate-test-quote-pdf.mjs [output.pdf]
 */
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const assets = JSON.parse(readFileSync(resolve(__dirname, 'pdf-assets.json'), 'utf8'));
const OUTPUT = process.argv[2] || 'Test-Quote-SFDC5.pdf';

// Load 3D isometric as base64 (this one stays as raster — 3D is genuinely hard to draw)
const gaImageB64 = readFileSync(resolve(ROOT, 'GA Quote Designs', 'SFDC5-full.png')).toString('base64');

// ── Brand ───────────────────────────────────────────────────────────────
const NAVY = '#23293a';
const CORAL = '#e95445';
const CYAN = '#00b1eb';
const GREEN = '#4ade80';
const WHITE = '#ffffff';
const LGRAY = '#f8f9fa';
const MGRAY = '#999';

// ── Logos ───────────────────────────────────────────────────────────────
const logoWhite = assets.svgLogoWhite.replace(/width="[^"]*"/, 'width="220"').replace(/height="[^"]*"/, 'height="32"');
const logoHeaderWhite = assets.svgLogoWhite.replace(/width="[^"]*"/, 'width="130"').replace(/height="[^"]*"/, 'height="19"');
const logoTitleBlock = assets.svgLogoWhite.replace(/width="[^"]*"/, 'width="60"').replace(/height="[^"]*"/, 'height="9"');

// ── Test quote data ────────────────────────────────────────────────────
const quote = {
  quoteNumber: 'QUO-2026-0042',
  revision: 1,
  date: '6 March 2026',
  validUntil: '5 April 2026',
  subject: 'Supply of C5 Security Single Flood Door',
  preparedBy: 'Stephen McDermid',
  customer: {
    name: 'UK Power Networks',
    contact: 'David Thompson',
    address: 'Newington House, 237 Southwark Bridge Road, London SE1 6NP',
  },
  site: 'Stanmore Grid Substation, London',
  workStream: 'Utilities',
  lines: [
    {
      ref: '01',
      description: 'Single Flood Door — C5 Security',
      productType: 'SFDC5',
      dimensions: '1200mm × 2100mm',
      width: 1200,
      height: 2100,
      handing: 'LH',
      handingLabel: 'Left Hand (LH)',
      quantity: 2,
      unitSell: 8750.00,
      lineTotal: 17500.00,
    },
    {
      ref: '02',
      description: 'Stainless Steel Sub-Frame',
      productType: null,
      dimensions: '1260mm × 2160mm',
      width: null, height: null, handing: null, handingLabel: null,
      quantity: 2,
      unitSell: 1250.00,
      lineTotal: 2500.00,
    },
  ],
  optionalExtras: [
    { ref: 'OPT-01', description: 'Site Survey & Templating', quantity: 1, unitSell: 850.00, lineTotal: 850.00 },
    { ref: 'OPT-02', description: 'Installation (2 doors, 2 days)', quantity: 1, unitSell: 3200.00, lineTotal: 3200.00 },
  ],
  subtotal: 20000.00,
  vatRate: 20,
  spec: {
    productType: 'Single Security Flood Door (C5)',
    bomCode: 'SFDC5-001',
    structuralOpening: '1260mm × 2160mm',
    clearOpening: '1200mm × 2100mm',
    frameMaterial: 'S355 J2 Structural Steel',
    leafMaterial: 'S355 J2 Steel, insulated core',
    finish: 'Hot Dip Galvanised + C5 Marine Grade 2-Pack Polyurethane',
    colour: 'RAL 7016 Anthracite Grey',
    threshold: 'Raised (25mm step)',
    seals: 'Twin compression gasket + hydrophilic backup',
    locking: '3-point espagnolette with euro cylinder',
    security: 'LPS 1175 SR2 / Secured by Design',
    floodRating: '600mm hydrostatic head',
    handing: 'Left Hand (viewed externally)',
    certification: 'CE Marked / UKCA / BS EN 1627',
    hinges: '3 no. heavy duty stainless steel butt hinges',
    closer: 'Concealed overhead closer, adjustable backcheck',
    accessories: 'Kick plate (150mm), letter plate blanking, vision panel (optional)',
  },
};

function fmt(n) {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ════════════════════════════════════════════════════════════════════════
// PARAMETRIC SVG RENDERERS — Single Flood Door (SFD)
// ════════════════════════════════════════════════════════════════════════

/**
 * Render SFD front elevation (View on Exterior)
 * Produces a proper engineering drawing with frame, leaf, hinges, hardware,
 * section cut indicators, and dimension lines — all parametric.
 */
function renderSFDExterior({ clearW, clearH, frameW = 60, threshH = 25, handing = 'LH' }) {
  const structW = clearW + 2 * frameW;
  const structH = clearH + frameW + threshH;
  const margin = { top: 50, right: 90, bottom: 90, left: 50 };
  const totalW = structW + margin.left + margin.right;
  const totalH = structH + margin.top + margin.bottom;
  const ox = margin.left;
  const oy = margin.top;

  let s = '';
  const line = (x1, y1, x2, y2, cls) => { s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`; };
  const rect = (x, y, w, h, cls) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`; };
  const text = (x, y, t, cls, opts = '') => { s += `<text x="${x}" y="${y}" class="${cls}" ${opts}>${t}</text>`; };

  s += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" style="width:100%;height:100%">`;
  s += `<defs><style>
    .frm{fill:#e0e0e0;stroke:#222;stroke-width:1.2}
    .leaf{fill:#f5f5f5;stroke:#1a1a1a;stroke-width:1.5}
    .thr{fill:#ccc;stroke:#222;stroke-width:1}
    .vis{stroke:#222;stroke-width:0.8;fill:none}
    .hid{stroke:#666;stroke-width:0.6;stroke-dasharray:8,4;fill:none}
    .dim{stroke:#444;stroke-width:0.4;fill:none}
    .dtx{font-family:sans-serif;font-size:11px;fill:#333;text-anchor:middle}
    .sec{stroke:${CORAL};stroke-width:1;stroke-dasharray:18,4,4,4}
    .slbl{font-family:sans-serif;font-size:10px;fill:${CORAL};text-anchor:middle;font-weight:700}
    .ctr{stroke:#888;stroke-width:0.3;stroke-dasharray:15,3,3,3}
    .hw{fill:#777;stroke:#333;stroke-width:0.6}
    .hng{fill:#666;stroke:#222;stroke-width:0.5;rx:1.5}
    .hatch{stroke:#bbb;stroke-width:0.3}
  </style></defs>`;

  // ── Frame members ──
  rect(ox, oy, structW, frameW, 'frm'); // head
  rect(ox, oy, frameW, structH, 'frm'); // left jamb
  rect(ox + structW - frameW, oy, frameW, structH, 'frm'); // right jamb
  rect(ox, oy + structH - threshH, structW, threshH, 'thr'); // threshold

  // Frame hatching (diagonal lines on frame members)
  const hatchSpacing = 8;
  // Head hatching
  for (let i = 0; i < structW + frameW; i += hatchSpacing) {
    const x1 = Math.max(ox, ox + i - frameW);
    const y1 = Math.max(oy, oy + frameW - (ox + i - x1));
    const x2 = Math.min(ox + structW, ox + i);
    const y2 = Math.min(oy + frameW, oy + (x2 - ox - i + frameW));
    if (x1 < ox + structW && x2 > ox && y1 < oy + frameW && y2 > oy) {
      s += `<line x1="${ox + i}" y1="${oy}" x2="${ox + i - frameW}" y2="${oy + frameW}" class="hatch" clip-path="url(#headClip)"/>`;
    }
  }

  // ── Door leaf ──
  const gap = 3;
  const leafX = ox + frameW + gap;
  const leafY = oy + frameW + gap;
  const leafW = clearW - 2 * gap;
  const leafH = clearH - gap;
  rect(leafX, leafY, leafW, leafH, 'leaf');

  // ── Hinges (3 no.) ──
  const hingeW = 12, hingeH = 24;
  const isLH = handing === 'LH';
  const hingeSide = isLH ? ox + frameW - 2 : ox + structW - frameW - hingeW + 2;
  const hingePositions = [0.12, 0.5, 0.88];
  for (const p of hingePositions) {
    const hy = oy + frameW + clearH * p - hingeH / 2;
    s += `<rect x="${hingeSide}" y="${hy}" width="${hingeW}" height="${hingeH}" class="hng"/>`;
    // Hinge pin
    s += `<circle cx="${hingeSide + hingeW / 2}" cy="${hy + hingeH / 2}" r="2.5" fill="#999" stroke="#333" stroke-width="0.5"/>`;
  }

  // ── Lock & handle (opposite side to hinges) ──
  const lockSide = isLH ? ox + structW - frameW + 6 : ox + frameW - 26;
  const lockY = oy + frameW + clearH * 0.47;
  // Handle (lever)
  s += `<rect x="${lockSide}" y="${lockY}" width="20" height="8" rx="3" class="hw"/>`;
  // Escutcheon
  s += `<rect x="${lockSide + 6}" y="${lockY + 14}" width="8" height="16" rx="2" class="hw"/>`;
  // Keyhole
  s += `<circle cx="${lockSide + 10}" cy="${lockY + 22}" r="2" fill="#555"/>`;
  // Lock bolt indicators (3-point)
  const boltX = isLH ? ox + structW - frameW - 1 : ox + frameW + 1;
  for (const by of [0.15, 0.47, 0.82]) {
    s += `<line x1="${boltX}" y1="${oy + frameW + clearH * by - 6}" x2="${boltX}" y2="${oy + frameW + clearH * by + 6}" stroke="#e95445" stroke-width="1.5"/>`;
    s += `<line x1="${boltX - 3}" y1="${oy + frameW + clearH * by}" x2="${boltX + 3}" y2="${oy + frameW + clearH * by}" stroke="#e95445" stroke-width="1"/>`;
  }

  // ── Center lines ──
  const cx = ox + structW / 2;
  const cy = oy + frameW + clearH / 2;
  line(cx, oy - 8, cx, oy + structH + 8, 'ctr');
  line(ox - 8, cy, ox + structW + 8, cy, 'ctr');

  // ── Section cut indicators ──
  // A-A (horizontal, through mid-height)
  const secAY = oy + frameW + clearH * 0.4;
  line(ox - 20, secAY, ox + structW + 20, secAY, 'sec');
  text(ox - 28, secAY + 4, 'A', 'slbl');
  text(ox + structW + 28, secAY + 4, 'A', 'slbl');
  // Direction arrows
  s += `<polygon points="${ox - 20},${secAY - 5} ${ox - 20},${secAY + 5} ${ox - 12},${secAY}" fill="${CORAL}"/>`;
  s += `<polygon points="${ox + structW + 20},${secAY - 5} ${ox + structW + 20},${secAY + 5} ${ox + structW + 12},${secAY}" fill="${CORAL}"/>`;

  // B-B (vertical, through threshold)
  const secBX = ox + structW * 0.45;
  line(secBX, oy + structH + 20, secBX, oy + structH - threshH - 40, 'sec');
  text(secBX, oy + structH + 32, 'B', 'slbl');
  text(secBX, oy + structH - threshH - 48, 'B', 'slbl');

  // ── Dimension lines ──
  function dimH(x1, x2, baseY, label, offset) {
    const y = baseY + offset;
    const ext = offset > 0 ? 6 : -6;
    // Extension lines
    line(x1, baseY, x1, y + ext, 'dim');
    line(x2, baseY, x2, y + ext, 'dim');
    // Dimension line
    line(x1, y, x2, y, 'dim');
    // Arrow heads
    s += `<polygon points="${x1},${y} ${x1 + 5},${y - 2} ${x1 + 5},${y + 2}" fill="#444"/>`;
    s += `<polygon points="${x2},${y} ${x2 - 5},${y - 2} ${x2 - 5},${y + 2}" fill="#444"/>`;
    // Text
    text((x1 + x2) / 2, y - 4, label, 'dtx');
  }

  function dimV(y1, y2, baseX, label, offset) {
    const x = baseX + offset;
    const ext = offset > 0 ? 6 : -6;
    line(baseX, y1, x + ext, y1, 'dim');
    line(baseX, y2, x + ext, y2, 'dim');
    line(x, y1, x, y2, 'dim');
    s += `<polygon points="${x},${y1} ${x - 2},${y1 + 5} ${x + 2},${y1 + 5}" fill="#444"/>`;
    s += `<polygon points="${x},${y2} ${x - 2},${y2 - 5} ${x + 2},${y2 - 5}" fill="#444"/>`;
    // Rotated text
    const my = (y1 + y2) / 2;
    s += `<text x="${x + 14}" y="${my}" class="dtx" transform="rotate(-90,${x + 14},${my})">${label}</text>`;
  }

  // Clear opening width
  dimH(ox + frameW, ox + frameW + clearW, oy + structH, `${clearW}`, 30);
  // Structural opening width
  dimH(ox, ox + structW, oy + structH, `${structW}`, 60);
  // Clear opening height
  dimV(oy + frameW, oy + frameW + clearH, ox + structW, `${clearH}`, 30);
  // Structural opening height
  dimV(oy, oy + structH, ox + structW, `${structH}`, 60);
  // Frame width (top)
  dimH(ox, ox + frameW, oy, `${frameW}`, -25);
  // Threshold height (right side, small)
  dimV(oy + structH - threshH, oy + structH, ox, `${threshH}`, -30);

  // ── View label ──
  text(ox + structW / 2, totalH - 8, 'VIEW ON EXTERIOR', 'dtx', 'font-weight="700" font-size="12"');

  s += '</svg>';
  return s;
}

/**
 * Render SFD end/side view
 */
function renderSFDEndView({ clearH, frameW = 60, frameD = 75, threshH = 25 }) {
  const structH = clearH + frameW + threshH;
  const margin = { top: 50, right: 50, bottom: 90, left: 40 };
  const totalW = frameD + margin.left + margin.right;
  const totalH = structH + margin.top + margin.bottom;
  const ox = margin.left;
  const oy = margin.top;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" style="width:100%;height:100%">`;
  s += `<defs><style>
    .frm{fill:#e0e0e0;stroke:#222;stroke-width:1.2}
    .leaf{fill:#f5f5f5;stroke:#1a1a1a;stroke-width:1.5}
    .thr{fill:#ccc;stroke:#222;stroke-width:1}
    .dim{stroke:#444;stroke-width:0.4;fill:none}
    .dtx{font-family:sans-serif;font-size:11px;fill:#333;text-anchor:middle}
    .seal{fill:#e95445;stroke:#c0392b;stroke-width:0.5}
  </style></defs>`;

  // Frame outline
  s += `<rect x="${ox}" y="${oy}" width="${frameD}" height="${structH}" class="frm"/>`;

  // Frame channel profile (U-shape visible from side)
  const flangeW = 8;
  const webD = 3;
  // Exterior flange
  s += `<rect x="${ox}" y="${oy + frameW}" width="${flangeW}" height="${clearH}" fill="#d0d0d0" stroke="#222" stroke-width="0.8"/>`;
  // Interior flange
  s += `<rect x="${ox + frameD - flangeW}" y="${oy + frameW}" width="${flangeW}" height="${clearH}" fill="#d0d0d0" stroke="#222" stroke-width="0.8"/>`;

  // Door leaf (seen from side — thin rectangle)
  const leafThick = 54;
  const leafX = ox + (frameD - leafThick) / 2;
  s += `<rect x="${leafX}" y="${oy + frameW + 3}" width="${leafThick}" height="${clearH - 3}" fill="#e8e8e8" stroke="#1a1a1a" stroke-width="1.2"/>`;

  // Seals (compression gaskets)
  const sealW = 4;
  // Exterior seal
  s += `<rect x="${leafX - sealW - 1}" y="${oy + frameW + 10}" width="${sealW}" height="${clearH - 20}" rx="2" class="seal"/>`;
  // Interior seal
  s += `<rect x="${leafX + leafThick + 1}" y="${oy + frameW + 10}" width="${sealW}" height="${clearH - 20}" rx="2" class="seal"/>`;

  // Threshold
  s += `<rect x="${ox}" y="${oy + structH - threshH}" width="${frameD}" height="${threshH}" class="thr"/>`;

  // Dimension: frame depth
  const dy = oy + structH + 30;
  s += `<line x1="${ox}" y1="${oy + structH}" x2="${ox}" y2="${dy + 6}" class="dim"/>`;
  s += `<line x1="${ox + frameD}" y1="${oy + structH}" x2="${ox + frameD}" y2="${dy + 6}" class="dim"/>`;
  s += `<line x1="${ox}" y1="${dy}" x2="${ox + frameD}" y2="${dy}" class="dim"/>`;
  s += `<polygon points="${ox},${dy} ${ox + 5},${dy - 2} ${ox + 5},${dy + 2}" fill="#444"/>`;
  s += `<polygon points="${ox + frameD},${dy} ${ox + frameD - 5},${dy - 2} ${ox + frameD - 5},${dy + 2}" fill="#444"/>`;
  s += `<text x="${ox + frameD / 2}" y="${dy - 4}" class="dtx">${frameD}</text>`;

  // View label
  s += `<text x="${ox + frameD / 2}" y="${totalH - 8}" class="dtx" font-weight="700" font-size="12">END VIEW</text>`;

  s += '</svg>';
  return s;
}

/**
 * Render Section A-A (horizontal cut through frame at mid-height)
 * Shows: wall, frame profile, door leaf, seals, gap
 */
function renderSFDSectionAA({ clearW, frameW = 60, frameD = 75, leafThick = 54 }) {
  const structW = clearW + 2 * frameW;
  const margin = { top: 30, right: 30, bottom: 30, left: 30 };
  const viewH = frameD + 40; // show some wall either side
  const totalW = structW + margin.left + margin.right;
  const totalH = viewH + margin.top + margin.bottom;
  const ox = margin.left;
  const oy = margin.top;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" style="width:100%;height:100%">`;
  s += `<defs><style>
    .cut{fill:#d0d0d0;stroke:#222;stroke-width:1.2}
    .wall{fill:#e8e0d0;stroke:#222;stroke-width:1}
    .leaf{fill:#ddd;stroke:#1a1a1a;stroke-width:1.2}
    .seal{fill:${CORAL};stroke:#c0392b;stroke-width:0.5}
    .dtx{font-family:sans-serif;font-size:9px;fill:#333;text-anchor:middle}
    .lbl{font-family:sans-serif;font-size:8px;fill:#666;text-anchor:start}
    .hatch{stroke:#aaa;stroke-width:0.25}
  </style></defs>`;

  const wallT = 15; // wall thickness shown
  const exteriorY = oy;
  const interiorY = oy + frameD;

  // Wall (left side — showing cut face with hatching)
  s += `<rect x="${ox}" y="${exteriorY}" width="${frameW}" height="${viewH}" class="wall"/>`;
  s += `<rect x="${ox + structW - frameW}" y="${exteriorY}" width="${frameW}" height="${viewH}" class="wall"/>`;

  // Frame sections (cut through — shown as filled rectangles with hatching)
  // Left frame (C-channel section)
  const fcy = oy + 10; // frame starts slightly in from wall
  const fcH = frameD - 20;
  s += `<rect x="${ox + frameW - 8}" y="${fcy}" width="8" height="${fcH}" class="cut"/>`;
  s += `<rect x="${ox + frameW - 8}" y="${fcy}" width="${frameD * 0.3}" height="5" class="cut"/>`;
  s += `<rect x="${ox + frameW - 8}" y="${fcy + fcH - 5}" width="${frameD * 0.3}" height="5" class="cut"/>`;

  // Right frame (mirror)
  s += `<rect x="${ox + structW - frameW}" y="${fcy}" width="8" height="${fcH}" class="cut"/>`;
  s += `<rect x="${ox + structW - frameW - frameD * 0.3 + 8}" y="${fcy}" width="${frameD * 0.3}" height="5" class="cut"/>`;
  s += `<rect x="${ox + structW - frameW - frameD * 0.3 + 8}" y="${fcy + fcH - 5}" width="${frameD * 0.3}" height="5" class="cut"/>`;

  // Door leaf (horizontal section — full width)
  const leafY = oy + (frameD - leafThick) / 2 + 10;
  s += `<rect x="${ox + frameW + 3}" y="${leafY}" width="${clearW - 6}" height="${leafThick}" class="leaf"/>`;

  // Insulation core (hatching inside leaf)
  for (let i = 0; i < clearW; i += 6) {
    const lx = ox + frameW + 3 + i;
    if (lx < ox + frameW + clearW - 6) {
      s += `<line x1="${lx}" y1="${leafY}" x2="${lx + 6}" y2="${leafY + leafThick}" class="hatch"/>`;
    }
  }

  // Seals
  const sealH = 5;
  // Exterior seals
  s += `<rect x="${ox + frameW + 3}" y="${leafY - sealH - 1}" width="${clearW - 6}" height="${sealH}" rx="2" class="seal"/>`;
  // Interior seals
  s += `<rect x="${ox + frameW + 3}" y="${leafY + leafThick + 1}" width="${clearW - 6}" height="${sealH}" rx="2" class="seal"/>`;

  // Labels
  s += `<text x="${ox + structW / 2}" y="${totalH - 5}" class="dtx" font-weight="700" font-size="10">SECTION A-A</text>`;

  // Arrow labels
  s += `<text x="${ox + 15}" y="${exteriorY - 5}" class="lbl">EXT</text>`;
  s += `<text x="${ox + 15}" y="${interiorY + 25}" class="lbl">INT</text>`;

  s += '</svg>';
  return s;
}

/**
 * Render Section B-B (vertical cut through threshold)
 */
function renderSFDSectionBB({ frameD = 75, threshH = 25, leafThick = 54 }) {
  const margin = { top: 20, right: 20, bottom: 30, left: 20 };
  const viewW = frameD + 60;
  const viewH = 100;
  const totalW = viewW + margin.left + margin.right;
  const totalH = viewH + margin.top + margin.bottom;
  const ox = margin.left;
  const oy = margin.top;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" style="width:100%;height:100%">`;
  s += `<defs><style>
    .cut{fill:#d0d0d0;stroke:#222;stroke-width:1}
    .thr{fill:#ccc;stroke:#222;stroke-width:1}
    .leaf{fill:#e8e8e8;stroke:#1a1a1a;stroke-width:1.2}
    .floor{fill:#f0ebe0;stroke:#222;stroke-width:0.8}
    .seal{fill:${CORAL};stroke:#c0392b;stroke-width:0.5}
    .dtx{font-family:sans-serif;font-size:9px;fill:#333;text-anchor:middle}
    .lbl{font-family:sans-serif;font-size:7px;fill:#666}
    .dim{stroke:#444;stroke-width:0.3;fill:none}
  </style></defs>`;

  const floorY = oy + 50;

  // External floor level
  s += `<rect x="${ox}" y="${floorY}" width="${viewW}" height="30" class="floor"/>`;

  // Threshold
  const thrX = ox + 20;
  s += `<rect x="${thrX}" y="${floorY - threshH}" width="${frameD}" height="${threshH}" class="thr"/>`;

  // Door leaf bottom
  const leafX = thrX + (frameD - leafThick) / 2;
  s += `<rect x="${leafX}" y="${floorY - threshH - 40}" width="${leafThick}" height="40" class="leaf"/>`;

  // Bottom seal
  s += `<rect x="${leafX + 5}" y="${floorY - threshH - 2}" width="${leafThick - 10}" height="4" rx="2" class="seal"/>`;

  // Threshold step dimension
  const dimX1 = thrX + frameD + 10;
  s += `<line x1="${dimX1}" y1="${floorY}" x2="${dimX1}" y2="${floorY - threshH}" class="dim"/>`;
  s += `<line x1="${thrX + frameD}" y1="${floorY}" x2="${dimX1 + 5}" y2="${floorY}" class="dim"/>`;
  s += `<line x1="${thrX + frameD}" y1="${floorY - threshH}" x2="${dimX1 + 5}" y2="${floorY - threshH}" class="dim"/>`;
  s += `<text x="${dimX1 + 14}" y="${floorY - threshH / 2 + 3}" class="lbl">${threshH}mm</text>`;

  // Level labels
  s += `<text x="${ox + 3}" y="${floorY - 3}" class="lbl">EXTERNAL FINISHED FLOOR LEVEL</text>`;
  s += `<text x="${ox + 3}" y="${floorY - threshH - 3}" class="lbl">INTERNAL FINISHED FLOOR LEVEL</text>`;

  // View label
  s += `<text x="${totalW / 2}" y="${totalH - 5}" class="dtx" font-weight="700" font-size="10">SECTION B-B (THRESHOLD)</text>`;

  s += '</svg>';
  return s;
}

// ── Generate SVG views ─────────────────────────────────────────────────
const doorLine = quote.lines[0];
const svgExterior = renderSFDExterior({
  clearW: doorLine.width,
  clearH: doorLine.height,
  handing: doorLine.handing,
});
const svgEndView = renderSFDEndView({
  clearH: doorLine.height,
});
const svgSectionAA = renderSFDSectionAA({
  clearW: doorLine.width,
});
const svgSectionBB = renderSFDSectionBB({});

// ── HTML ────────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@font-face { font-family:'PX Grotesk'; font-weight:300; src:url(data:font/woff2;base64,${assets.fontLightB64}) format('woff2'); }
@font-face { font-family:'PX Grotesk'; font-weight:400; src:url(data:font/woff2;base64,${assets.fontRegularB64}) format('woff2'); }
@font-face { font-family:'PX Grotesk'; font-weight:700; src:url(data:font/woff2;base64,${assets.fontBoldB64}) format('woff2'); }

@page { size: A4 portrait; margin: 0; }
@page landscape { size: A4 landscape; margin: 0; }
* { box-sizing:border-box; margin:0; padding:0; }
html, body { width:100%; margin:0; }
body { font-family:'PX Grotesk','Segoe UI',sans-serif; font-size:10.5px; line-height:1.6; color:${NAVY}; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

/* ── Cover ─────────────────────────── */
.cover { width:210mm; height:297mm; background:${NAVY}; display:flex; flex-direction:column; padding:60px 50px; position:relative; page-break-after:always; overflow:hidden; }
.cover-top { flex:1; display:flex; flex-direction:column; justify-content:center; }
.cover .logo-wrap { margin-bottom:40px; }
.cover .divider { width:60px; height:3px; background:${CORAL}; margin:24px 0; }
.cover h1 { font-size:38px; font-weight:700; color:${WHITE}; line-height:1.2; margin-bottom:12px; }
.cover .subtitle { font-size:18px; color:${CORAL}; font-weight:300; margin-bottom:6px; }
.cover .ref { font-size:14px; color:${GREEN}; font-weight:300; letter-spacing:0.5px; margin-top:30px; }
.cover-details { padding-top:40px; border-top:1px solid rgba(255,255,255,0.15); }
.cover-grid { display:grid; grid-template-columns:1fr 1fr; gap:30px; }
.cover-section h3 { font-size:10px; color:${CORAL}; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px; }
.cover-section p { font-size:12px; color:rgba(255,255,255,0.85); font-weight:300; line-height:1.7; }
.cover-section .value { color:${WHITE}; font-weight:400; }
.cover .confidential { position:absolute; bottom:40px; left:50px; right:50px; display:flex; justify-content:space-between; align-items:center; }
.cover .confidential span { font-size:9px; color:${GREEN}; letter-spacing:1px; font-weight:300; }

/* ── Page layout ──────────────────── */
.page { width:210mm; height:297mm; padding:0; page-break-after:always; display:flex; flex-direction:column; overflow:hidden; position:relative; }
.page-landscape { width:297mm; height:210mm; page:landscape; }
.page-header { flex-shrink:0; }
.hdr-bar { background:${NAVY}; padding:12px 40px; display:flex; align-items:center; }
.hdr-inner { width:100%; display:flex; justify-content:space-between; align-items:center; }
.hdr-title { color:${GREEN}; font-size:9px; font-weight:300; letter-spacing:0.5px; }
.hdr-line { height:3px; background:${CORAL}; }
.page-content { flex:1; padding:28px 44px 16px; overflow:hidden; }
.page-footer { flex-shrink:0; padding:10px 44px 14px; display:flex; justify-content:space-between; font-size:7.5px; color:${MGRAY}; font-weight:300; }

/* ── Typography ───────────────────── */
h2 { font-size:20px; font-weight:700; color:${NAVY}; border-left:4px solid ${CORAL}; padding-left:14px; margin:0 0 16px; }
h3 { font-size:13px; font-weight:700; color:${CORAL}; margin:18px 0 8px; }
p { margin:4px 0; font-weight:300; }
strong { font-weight:700; color:${NAVY}; }

/* ── Tables ───────────────────────── */
table { width:100%; border-collapse:collapse; margin:10px 0; font-size:10px; }
th { background:${NAVY}; color:${WHITE}; padding:8px 12px; text-align:left; font-weight:400; font-size:9px; letter-spacing:0.3px; }
th.right { text-align:right; }
td { padding:8px 12px; border-bottom:1px solid #e5e7eb; font-weight:300; }
td.right { text-align:right; }
td.bold { font-weight:700; }
tr.alt { background:${LGRAY}; }
tr.subtotal-row td { border-top:2px solid ${NAVY}; font-weight:700; font-size:11px; padding-top:12px; }
tr.total-row td { border-top:3px solid ${CORAL}; font-weight:700; font-size:13px; color:${NAVY}; padding-top:14px; }
tr.optional td { color:#6b7280; font-style:italic; }

/* ── Spec table ───────────────────── */
.spec-table { margin:14px 0; }
.spec-table td { padding:6px 14px; font-size:10px; }
.spec-table td:first-child { font-weight:700; color:${NAVY}; width:200px; background:${LGRAY}; }
.spec-table td:last-child { font-weight:300; }

/* ── Drawing sheet ────────────────── */
.drawing-sheet { flex:1; display:flex; flex-direction:column; margin:6px 14px 0; border:2.5px solid ${NAVY}; overflow:hidden; }
.drawing-area { flex:1; display:grid; grid-template-columns:2.2fr 0.8fr 1.8fr 1.2fr; grid-template-rows:0.7fr 1fr; gap:0; }
.drawing-watermark { position:absolute; top:42%; left:45%; transform:translate(-50%,-50%) rotate(-20deg); font-size:28px; font-weight:700; color:rgba(233,84,69,0.05); letter-spacing:5px; white-space:nowrap; pointer-events:none; z-index:10; }
.view-cell { border:0.5px solid #e0e0e0; overflow:hidden; display:flex; align-items:center; justify-content:center; padding:4px; background:#fff; }
.view-cell svg { width:100%; height:100%; }
.view-iso { background:#fafafa; }
.view-iso img { max-width:100%; max-height:100%; object-fit:contain; }

/* ── Title block ──────────────────── */
.title-block { display:grid; grid-template-columns:1fr 180px; border-top:2.5px solid ${NAVY}; flex-shrink:0; }
.tb-left { display:grid; grid-template-columns:repeat(5,1fr); font-size:7px; }
.tb-cell { border-right:0.5px solid #ccc; padding:5px 8px; display:flex; flex-direction:column; justify-content:center; }
.tb-label { font-size:6px; color:${MGRAY}; text-transform:uppercase; letter-spacing:0.5px; }
.tb-val { font-size:8px; font-weight:700; color:${NAVY}; margin-top:1px; }
.tb-right { background:${NAVY}; display:flex; align-items:center; justify-content:center; padding:6px 14px; gap:10px; }
.tb-dwg { font-size:10px; font-weight:700; color:${WHITE}; }
.tb-status { font-size:6.5px; color:${CORAL}; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-top:2px; }

/* ── Approval box ─────────────────── */
.approval-box { border:2px solid ${NAVY}; padding:20px; margin:20px 0; }
.approval-box h3 { margin:0 0 14px; color:${NAVY}; font-size:14px; border-bottom:2px solid ${CORAL}; padding-bottom:8px; }
.approval-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.approval-field { border-bottom:1px solid #ccc; padding:8px 0 4px; }
.approval-field .label { font-size:8px; color:${MGRAY}; text-transform:uppercase; letter-spacing:1px; }
.approval-field .space { height:24px; }

/* ── Notes ─────────────────────────── */
.notes-box { background:${LGRAY}; border-left:3px solid ${CORAL}; padding:14px 18px; margin:16px 0; font-size:9.5px; color:#374151; }
.notes-box h4 { font-size:10px; font-weight:700; color:${NAVY}; margin-bottom:6px; }
.notes-box ul { margin:4px 0 0 16px; }
.notes-box li { margin:3px 0; font-weight:300; }

/* ── Dim badge ─────────────────────── */
.dim-badge { display:inline-block; background:${CYAN}; color:${WHITE}; padding:3px 10px; border-radius:3px; font-size:9px; font-weight:700; letter-spacing:0.3px; margin:2px 4px; }
</style></head><body>

<!-- ═══ PAGE 1: COVER ═══ -->
<div class="cover">
  <div class="cover-top">
    <div class="logo-wrap">${logoWhite}</div>
    <div class="divider"></div>
    <h1>Quotation</h1>
    <div class="subtitle">${quote.subject}</div>
    <div class="ref">${quote.quoteNumber}&nbsp;&nbsp;|&nbsp;&nbsp;Rev ${quote.revision}&nbsp;&nbsp;|&nbsp;&nbsp;${quote.date}</div>
  </div>
  <div class="cover-details">
    <div class="cover-grid">
      <div class="cover-section">
        <h3>Customer</h3>
        <p class="value">${quote.customer.name}</p>
        <p>Attn: ${quote.customer.contact}</p>
        <p>${quote.customer.address}</p>
      </div>
      <div class="cover-section">
        <h3>Project Details</h3>
        <p><span class="value">Site:</span> ${quote.site}</p>
        <p><span class="value">Work Stream:</span> ${quote.workStream}</p>
        <p><span class="value">Valid Until:</span> ${quote.validUntil}</p>
        <p><span class="value">Prepared By:</span> ${quote.preparedBy}</p>
      </div>
    </div>
  </div>
  <div class="confidential">
    <span>CONFIDENTIAL — Commercial in Confidence</span>
    <span>MM Engineered Solutions Ltd</span>
  </div>
</div>

<!-- ═══ PAGE 2: PRICING ═══ -->
<div class="page">
  <div class="page-header">
    <div class="hdr-bar"><div class="hdr-inner">${logoHeaderWhite}<span class="hdr-title">${quote.quoteNumber} — ${quote.customer.name}</span></div></div>
    <div class="hdr-line"></div>
  </div>
  <div class="page-content">
    <h2>Commercial Proposal</h2>
    <p style="margin-bottom:16px;">We are pleased to submit the following quotation for your consideration:</p>

    <h3>Supply Items</h3>
    <table>
      <thead>
        <tr>
          <th style="width:40px;">Ref</th>
          <th>Description</th>
          <th style="width:60px;">Qty</th>
          <th class="right" style="width:90px;">Unit Price</th>
          <th class="right" style="width:100px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${quote.lines.map((l, i) => `
        <tr${i % 2 ? ' class="alt"' : ''}>
          <td>${l.ref}</td>
          <td><strong>${l.description}</strong>${l.dimensions ? '<br><span class="dim-badge">' + l.dimensions + '</span>' : ''}${l.handingLabel ? ' <span class="dim-badge">' + l.handingLabel + '</span>' : ''}</td>
          <td>${l.quantity}</td>
          <td class="right">${fmt(l.unitSell)}</td>
          <td class="right bold">${fmt(l.lineTotal)}</td>
        </tr>`).join('')}
        <tr class="subtotal-row">
          <td colspan="4">Subtotal (Excl. VAT)</td>
          <td class="right">${fmt(quote.subtotal)}</td>
        </tr>
      </tbody>
    </table>

    ${quote.optionalExtras.length > 0 ? `
    <h3>Optional Extras</h3>
    <table>
      <thead><tr><th style="width:40px;">Ref</th><th>Description</th><th style="width:60px;">Qty</th><th class="right" style="width:90px;">Unit Price</th><th class="right" style="width:100px;">Total</th></tr></thead>
      <tbody>
        ${quote.optionalExtras.map((l, i) => `
        <tr class="optional${i % 2 ? ' alt' : ''}">
          <td>${l.ref}</td><td>${l.description}</td><td>${l.quantity}</td>
          <td class="right">${fmt(l.unitSell)}</td><td class="right">${fmt(l.lineTotal)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <div style="margin-top:20px;">
      <table><tbody>
        <tr class="total-row">
          <td colspan="4" style="border-top:3px solid ${CORAL};"><strong>Total (Excl. VAT)</strong></td>
          <td class="right" style="border-top:3px solid ${CORAL}; width:100px;"><strong>${fmt(quote.subtotal)}</strong></td>
        </tr>
      </tbody></table>
    </div>

    <div class="notes-box" style="margin-top:24px;">
      <h4>Notes &amp; Conditions</h4>
      <ul>
        <li>All prices are exclusive of VAT at the prevailing rate (currently ${quote.vatRate}%)</li>
        <li>This quotation is valid for 30 days from the date of issue</li>
        <li>Delivery: 8–12 weeks from order and receipt of approved GA drawings</li>
        <li>Payment terms: 30 days net from date of invoice</li>
        <li>Prices exclude all civil/builders works unless stated in optional extras</li>
        <li>Installation scope (if included) assumes clear, level, and plumb structural opening</li>
      </ul>
    </div>
  </div>
  <div class="page-footer">
    <span>ETHOS&nbsp;&nbsp;|&nbsp;&nbsp;MM Engineered Solutions Ltd&nbsp;&nbsp;|&nbsp;&nbsp;CONFIDENTIAL</span>
    <span>2 / 4</span>
  </div>
</div>

<!-- ═══ PAGE 3: GA DRAWING (Landscape) ═══ -->
<div class="page page-landscape" style="position:relative;">
  <div class="page-header">
    <div class="hdr-bar"><div class="hdr-inner">${logoHeaderWhite}<span class="hdr-title">General Arrangement — ${doorLine.description}</span></div></div>
    <div class="hdr-line"></div>
  </div>

  <div class="drawing-sheet">
    <div class="drawing-watermark">FOR APPROVAL — NOT FOR CONSTRUCTION</div>
    <div class="drawing-area">
      <!-- Row 1: Section A-A, Section B-B, (spacer), Isometric -->
      <div class="view-cell">${svgSectionAA}</div>
      <div class="view-cell">${svgSectionBB}</div>
      <div class="view-cell" style="border:none; background:transparent;"></div>
      <div class="view-cell view-iso" style="grid-row:1/3;">
        <img src="data:image/png;base64,${gaImageB64}" alt="3D View"
             style="object-fit:none; object-position:78% 15%; width:100%; height:100%; transform:scale(2.8);" />
      </div>

      <!-- Row 2: Front Elevation, End View, Interior (placeholder) -->
      <div class="view-cell">${svgExterior}</div>
      <div class="view-cell">${svgEndView}</div>
      <div class="view-cell" style="display:flex;align-items:center;justify-content:center;color:#ccc;font-size:11px;font-weight:300;">
        <div style="text-align:center;">
          <div style="font-size:24px;margin-bottom:6px;">⟳</div>
          VIEW ON INTERIOR<br>
          <span style="font-size:8px;">(mirror of exterior)</span>
        </div>
      </div>
    </div>

    <!-- Title block -->
    <div class="title-block">
      <div class="tb-left">
        <div class="tb-cell">
          <span class="tb-label">Quote Ref</span>
          <span class="tb-val">${quote.quoteNumber}</span>
        </div>
        <div class="tb-cell">
          <span class="tb-label">Product</span>
          <span class="tb-val">${doorLine.productType}</span>
        </div>
        <div class="tb-cell">
          <span class="tb-label">Clear Opening</span>
          <span class="tb-val">${doorLine.width} × ${doorLine.height}mm</span>
        </div>
        <div class="tb-cell">
          <span class="tb-label">Handing</span>
          <span class="tb-val">${doorLine.handingLabel}</span>
        </div>
        <div class="tb-cell">
          <span class="tb-label">Date / Rev</span>
          <span class="tb-val">${quote.date} / Rev ${quote.revision}</span>
        </div>
      </div>
      <div class="tb-right">
        <div style="text-align:right;">
          <div class="tb-dwg">${doorLine.productType}</div>
          <div class="tb-status">For Approval Only</div>
        </div>
        ${logoTitleBlock}
      </div>
    </div>
  </div>

  <div class="page-footer">
    <span>ETHOS&nbsp;&nbsp;|&nbsp;&nbsp;MM Engineered Solutions Ltd&nbsp;&nbsp;|&nbsp;&nbsp;CONFIDENTIAL</span>
    <span>3 / 4</span>
  </div>
</div>

<!-- ═══ PAGE 4: SPECIFICATION ═══ -->
<div class="page">
  <div class="page-header">
    <div class="hdr-bar"><div class="hdr-inner">${logoHeaderWhite}<span class="hdr-title">${quote.quoteNumber} — Product Specification</span></div></div>
    <div class="hdr-line"></div>
  </div>
  <div class="page-content">
    <h2>Product Specification</h2>
    <p style="margin-bottom:4px;"><strong>${doorLine.description}</strong>&nbsp;&nbsp;<span class="dim-badge">${doorLine.dimensions}</span>&nbsp;&nbsp;<span class="dim-badge">${doorLine.handingLabel}</span></p>
    <p style="margin-bottom:16px; color:${MGRAY}; font-size:9px;">Reference: ${doorLine.productType} — ${quote.spec.bomCode}</p>

    <table class="spec-table"><tbody>
      ${Object.entries(quote.spec).map(([k, v], i) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        return `<tr${i % 2 ? ' class="alt"' : ''}><td>${label}</td><td>${v}</td></tr>`;
      }).join('')}
    </tbody></table>

    <div class="approval-box">
      <h3>Client Approval</h3>
      <div class="approval-grid">
        <div class="approval-field"><div class="label">Approved By (Print Name)</div><div class="space"></div></div>
        <div class="approval-field"><div class="label">Position / Title</div><div class="space"></div></div>
        <div class="approval-field"><div class="label">Signature</div><div class="space"></div></div>
        <div class="approval-field"><div class="label">Date</div><div class="space"></div></div>
      </div>
    </div>

    <div class="notes-box">
      <h4>Important</h4>
      <ul>
        <li>This specification is indicative and subject to detailed design upon order placement</li>
        <li>Final GA drawings will be issued for formal approval prior to manufacture</li>
        <li>Any changes after GA approval may incur additional costs and programme delays</li>
        <li>All products are manufactured to BS EN 1627 / PAS 1188 as applicable</li>
      </ul>
    </div>
  </div>
  <div class="page-footer">
    <span>ETHOS&nbsp;&nbsp;|&nbsp;&nbsp;MM Engineered Solutions Ltd&nbsp;&nbsp;|&nbsp;&nbsp;CONFIDENTIAL</span>
    <span>4 / 4</span>
  </div>
</div>

</body></html>`;

// ── Generate PDF ────────────────────────────────────────────────────────

async function generatePDF() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  console.log('Generating PDF...');
  await page.pdf({
    path: OUTPUT,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });

  await browser.close();
  console.log('Quote PDF generated:', OUTPUT);
}

generatePDF().catch(e => { console.error(e); process.exit(1); });
