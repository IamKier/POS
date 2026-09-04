import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

/**
 * Generates the PWA icons.
 *
 * An installable app needs raster icons, and pulling in an image
 * toolchain to draw a rounded square would be a poor trade. Node ships
 * zlib, and a PNG is a deflate stream in a handful of chunks, so the
 * icons are drawn here in a few lines of arithmetic and regenerated
 * with: npm run icons
 */
const INDIGO = [79, 70, 229];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, draw) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4 + 1);
    row[0] = 0; // no per-row filter
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y);
      row.writeUInt8(r, x * 4 + 1);
      row.writeUInt8(g, x * 4 + 2);
      row.writeUInt8(b, x * 4 + 3);
      row.writeUInt8(a, x * 4 + 4);
    }
    rows.push(row);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(6, 9); // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* A shopping basket: a trapezoid body, a handle arc, two feet. Drawn
   with distance tests so it scales to any size without a font. */
function icon(size, { maskable }) {
  const pad = maskable ? size * 0.18 : size * 0.08;
  const radius = maskable ? size : size * 0.22;
  const cx = size / 2;

  return (x, y) => {
    const inX = Math.min(x, size - 1 - x);
    const inY = Math.min(y, size - 1 - y);
    const corner =
      inX < radius && inY < radius
        ? Math.hypot(radius - inX, radius - inY) > radius
        : false;
    if (corner) return [0, 0, 0, 0];

    const u = (x - pad) / (size - 2 * pad);
    const v = (y - pad) / (size - 2 * pad);
    if (u < 0 || u > 1 || v < 0 || v > 1) return [...INDIGO, 255];

    const stroke = 0.11;

    // Handle: an arc centred above the basket.
    const hx = (u - 0.5) / 0.26;
    const hy = (v - 0.46) / 0.26;
    const onHandle =
      v < 0.46 &&
      Math.abs(Math.hypot(hx, hy) - 1) < stroke * 1.6 &&
      v > 0.14;

    // Basket: a trapezoid, wider at the top.
    const top = 0.46;
    const bottom = 0.84;
    const inBand = v >= top && v <= bottom;
    const halfWidth = 0.34 - 0.1 * ((v - top) / (bottom - top));
    const dx = Math.abs(u - 0.5);
    const onBasket =
      inBand &&
      (dx < halfWidth) &&
      (v - top < stroke || bottom - v < stroke || halfWidth - dx < stroke);

    // Two slots inside the basket.
    const slot =
      inBand &&
      v > top + 0.08 &&
      v < bottom - 0.06 &&
      (Math.abs(u - 0.42) < 0.035 || Math.abs(u - 0.58) < 0.035);

    return onHandle || onBasket || slot ? [...WHITE, 255] : [...INDIGO, 255];
  };
}

const targets = [
  { file: "public/pwa-192.png", size: 192, maskable: false },
  { file: "public/pwa-512.png", size: 512, maskable: false },
  { file: "public/pwa-maskable-512.png", size: 512, maskable: true },
  { file: "public/apple-touch-icon.png", size: 180, maskable: true },
];

for (const target of targets) {
  writeFileSync(
    target.file,
    png(target.size, icon(target.size, { maskable: target.maskable })),
  );
  console.log(`wrote ${target.file} (${target.size}px)`);
}
