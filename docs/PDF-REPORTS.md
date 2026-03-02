# MME PDF Report Generation

## Design Spec (matching v1 audit report — confirmed match)

### Cover Page
- Full dark navy (#23293a) background, full bleed
- MME SVG logo (`public/mme-logo-coral.svg`) rendered in WHITE (fill swapped)
- Coral (#e95445) line divider (60px wide, 3px tall)
- Title in white (36px bold), subtitle in coral (17px light)
- Large score in coral italic (76px bold)
- Document info in green (#4ade80, 12px light weight)
- "CONFIDENTIAL — Internal Use Only" in green at bottom (absolute positioned)
- NO header/footer on cover page

### Header (every content page)
- Dark navy bar full width, 14px padding
- MME SVG logo in WHITE on left (150px wide)
- Report title in green (#4ade80) on right (10px, light weight)
- 3px coral line below the bar

### Footer (every content page)
- "ETHOS | MM Engineered Solutions | CONFIDENTIAL" left
- "X / Y" page number right
- 8px font, gray (#999), light weight

### Typography
- **Font**: PX Grotesk (loaded via @font-face from `public/fonts/pxgrotesk-*.woff2`)
  - Light (300), Regular (400), Bold (700)
  - Fallback: Segoe UI, sans-serif
- **Body**: 10.5px, line-height 1.6, font-weight 300
- **h2**: 22px bold, navy, 4px coral left border
- **h3**: 14px bold, coral
- **Tables**: Navy header rows, white text, alternating row stripes (#f8f9fa), `page-break-inside: avoid`
- **Blockquotes**: 3px coral left border, light gray bg, `page-break-inside: avoid`
- **Bullet points**: Coral dots (6px circles)
- **Code**: Coral monospace on #f0f0f0, 9.5px Consolas
- **Score bars**: Green (#22c55e) >= 7, amber (#f59e0b) >= 5, red/coral < 5

## Colors
- Navy: #23293a
- Coral: #e95445
- Cyan: #00b1eb
- Green: #4ade80 (document metadata, header title)
- White: #ffffff
- Light gray: #f8f9fa (table stripes, blockquote bg)
- Mid gray: #999 (footer text)

## How to Generate
1. **Assets**: `scripts/pdf-assets.json` — base64-encoded PX Grotesk fonts + SVG logo variants (white + coral)
2. **Script**: `scripts/generate-audit-pdf.mjs`
3. Uses Puppeteer (installed as dev dep)
4. Builds full HTML in-memory with all styling inline
5. Fonts embedded as base64 data URIs in @font-face
6. SVG logo embedded inline (white version for cover/header)
7. Headers/footers embedded manually in each `.page` div (NOT Puppeteer's displayHeaderFooter)
8. `displayHeaderFooter: false`, margins all 0 — full control via HTML
9. Run: `node scripts/generate-audit-pdf.mjs [output-path.pdf]`

## Key Architecture Decisions
- **No displayHeaderFooter** — Puppeteer's built-in header/footer has very limited CSS, renders on ALL pages (including cover), and causes table/header collision artifacts
- **Manual page numbering** — each footer div has hardcoded page numbers since we control each page
- **Embedded fonts as base64** — avoids file:// path issues across environments
- **page-break-inside: avoid** on tables and blockquotes — prevents orphaned content
- **Each .page div** = one printed page with `min-height: 100vh` and `page-break-after: always`
- **Cover page** is a separate div with no header/footer

## Template Structure for Any MME Report
```
Cover (.cover div) → Contents (.page) → Sections (.page each) → Conclusion (.page)
```

## Regenerating Assets
If fonts or logo change, regenerate `pdf-assets.json`:
```bash
node -e "
const fs = require('fs');
fs.writeFileSync('scripts/pdf-assets.json', JSON.stringify({
  fontLightB64: fs.readFileSync('public/fonts/pxgrotesk-light-webfont.woff2').toString('base64'),
  fontRegularB64: fs.readFileSync('public/fonts/pxgroteskregular-webfont.woff2').toString('base64'),
  fontBoldB64: fs.readFileSync('public/fonts/pxgrotesk-bold-webfont.woff2').toString('base64'),
  svgLogoCoral: fs.readFileSync('public/mme-logo-coral.svg','utf8'),
  svgLogoWhite: fs.readFileSync('public/mme-logo-coral.svg','utf8').replace(/fill=\"#e95445\"/g,'fill=\"#ffffff\"'),
}));
"
```
