// Read PNG alpha bounds to align source frames without changing image pixels.
const fs = require('node:fs');
const zlib = require('node:zlib');
const source = fs.readFileSync(process.argv[2] || 'public/dog-walk.png');
let offset = 8;
let width, height;
const chunks = [];
while (offset < source.length) {
  const length = source.readUInt32BE(offset);
  const type = source.toString('ascii', offset + 4, offset + 8);
  const data = source.subarray(offset + 8, offset + 8 + length);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0); height = data.readUInt32BE(4);
    if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error('Expected a non-interlaced RGBA8 PNG');
  }
  if (type === 'IDAT') chunks.push(data);
  offset += length + 12;
}
const encoded = zlib.inflateSync(Buffer.concat(chunks));
const pixels = Buffer.alloc(width * height * 4);
const stride = width * 4;
function paeth(a, b, c) {
  const p = a + b - c;
  const da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
  return da <= db && da <= dc ? a : db <= dc ? b : c;
}
for (let y = 0; y < height; y++) {
  const filter = encoded[y * (stride + 1)];
  for (let x = 0; x < stride; x++) {
    const a = x >= 4 ? pixels[y * stride + x - 4] : 0;
    const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
    const c = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
    const predictor = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
    pixels[y * stride + x] = (encoded[y * (stride + 1) + x + 1] + predictor) & 255;
  }
}
const cell = width / 2;
const frames = [];
function largestSilhouette(originX, originY) {
  const seen = new Uint8Array(cell * cell);
  let largest = { area: 0, left: 0, top: 0, right: 0, bottom: 0 };
  function opaque(index) {
    const x = index % cell, y = Math.floor(index / cell);
    return pixels[((y + originY) * width + x + originX) * 4 + 3] > 128;
  }
  for (let seed = 0; seed < seen.length; seed++) {
    if (seen[seed] || !opaque(seed)) continue;
    const queue = [seed];
    seen[seed] = 1;
    const bounds = { area: 0, left: cell, top: cell, right: 0, bottom: 0 };
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor], x = index % cell, y = Math.floor(index / cell);
      bounds.area++;
      bounds.left = Math.min(bounds.left, x); bounds.top = Math.min(bounds.top, y);
      bounds.right = Math.max(bounds.right, x + 1); bounds.bottom = Math.max(bounds.bottom, y + 1);
      const neighbours = [];
      if (x > 0) neighbours.push(index - 1);
      if (x < cell - 1) neighbours.push(index + 1);
      if (y > 0) neighbours.push(index - cell);
      if (y < cell - 1) neighbours.push(index + cell);
      for (const neighbour of neighbours) {
        if (seen[neighbour] || !opaque(neighbour)) continue;
        seen[neighbour] = 1; queue.push(neighbour);
      }
    }
    if (bounds.area > largest.area) largest = bounds;
  }
  const { area, ...bounds } = largest;
  return bounds;
}
for (let frame = 0; frame < 4; frame++) {
  const originX = (frame % 2) * cell;
  const originY = Math.floor(frame / 2) * cell;
  const bounds = largestSilhouette(originX, originY);
  frames.push({ x: originX, y: originY, lift: Math.round(cell * .88 - bounds.bottom),
    shift: Math.round((cell - bounds.left - bounds.right) / 2), bounds });
}
fs.writeFileSync(process.argv[3] || 'src/dog-walk.meta.json', JSON.stringify({ width, height, cell, frames }, null, 2));
console.log(JSON.stringify({ width, height, cell, frames }));
