/* eslint-disable */
// One-shot regeneration of all logo/icon raster derivatives from docs/public/logo.svg.
// Run: npm install --no-save sharp png2icons && node scripts/generate-logo-assets.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const png2icons = require('png2icons');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'docs/public/logo.svg');
const svg = fs.readFileSync(svgPath);

const rendererAssets = path.join(root, 'src/renderer/assets');
const docsPublic = path.join(root, 'docs/public');

async function pngBuffer(size) {
  return sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function main() {
  // Renderer logo.png (512×512)
  const png512 = await pngBuffer(512);
  fs.writeFileSync(path.join(rendererAssets, 'logo.png'), png512);

  // Renderer logo.webp (512×512)
  const webp512 = await sharp(png512).webp({ quality: 92 }).toBuffer();
  fs.writeFileSync(path.join(rendererAssets, 'logo.webp'), webp512);

  // Renderer logo.icns — multi-res ICNS via png2icons.
  // png2icns expects a PNG buffer at the largest needed size; it generates the rest.
  const png1024 = await pngBuffer(1024);
  const icns = png2icons.createICNS(png1024, png2icons.BILINEAR, 0);
  if (!icns) throw new Error('Failed to generate ICNS');
  fs.writeFileSync(path.join(rendererAssets, 'logo.icns'), icns);

  // Renderer favicon.ico — multi-res ICO with at least 16/32 entries.
  const ico = png2icons.createICO(png1024, png2icons.BILINEAR, 0, false, true);
  if (!ico) throw new Error('Failed to generate ICO');
  fs.writeFileSync(path.join(rendererAssets, 'favicon.ico'), ico);

  // Docs WebP (512×512)
  fs.writeFileSync(path.join(docsPublic, 'logo.webp'), webp512);

  // Docs favicon.png (32×32)
  fs.writeFileSync(path.join(docsPublic, 'favicon.png'), await pngBuffer(32));

  // Docs apple-touch-icon.png (180×180)
  fs.writeFileSync(path.join(docsPublic, 'apple-touch-icon.png'), await pngBuffer(180));

  // Docs og-image.png (1200×630, logo centered on Vercel-Black canvas)
  const ogLogo = await pngBuffer(512);
  const ogImage = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    },
  })
    .composite([{ input: ogLogo, gravity: 'center' }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(docsPublic, 'og-image.png'), ogImage);

  // Print 16×16 base64 for the FAVICON constant in src/constants/app-constants.ts
  const png16 = await pngBuffer(16);
  const base64 = `data:image/png;base64,${png16.toString('base64')}`;
  console.log('FAVICON_BASE64:');
  console.log(base64);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
