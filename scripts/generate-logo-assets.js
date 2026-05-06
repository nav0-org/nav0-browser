/* eslint-disable */
// Regeneration of all logo/icon raster derivatives from docs/public/logo.svg.
// Run: npm run generate-icons
//
// Each target size is rendered from the SVG at high density (1024x1024) and
// then downsampled with sharp's lanczos3 kernel. This preserves the compass
// needle and ring at small icon sizes (16/32/64 px) where naive
// downsampling smudges them into a placeholder-looking blob on macOS
// Finder/Dock. The .icns and .ico files are then assembled by hand from
// these per-size PNGs (png2icons accepts a sampler argument but ignores
// it — the output is byte-identical for every sampler — so it cannot be
// used to control downsampling quality).

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'docs/public/logo.svg');
const svg = fs.readFileSync(svgPath);

const rendererAssets = path.join(root, 'src/renderer/assets');
const docsPublic = path.join(root, 'docs/public');

let cachedHires = null;
async function hires() {
  if (!cachedHires) {
    cachedHires = await sharp(svg, { density: 1024 })
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  }
  return cachedHires;
}

async function pngBuffer(size) {
  const src = await hires();
  if (size === 1024) return src;
  return sharp(src)
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
}

// ICNS chunk type per pixel size (PNG-encoded sub-icon).
// Refs: https://en.wikipedia.org/wiki/Apple_Icon_Image_format
const ICNS_CHUNKS = [
  { type: 'ic11', size: 32 },   // 16x16@2x
  { type: 'ic12', size: 64 },   // 32x32@2x
  { type: 'ic07', size: 128 },  // 128x128
  { type: 'ic13', size: 256 },  // 128x128@2x
  { type: 'ic08', size: 256 },  // 256x256
  { type: 'ic14', size: 512 },  // 256x256@2x
  { type: 'ic09', size: 512 },  // 512x512
  { type: 'ic10', size: 1024 }, // 512x512@2x
];

async function buildIcns() {
  const chunks = [];
  for (const { type, size } of ICNS_CHUNKS) {
    const png = await pngBuffer(size);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(8 + png.length, 0);
    chunks.push(Buffer.concat([Buffer.from(type, 'ascii'), len, png]));
  }
  const body = Buffer.concat(chunks);
  const total = 8 + body.length;
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(total, 4);
  return Buffer.concat([header, body]);
}

// ICO format: header + directory entries + image data (PNG payload).
// Refs: https://en.wikipedia.org/wiki/ICO_(file_format)
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function buildIco() {
  const images = [];
  for (const size of ICO_SIZES) {
    images.push({ size, png: await pngBuffer(size) });
  }
  const headerLen = 6;
  const dirLen = 16 * images.length;
  let offset = headerLen + dirLen;
  const directory = Buffer.alloc(dirLen);
  const payloads = [];
  images.forEach((img, i) => {
    const w = img.size === 256 ? 0 : img.size;
    const h = img.size === 256 ? 0 : img.size;
    directory[i * 16 + 0] = w; // width
    directory[i * 16 + 1] = h; // height
    directory[i * 16 + 2] = 0; // color count
    directory[i * 16 + 3] = 0; // reserved
    directory.writeUInt16LE(1, i * 16 + 4); // color planes
    directory.writeUInt16LE(32, i * 16 + 6); // bits per pixel
    directory.writeUInt32LE(img.png.length, i * 16 + 8); // image size
    directory.writeUInt32LE(offset, i * 16 + 12); // offset
    offset += img.png.length;
    payloads.push(img.png);
  });
  const header = Buffer.alloc(headerLen);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type (1 = ICO)
  header.writeUInt16LE(images.length, 4); // count
  return Buffer.concat([header, directory, ...payloads]);
}

async function main() {
  // Renderer logo.png (512×512)
  const png512 = await pngBuffer(512);
  fs.writeFileSync(path.join(rendererAssets, 'logo.png'), png512);

  // Renderer logo.webp (512×512)
  const webp512 = await sharp(png512).webp({ quality: 92 }).toBuffer();
  fs.writeFileSync(path.join(rendererAssets, 'logo.webp'), webp512);

  // Renderer logo.icns
  fs.writeFileSync(path.join(rendererAssets, 'logo.icns'), await buildIcns());

  // Renderer favicon.ico
  fs.writeFileSync(path.join(rendererAssets, 'favicon.ico'), await buildIco());

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
