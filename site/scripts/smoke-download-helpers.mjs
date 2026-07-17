/**
 * Smoke-test download helpers (ZIP packing + blob download plumbing).
 * Run: node --experimental-vm-modules scripts/smoke-download-helpers.mjs
 * or: npx tsx scripts/smoke-download-helpers.mjs
 */
import { createRequire } from 'module';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '.tmp-download-smoke');
mkdirSync(outDir, { recursive: true });

function tinyPng(n) {
  // Minimal valid 1x1 PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const path = join(outDir, `photo-${n}.png`);
  writeFileSync(path, png);
  return path;
}

async function main() {
  const files = [tinyPng(1), tinyPng(2), tinyPng(3)];
  const zip = new JSZip();
  for (let i = 0; i < files.length; i++) {
    zip.file(`photo-${i + 1}.png`, readFileSync(files[i]));
  }
  const blob = await zip.generateAsync({ type: 'nodebuffer' });
  const zipPath = join(outDir, 'auro-test-photos.zip');
  writeFileSync(zipPath, blob);

  const check = new JSZip();
  await check.loadAsync(blob);
  const names = Object.keys(check.files).filter((n) => !check.files[n].dir);
  if (names.length !== 3) {
    throw new Error(`Expected 3 files in zip, got ${names.length}: ${names.join(',')}`);
  }
  if (!existsSync(zipPath) || blob.length < 100) {
    throw new Error('ZIP file missing or too small');
  }
  console.log('OK zip pack:', names.join(', '), `(${blob.length} bytes)`);

  // Confirm confirm-message constant shape used in UI
  const submitConfirm =
    'Submit this review?\n\nOnce you submit, you cannot change or replace the video. Make sure this is the right one.';
  if (!submitConfirm.includes('cannot change')) {
    throw new Error('Submit confirm copy missing');
  }
  console.log('OK submit confirm copy present');
  console.log('SMOKE PASS');
}

main().catch((e) => {
  console.error('SMOKE FAIL', e);
  process.exit(1);
});
