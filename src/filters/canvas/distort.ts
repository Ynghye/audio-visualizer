import type { FilterDefinition, FilterRunCtx } from "../types";
import { clamp255, hashNoise } from "./helpers";

function pixelate(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const cell = Math.max(1, Math.round(Number(values.cellSize ?? 8)));
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  for (let by = 0; by < H; by += cell) {
    for (let bx = 0; bx < W; bx += cell) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      const bh = Math.min(cell, H - by);
      const bw = Math.min(cell, W - bx);
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const i = ((by + y) * W + (bx + x)) * 4;
          r += data.data[i];
          g += data.data[i + 1];
          b += data.data[i + 2];
          n++;
        }
      }
      r /= n;
      g /= n;
      b /= n;
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const i = ((by + y) * W + (bx + x)) * 4;
          out[i] = r;
          out[i + 1] = g;
          out[i + 2] = b;
          out[i + 3] = 255;
        }
      }
    }
  }
  return new ImageData(out, W, H);
}

function sampleBilinear(data: ImageData, x: number, y: number): [number, number, number] {
  const W = data.width;
  const H = data.height;
  const xi = Math.min(W - 1, Math.max(0, Math.round(x)));
  const yi = Math.min(H - 1, Math.max(0, Math.round(y)));
  const i = (yi * W + xi) * 4;
  return [data.data[i], data.data[i + 1], data.data[i + 2]];
}

function waveWarp(data: ImageData, values: Record<string, number | boolean | string>, ctx: FilterRunCtx): ImageData {
  const amplitude = Number(values.amplitude ?? 10);
  const frequency = Number(values.frequency ?? 6);
  const speed = Number(values.speed ?? 1);
  const vertical = values.direction === "vertical";
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sx = x;
      let sy = y;
      if (vertical) {
        sx = x + Math.sin((y / H) * frequency * Math.PI * 2 + ctx.t * speed) * amplitude;
      } else {
        sy = y + Math.sin((x / W) * frequency * Math.PI * 2 + ctx.t * speed) * amplitude;
      }
      const [r, g, b] = sampleBilinear(data, sx, sy);
      const i = (y * W + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

function pinchBulge(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const strength = Number(values.strength ?? 0.5);
  const radiusFrac = Number(values.radius ?? 0.5);
  const W = data.width;
  const H = data.height;
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) * radiusFrac;
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let sx = x;
      let sy = y;
      if (dist < radius && dist > 0.001) {
        const t = dist / radius;
        const factor = Math.pow(t, strength >= 0 ? 1 + strength * 2 : 1 / (1 - strength * 2));
        const newDist = factor * radius;
        sx = cx + (dx / dist) * newDist;
        sy = cy + (dy / dist) * newDist;
      }
      const [r, g, b] = sampleBilinear(data, sx, sy);
      const i = (y * W + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

function noiseDisplace(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const amount = Number(values.amount ?? 10);
  const scale = Math.max(1, Number(values.scale ?? 10));
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = hashNoise(x / scale, y / scale) * 2 - 1;
      const ny = hashNoise(x / scale + 91.3, y / scale + 17.7) * 2 - 1;
      const [r, g, b] = sampleBilinear(data, x + nx * amount, y + ny * amount);
      const i = (y * W + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

function chromaticAberration(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const amount = Number(values.amount ?? 6);
  const angle = (Number(values.angle ?? 0) * Math.PI) / 180;
  const dx = Math.cos(angle) * amount;
  const dy = Math.sin(angle) * amount;
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r] = sampleBilinear(data, x + dx, y + dy);
      const [, g] = sampleBilinear(data, x, y);
      const [, , b] = sampleBilinear(data, x - dx, y - dy);
      const i = (y * W + x) * 4;
      out[i] = clamp255(r);
      out[i + 1] = clamp255(g);
      out[i + 2] = clamp255(b);
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

export const distortFilters: FilterDefinition[] = [
  {
    name: "pixelate",
    displayName: "Pixelate",
    category: "Distort",
    description: "Averages blocks of pixels into flat mosaic cells.",
    options: [{ key: "cellSize", label: "Cell Size", type: "range", min: 2, max: 40, step: 1, default: 8 }],
    apply: pixelate,
  },
  {
    name: "waveWarp",
    displayName: "Wave Warp",
    category: "Distort",
    description: "Animated sine-wave displacement along one axis.",
    options: [
      { key: "amplitude", label: "Amplitude", type: "range", min: 0, max: 40, step: 1, default: 10 },
      { key: "frequency", label: "Frequency", type: "range", min: 1, max: 20, step: 1, default: 6 },
      { key: "speed", label: "Speed", type: "range", min: 0, max: 5, step: 0.1, default: 1 },
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
    apply: waveWarp,
  },
  {
    name: "pinchBulge",
    displayName: "Pinch / Bulge",
    category: "Distort",
    description: "Radial lens distortion — positive strength bulges out, negative pinches in.",
    options: [
      { key: "strength", label: "Strength", type: "range", min: -1, max: 1, step: 0.05, default: 0.5 },
      { key: "radius", label: "Radius", type: "range", min: 0.1, max: 1, step: 0.05, default: 0.5 },
    ],
    apply: pinchBulge,
  },
  {
    name: "noiseDisplace",
    displayName: "Noise Displace",
    category: "Distort",
    description: "Displaces every pixel by a smooth 2D noise field.",
    options: [
      { key: "amount", label: "Amount", type: "range", min: 0, max: 40, step: 1, default: 10 },
      { key: "scale", label: "Scale", type: "range", min: 1, max: 50, step: 1, default: 10 },
    ],
    apply: noiseDisplace,
  },
  {
    name: "chromaticAberration",
    displayName: "Chromatic Aberration",
    category: "Distort",
    description: "Splits red and blue channels apart along an axis, like a cheap lens.",
    options: [
      { key: "amount", label: "Amount", type: "range", min: 0, max: 30, step: 1, default: 6 },
      { key: "angle", label: "Angle", type: "range", min: 0, max: 360, step: 5, default: 0 },
    ],
    apply: chromaticAberration,
  },
];
