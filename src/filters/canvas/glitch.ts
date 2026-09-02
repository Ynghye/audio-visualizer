import type { FilterDefinition, FilterRunCtx } from "../types";
import { clamp255, hashNoise, luminance } from "./helpers";

function blockCorrupt(data: ImageData, values: Record<string, number | boolean | string>, ctx: FilterRunCtx): ImageData {
  const amount = Number(values.amount ?? 30);
  const blockSize = Math.max(2, Math.round(Number(values.blockSize ?? 16)));
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data);
  const blocksX = Math.ceil(W / blockSize);
  const blocksY = Math.ceil(H / blockSize);
  const seed = Math.floor(ctx.t * 6);

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const roll = hashNoise(bx, by, seed);
      if (roll * 100 > amount) continue;
      const x0 = bx * blockSize;
      const y0 = by * blockSize;
      const bw = Math.min(blockSize, W - x0);
      const bh = Math.min(blockSize, H - y0);

      const mode = hashNoise(bx + 50, by + 50, seed);
      if (mode < 0.4) {
        // horizontal shift: copy from a shifted source block
        const shift = Math.round((hashNoise(bx + 100, by, seed) - 0.5) * blockSize * 4);
        for (let y = 0; y < bh; y++) {
          for (let x = 0; x < bw; x++) {
            const sx = Math.min(W - 1, Math.max(0, x0 + x + shift));
            const si = ((y0 + y) * W + sx) * 4;
            const di = ((y0 + y) * W + (x0 + x)) * 4;
            out[di] = data.data[si];
            out[di + 1] = data.data[si + 1];
            out[di + 2] = data.data[si + 2];
          }
        }
      } else if (mode < 0.7) {
        // solid color-glitch block
        const ci = (y0 * W + x0) * 4;
        const cr = data.data[ci];
        const cg = data.data[ci + 1];
        const cb = data.data[ci + 2];
        for (let y = 0; y < bh; y++) {
          for (let x = 0; x < bw; x++) {
            const di = ((y0 + y) * W + (x0 + x)) * 4;
            out[di] = cr;
            out[di + 1] = cg;
            out[di + 2] = cb;
          }
        }
      } else {
        // channel offset within the block
        for (let y = 0; y < bh; y++) {
          for (let x = 0; x < bw; x++) {
            const di = ((y0 + y) * W + (x0 + x)) * 4;
            const si = di;
            out[di] = data.data[Math.min(data.data.length - 4, si + 4)];
            out[di + 2] = data.data[Math.max(0, si - 4)];
          }
        }
      }
    }
  }
  return new ImageData(out, W, H);
}

function bitCrush(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const bits = Math.max(1, Math.min(8, Math.round(Number(values.bits ?? 3))));
  const levels = 2 ** bits - 1;
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = clamp255(Math.round((out[i] / 255) * levels) * (255 / levels));
    out[i + 1] = clamp255(Math.round((out[i + 1] / 255) * levels) * (255 / levels));
    out[i + 2] = clamp255(Math.round((out[i + 2] / 255) * levels) * (255 / levels));
  }
  return new ImageData(out, data.width, data.height);
}

function pixelSort(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const threshold = Number(values.threshold ?? 100);
  const vertical = values.direction === "vertical";
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data);
  const lines = vertical ? W : H;
  const lineLen = vertical ? H : W;

  for (let l = 0; l < lines; l++) {
    const getIdx = (p: number) => (vertical ? (p * W + l) * 4 : (l * W + p) * 4);
    let runStart = -1;
    for (let p = 0; p <= lineLen; p++) {
      const lum = p < lineLen ? luminance(out[getIdx(p)], out[getIdx(p) + 1], out[getIdx(p) + 2]) : -1;
      const bright = lum > threshold;
      if (bright && runStart === -1) runStart = p;
      if ((!bright || p === lineLen) && runStart !== -1) {
        const runEnd = p;
        const entries: [number, number, number][] = [];
        for (let q = runStart; q < runEnd; q++) {
          const idx = getIdx(q);
          entries.push([out[idx], out[idx + 1], out[idx + 2]]);
        }
        entries.sort((a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2]));
        for (let q = runStart; q < runEnd; q++) {
          const idx = getIdx(q);
          const [r, g, b] = entries[q - runStart];
          out[idx] = r;
          out[idx + 1] = g;
          out[idx + 2] = b;
        }
        runStart = -1;
      }
    }
  }
  return new ImageData(out, W, H);
}

function scanlineShift(data: ImageData, values: Record<string, number | boolean | string>, ctx: FilterRunCtx): ImageData {
  const amount = Number(values.amount ?? 8);
  const frequency = Number(values.frequency ?? 4);
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    const shift = Math.round(Math.sin(y * 0.15 * frequency + ctx.t * 4) * amount * hashNoise(0, y, Math.floor(ctx.t * 3)));
    for (let x = 0; x < W; x++) {
      const sx = Math.min(W - 1, Math.max(0, x - shift));
      const si = (y * W + sx) * 4;
      const di = (y * W + x) * 4;
      out[di] = data.data[si];
      out[di + 1] = data.data[si + 1];
      out[di + 2] = data.data[si + 2];
      out[di + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

function pixelScatter(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const amount = Math.max(0, Math.round(Number(values.amount ?? 10)));
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ox = Math.round((hashNoise(x, y, 1) - 0.5) * amount * 2);
      const oy = Math.round((hashNoise(x, y, 2) - 0.5) * amount * 2);
      const sx = Math.min(W - 1, Math.max(0, x + ox));
      const sy = Math.min(H - 1, Math.max(0, y + oy));
      const si = (sy * W + sx) * 4;
      const di = (y * W + x) * 4;
      out[di] = data.data[si];
      out[di + 1] = data.data[si + 1];
      out[di + 2] = data.data[si + 2];
      out[di + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

function rgbChannelSplit(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const offsetX = Math.round(Number(values.offsetX ?? 6));
  const offsetY = Math.round(Number(values.offsetY ?? 0));
  const W = data.width;
  const H = data.height;
  const at = (x: number, y: number, c: number) => {
    const xi = Math.min(W - 1, Math.max(0, x));
    const yi = Math.min(H - 1, Math.max(0, y));
    return data.data[(yi * W + xi) * 4 + c];
  };
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      out[i] = at(x + offsetX, y + offsetY, 0);
      out[i + 1] = at(x, y, 1);
      out[i + 2] = at(x - offsetX, y - offsetY, 2);
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

export const glitchFilters: FilterDefinition[] = [
  {
    name: "blockCorrupt",
    displayName: "Block Corrupt",
    category: "Glitch",
    description: "Randomly shifts, flattens, or channel-shears blocks — a synchronous stand-in for byte-level codec glitching.",
    options: [
      { key: "amount", label: "Amount", type: "range", min: 0, max: 100, step: 1, default: 30 },
      { key: "blockSize", label: "Block Size", type: "range", min: 4, max: 64, step: 2, default: 16 },
    ],
    apply: blockCorrupt,
  },
  {
    name: "bitCrush",
    displayName: "Bit Crush",
    category: "Glitch",
    description: "Reduces per-channel color depth for a blocky, posterized glitch.",
    options: [{ key: "bits", label: "Bits", type: "range", min: 1, max: 8, step: 1, default: 3 }],
    apply: bitCrush,
  },
  {
    name: "pixelSort",
    displayName: "Pixel Sort",
    category: "Glitch",
    description: "Sorts runs of bright pixels along rows or columns by luminance.",
    options: [
      { key: "threshold", label: "Threshold", type: "range", min: 0, max: 255, step: 1, default: 100 },
      {
        key: "direction",
        label: "Direction",
        type: "select",
        default: "horizontal",
        options: [
          { label: "Horizontal", value: "horizontal" },
          { label: "Vertical", value: "vertical" },
        ],
      },
    ],
    apply: pixelSort,
  },
  {
    name: "scanlineShift",
    displayName: "Scanline Shift",
    category: "Glitch",
    description: "Animated per-row horizontal jitter, like a bad tape head.",
    options: [
      { key: "amount", label: "Amount", type: "range", min: 0, max: 40, step: 1, default: 8 },
      { key: "frequency", label: "Frequency", type: "range", min: 1, max: 20, step: 1, default: 4 },
    ],
    apply: scanlineShift,
  },
  {
    name: "pixelScatter",
    displayName: "Pixel Scatter",
    category: "Glitch",
    description: "Randomly relocates each pixel within a small radius.",
    options: [{ key: "amount", label: "Amount", type: "range", min: 0, max: 40, step: 1, default: 10 }],
    apply: pixelScatter,
  },
  {
    name: "rgbChannelSplit",
    displayName: "RGB Channel Split",
    category: "Glitch",
    description: "Hard-offsets red and blue channels apart, unlike the softer Chromatic Aberration.",
    options: [
      { key: "offsetX", label: "Offset X", type: "range", min: -30, max: 30, step: 1, default: 6 },
      { key: "offsetY", label: "Offset Y", type: "range", min: -30, max: 30, step: 1, default: 0 },
    ],
    apply: rgbChannelSplit,
  },
];
