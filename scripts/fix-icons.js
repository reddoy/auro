/*
  Pads app icon images to be square by adding transparent margins around the
  existing image, centered on a square canvas. This satisfies Expo config
  schema requirements for icon assets.
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const targets = [
  path.join(projectRoot, 'assets', 'images', 'icon.png'),
  path.join(projectRoot, 'assets', 'images', 'adaptive-icon.png'),
];

async function padToSquare(imagePath) {
  try {
    const input = sharp(imagePath);
    const meta = await input.metadata();
    const { width, height } = meta;
    if (!width || !height) {
      console.log(`Skipping ${imagePath} (no dimensions detected)`);
      return;
    }
    if (width === height) {
      console.log(`Already square: ${path.relative(projectRoot, imagePath)} (${width}x${height})`);
      return;
    }
    const size = Math.max(width, height);
    const left = Math.floor((size - width) / 2);
    const right = size - width - left;
    const top = Math.floor((size - height) / 2);
    const bottom = size - height - top;

    const tempPath = imagePath + '.tmp';
    await input
      .extend({
        top,
        bottom,
        left,
        right,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toFile(tempPath);

    await fs.promises.rename(tempPath, imagePath);
    console.log(`Padded ${path.relative(projectRoot, imagePath)} to ${size}x${size}`);
  } catch (error) {
    console.error(`Failed to process ${imagePath}:`, error.message);
  }
}

(async () => {
  for (const target of targets) {
    await padToSquare(target);
  }
})();


