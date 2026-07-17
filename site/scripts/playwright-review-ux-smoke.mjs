/**
 * Mobile UX smoke for download / replace / submit-confirm patterns.
 * Run with server on :3010: node scripts/playwright-review-ux-smoke.mjs
 */
import { chromium, devices } from 'playwright';
import { createRequire } from 'module';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '.tmp-pw-smoke');
mkdirSync(outDir, { recursive: true });

const SUBMIT_CONFIRM =
  'Submit this review?\n\nOnce you submit, you cannot change or replace the video. Make sure this is the right one.';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    acceptDownloads: true,
  });
  const page = await context.newPage();

  // 1) Example review video is served
  const videoRes = await context.request.get('http://localhost:3010/katie_henry_review.mov');
  if (!videoRes.ok()) {
    throw new Error('Example video failed to load: ' + videoRes.status());
  }
  const videoBytes = (await videoRes.body()).length;
  if (videoBytes < 1000) throw new Error('Example video too small');
  console.log('OK mobile fetch example video', videoBytes, 'bytes');

  // 2) Interactive harness: download + file replace + submit confirm
  await page.goto('about:blank');
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <body style="background:#111;color:#fff;font-family:system-ui;padding:16px">
      <button id="download" style="min-height:48px;width:100%;margin-bottom:12px">Download all</button>
      <input id="file" type="file" accept="video/*" />
      <button id="choose" style="min-height:48px;width:100%;margin:12px 0">Choose video</button>
      <button id="replace" style="min-height:48px;width:100%;margin-bottom:12px">Replace video</button>
      <video id="preview" controls playsinline style="width:100%;aspect-ratio:16/9;background:#000"></video>
      <p id="fileLabel"></p>
      <button id="submit" style="min-height:52px;width:100%;margin-top:12px">Submit review</button>
      <pre id="log"></pre>
      <script>
        const log = (m) => { document.getElementById('log').textContent += m + '\\n'; };
        window.__state = { fileName: null, submitted: false, confirmed: false };

        function downloadBlob(blob, filename) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.rel = 'noopener';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
        }

        document.getElementById('download').onclick = async () => {
          const zip = await window.__makeZip();
          downloadBlob(zip, 'auro-test-photos.zip');
          log('downloaded');
        };

        const fileInput = document.getElementById('file');
        const setFile = (file) => {
          window.__state.fileName = file ? file.name : null;
          document.getElementById('fileLabel').textContent = file ? file.name : '';
          const preview = document.getElementById('preview');
          if (preview.src) URL.revokeObjectURL(preview.src);
          preview.src = file ? URL.createObjectURL(file) : '';
          log(file ? 'picked:' + file.name : 'cleared');
        };
        fileInput.onchange = () => setFile(fileInput.files[0] || null);
        document.getElementById('choose').onclick = () => fileInput.click();
        document.getElementById('replace').onclick = () => fileInput.click();
        document.getElementById('submit').onclick = () => {
          const ok = window.confirm(${JSON.stringify(SUBMIT_CONFIRM)});
          window.__state.confirmed = ok;
          if (ok) {
            window.__state.submitted = true;
            log('submitted');
          } else {
            log('cancelled');
          }
        };
      </script>
    </body>
    </html>
  `);

  // Inject zip maker using Node-built blob transferred as base64
  const zip = new JSZip();
  zip.file('photo-1.png', Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  ));
  zip.file('photo-2.png', Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  ));
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });
  const zipB64 = zipBuf.toString('base64');
  await page.exposeFunction('__makeZip', async () => {
    // Return as ArrayBuffer-compatible via evaluate
    return zipB64;
  });
  await page.addInitScript(() => {});
  await page.evaluate((b64) => {
    window.__makeZip = async () => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: 'application/zip' });
    };
  }, zipB64);

  // Download button
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.click('#download'),
  ]);
  const suggested = download.suggestedFilename();
  if (suggested !== 'auro-test-photos.zip') {
    throw new Error('Unexpected download name: ' + suggested);
  }
  const downloadPath = join(outDir, suggested);
  await download.saveAs(downloadPath);
  console.log('OK download button produced', suggested, readFileSync(downloadPath).length, 'bytes');

  // Upload / replace with synthetic video file
  const fakeVideo = join(outDir, 'review-take-1.mp4');
  writeFileSync(fakeVideo, Buffer.alloc(2048, 1));
  await page.setInputFiles('#file', fakeVideo);
  const name1 = await page.evaluate(() => window.__state.fileName);
  if (name1 !== 'review-take-1.mp4') throw new Error('Upload failed: ' + name1);
  console.log('OK choose/upload file');

  const fakeVideo2 = join(outDir, 'review-take-2.mp4');
  writeFileSync(fakeVideo2, Buffer.alloc(3072, 2));
  await page.setInputFiles('#file', fakeVideo2);
  const name2 = await page.evaluate(() => window.__state.fileName);
  if (name2 !== 'review-take-2.mp4') throw new Error('Replace failed: ' + name2);
  console.log('OK replace video');

  // Submit confirm — dismiss first
  page.once('dialog', async (dialog) => {
    if (!dialog.message().includes('cannot change')) {
      throw new Error('Bad confirm copy: ' + dialog.message());
    }
    await dialog.dismiss();
  });
  await page.click('#submit');
  await page.waitForTimeout(200);
  let state = await page.evaluate(() => window.__state);
  if (state.submitted) throw new Error('Should not submit after dismiss');
  console.log('OK submit confirm cancel');

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.click('#submit');
  await page.waitForTimeout(200);
  state = await page.evaluate(() => window.__state);
  if (!state.submitted || !state.confirmed) throw new Error('Submit accept failed');
  console.log('OK submit confirm accept');

  // Touch target sizes
  const sizes = await page.evaluate(() => {
    const ids = ['download', 'choose', 'replace', 'submit'];
    return ids.map((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { id, h: r.height, w: r.width };
    });
  });
  for (const s of sizes) {
    if (s.h < 44 || s.w < 44) throw new Error('Touch target too small: ' + JSON.stringify(s));
  }
  console.log('OK mobile touch targets', JSON.stringify(sizes));
  console.log('PLAYWRIGHT MOBILE SMOKE PASS');

  await browser.close();
}

main().catch((e) => {
  console.error('PLAYWRIGHT FAIL', e);
  process.exit(1);
});
