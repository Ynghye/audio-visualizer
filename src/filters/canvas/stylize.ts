import type { FilterDefinition } from "../types";
import { clamp01, clamp255, hashNoise, luminance } from "./helpers";

let scratch: HTMLCanvasElement | null = null;
function getScratch(w: number, h: number): CanvasRenderingContext2D {
  if (!scratch) scratch = document.createElement("canvas");
  if (scratch.width !== w || scratch.height !== h) {
    scratch.width = w;
    scratch.height = h;
  }
  return scratch.getContext("2d")!;
}

const CHARSETS: Record<string, string> = {
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  binary: " 01",
};

function asciiArt(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const cell = Math.max(4, Math.round(Number(values.cellSize ?? 10)));
  const chars = CHARSETS[String(values.charset ?? "standard")] ?? CHARSETS.standard;
  const monochrome = Boolean(values.monochrome ?? false);
  const W = data.width;
  const H = data.height;
  const ctx = getScratch(W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.font = `${cell}px monospace`;
  ctx.textBaseline = "top";

  for (let y = 0; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      const bh = Math.min(cell, H - y);
      const bw = Math.min(cell, W - x);
      for (let by = 0; by < bh; by += 2) {
        for (let bx = 0; bx < bw; bx += 2) {
          const i = ((y + by) * W + (x + bx)) * 4;
          r += data.data[i];
          g += data.data[i + 1];
          b += data.data[i + 2];
          n++;
        }
      }
      if (n === 0) continue;
      r /= n;
      g /= n;
      b /= n;
      const lum = luminance(r, g, b) / 255;
      const ch = chars[Math.min(chars.length - 1, Math.round(lum * (chars.length - 1)))];
      ctx.fillStyle = monochrome ? `rgb(${lum * 255},${lum * 255},${lum * 255})` : `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillText(ch, x, y);
    }
  }
  return ctx.getImageData(0, 0, W, H);
}

function halftone(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const cell = Math.max(2, Math.round(Number(values.cellSize ?? 6)));
  const W = data.width;
  const H = data.height;
  const ctx = getScratch(W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#111";
  for (let y = 0; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      let sum = 0;
      let n = 0;
      const bh = Math.min(cell, H - y);
      const bw = Math.min(cell, W - x);
      for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
          const i = ((y + by) * W + (x + bx)) * 4;
          sum += luminance(data.data[i], data.data[i + 1], data.data[i + 2]);
          n++;
        }
      }
      const lum = n ? sum / n / 255 : 1;
      const radius = (1 - lum) * cell * 0.55;
      if (radius < 0.4) continue;
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return ctx.getImageData(0, 0, W, H);
}

function crossHatch(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const cell = Math.max(3, Math.round(Number(values.cellSize ?? 8)));
  const W = data.width;
  const H = data.height;
  const ctx = getScratch(W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#161616";
  ctx.lineWidth = Math.max(1, cell * 0.14);
  for (let y = 0; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      const i = (Math.min(H - 1, y) * W + Math.min(W - 1, x)) * 4;
      const lum = luminance(data.data[i], data.data[i + 1], data.data[i + 2]) / 255;
      if (lum < 0.85) {
        ctx.beginPath();
        ctx.moveTo(x, y + cell);
        ctx.lineTo(x + cell, y);
        ctx.stroke();
      }
      if (lum < 0.55) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cell, y + cell);
        ctx.stroke();
      }
      if (lum < 0.28) {
        ctx.beginPath();
        ctx.moveTo(x + cell / 2, y);
        ctx.lineTo(x + cell / 2, y + cell);
        ctx.stroke();
      }
    }
  }
  return ctx.getImageData(0, 0, W, H);
}

function stripe(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const width = Math.max(1, Math.round(Number(values.width ?? 6)));
  const vertical = values.direction === "vertical";
  const darken = Number(values.darken ?? 40) / 100;
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const band = Math.floor((vertical ? x : y) / width);
      if (band % 2 === 0) continue;
      const i = (y * W + x) * 4;
      out[i] = clamp255(out[i] * (1 - darken));
      out[i + 1] = clamp255(out[i + 1] * (1 - darken));
      out[i + 2] = clamp255(out[i + 2] * (1 - darken));
    }
  }
  return new ImageData(out, W, H);
}

function voronoiMosaic(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const cell = Math.max(6, Math.round(Number(values.cellSize ?? 24)));
  const W = data.width;
  const H = data.height;
  const gw = Math.ceil(W / cell);
  const gh = Math.ceil(H / cell);
  const px = new Float32Array(gw * gh);
  const py = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const idx = gy * gw + gx;
      px[idx] = gx * cell + hashNoise(gx, gy, 3) * cell;
      py[idx] = gy * cell + hashNoise(gx, gy, 4) * cell;
    }
  }
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      let best = 0;
      let bestD = Infinity;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const ngx = gx + ox;
          const ngy = gy + oy;
          if (ngx < 0 || ngx >= gw || ngy < 0 || ngy >= gh) continue;
          const idx = ngy * gw + ngx;
          const dx = px[idx] - x;
          const dy = py[idx] - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = idx;
          }
        }
      }
      const sx = Math.min(W - 1, Math.max(0, Math.round(px[best])));
      const sy = Math.min(H - 1, Math.max(0, Math.round(py[best])));
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

function vignette(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const strength = Number(values.strength ?? 50) / 100;
  const radiusFrac = Number(values.radius ?? 70) / 100;
  const W = data.width;
  const H = data.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const out = new Uint8ClampedArray(data.data);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      const falloff = clamp01((dist - radiusFrac) / Math.max(0.01, 1 - radiusFrac));
      const mult = 1 - falloff * strength;
      const i = (y * W + x) * 4;
      out[i] = clamp255(out[i] * mult);
      out[i + 1] = clamp255(out[i + 1] * mult);
      out[i + 2] = clamp255(out[i + 2] * mult);
    }
  }
  return new ImageData(out, W, H);
}

export const stylizeFilters: FilterDefinition[] = [
  {
    name: "asciiArt",
    displayName: "ASCII Art",
    category: "Stylize",
    description: "Renders each cell as a glyph chosen by local brightness.",
    options: [
      { key: "cellSize", label: "Cell Size", type: "range", min: 4, max: 24, step: 1, default: 10 },
      {
        key: "charset",
        label: "Charset",
        type: "select",
        default: "standard",
        options: [
          { label: "Standard", value: "standard" },
          { label: "Blocks", value: "blocks" },
          { label: "Binary", value: "binary" },
        ],
      },
      { key: "monochrome", label: "Monochrome", type: "bool", default: false },
    ],
    apply: asciiArt,
  },
  {
    name: "halftone",
    displayName: "Halftone",
    category: "Stylize",
    description: "Classic print halftone — dot size follows local brightness.",
    options: [{ key: "cellSize", label: "Cell Size", type: "range", min: 2, max: 20, step: 1, default: 6 }],
    apply: halftone,
  },
  {
    name: "crossHatch",
    displayName: "Cross-hatch",
    category: "Stylize",
    description: "Pen-and-ink style hatching density that follows brightness.",
    options: [{ key: "cellSize", label: "Cell Size", type: "range", min: 3, max: 20, step: 1, default: 8 }],
    apply: crossHatch,
  },
  {
    name: "stripe",
    displayName: "Stripe",
    category: "Stylize",
    description: "Darkens alternating bands of rows or columns.",
    options: [
      { key: "width", label: "Width", type: "range", min: 1, max: 40, step: 1, default: 6 },
      { key: "darken", label: "Darken", type: "range", min: 0, max: 100, step: 1, default: 40 },
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
    apply: stripe,
  },
  {
    name: "voronoiMosaic",
    displayName: "Voronoi Mosaic",
    category: "Stylize",
    description: "Organic jittered-cell mosaic, unlike Pixelate's regular grid.",
    options: [{ key: "cellSize", label: "Cell Size", type: "range", min: 6, max: 60, step: 1, default: 24 }],
    apply: voronoiMosaic,
  },
  {
    name: "vignette",
    displayName: "Vignette",
    category: "Stylize",
    description: "Darkens the frame edges toward the border.",
    options: [
      { key: "strength", label: "Strength", type: "range", min: 0, max: 100, step: 1, default: 50 },
      { key: "radius", label: "Radius", type: "range", min: 0, max: 100, step: 1, default: 70 },
    ],
    apply: vignette,
  },
];
