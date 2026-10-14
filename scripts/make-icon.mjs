// Draws Questline's pixel-art icon (a yellow "Q" with a hard shadow on a dark
// tile) and saves it as PNG files: build/icon.png (256x256, used for the
// installer and the .exe) and electron/tray.png (32x32, next to the clock).
// Run with `node scripts/make-icon.mjs`; the outputs are committed.

import fs from "node:fs";
import zlib from "node:zlib";

// 16x16 sprite: # border, Y letter, . background. Shadows are added below.
const sprite = [
  "################",
  "#..............#",
  "#....YYYYYY....#",
  "#...YYYYYYYY...#",
  "#..YYY....YYY..#",
  "#..YY......YY..#",
  "#..YY......YY..#",
  "#..YY......YY..#",
  "#..YY...YY.YY..#",
  "#..YYY...YYYY..#",
  "#...YYYYYYYY...#",
  "#....YYYYYYYY..#",
  "#..........YY..#",
  "#..............#",
  "#..............#",
  "################",
];

// Questline palette (see src/app/globals.css).
const colors = {
  "#": [0x3c, 0xc2, 0x4a], // --green
  ".": [0x15, 0x15, 0x1a], // --panel
  Y: [0xf7, 0xc5, 0x35], // --yellow
  D: [0x98, 0x72, 0x0d], // --yellow-deep, the hard pixel shadow
};

// A background pixel just below-right of the letter becomes shadow.
const grid = sprite.map((row, y) =>
  [...row].map((c, x) => (c === "." && sprite[y - 1]?.[x - 1] === "Y" ? "D" : c)),
);

function png(scale) {
  const size = 16 * scale;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = colors[grid[Math.floor(y / scale)][Math.floor(x / scale)]];
      raw.set([r, g, b, 255], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

fs.mkdirSync("build", { recursive: true });
fs.mkdirSync("electron", { recursive: true });
fs.writeFileSync("build/icon.png", png(16));
fs.writeFileSync("electron/tray.png", png(2));
console.log("Wrote build/icon.png (256x256) and electron/tray.png (32x32)");
