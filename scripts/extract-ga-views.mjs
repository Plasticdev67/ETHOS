/**
 * Extract GA PDF as high-res PNG for quote system
 * Uses pdf.js via CDN to render the PDF in a canvas, then screenshots it.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GA_DIR = path.join(ROOT, 'GA Quote Designs');
const PDF_PATH = path.join(GA_DIR, '0505-02-SFDC5-GA.pdf');

async function extract() {
  const pdfB64 = fs.readFileSync(PDF_PATH).toString('base64');

  const html = `<!DOCTYPE html><html><head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<style>* { margin:0; padding:0; } body { background: white; }</style>
</head><body>
<canvas id="c"></canvas>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const data = atob('${pdfB64}');
const arr = new Uint8Array(data.length);
for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i);

pdfjsLib.getDocument({ data: arr }).promise.then(async pdf => {
  const pg = await pdf.getPage(1);
  const scale = 3; // 3x for high DPI
  const vp = pg.getViewport({ scale });
  const canvas = document.getElementById('c');
  canvas.width = vp.width;
  canvas.height = vp.height;
  const ctx = canvas.getContext('2d');
  await pg.render({ canvasContext: ctx, viewport: vp }).promise;
  document.title = 'DONE';
});
</script></body></html>`;

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for pdf.js to finish rendering
  await page.waitForFunction(() => document.title === 'DONE', { timeout: 20000 });
  await new Promise(r => setTimeout(r, 500));

  // Get canvas dimensions
  const dims = await page.evaluate(() => {
    const c = document.getElementById('c');
    return { w: c.width, h: c.height };
  });
  console.log('Canvas:', dims.w, 'x', dims.h, 'px');

  // Set viewport to match
  await page.setViewport({ width: dims.w, height: dims.h });

  const outPath = path.join(GA_DIR, 'SFDC5-full.png');
  const canvasEl = await page.$('#c');
  await canvasEl.screenshot({ path: outPath, type: 'png' });

  const stat = fs.statSync(outPath);
  console.log('Saved:', outPath);
  console.log('Size:', (stat.size / 1024).toFixed(0), 'KB');

  await browser.close();
}

extract().catch(e => { console.error(e); process.exit(1); });
