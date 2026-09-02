import type { FilterDefinition, FilterRunCtx } from "../types";
import { clamp01, clamp255, hashNoise, luminance } from "./helpers";

function vhsCrt(data: ImageData, values: Record<string, number | boolean | string>, ctx: FilterRunCtx): ImageData {
  const lineOpacity = Number(values.lineOpacity ?? 30) / 100;
  const spacing = Math.max(1, Math.round(Number(values.lineSpacing ?? 2)));
  const rgbShift = Math.round(Number(values.rgbShift ?? 2));
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  const jitter = Math.sin(ctx.t * 30) * 0.6;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const di = (y * W + x) * 4;
      const rx = Math.min(W - 1, Math.max(0, Math.round(x + rgbShift + jitter)));
      const bx = Math.min(W - 1, Math.max(0, Math.round(x - rgbShift - jitter)));
      const ri = (y * W + rx) * 4;
      const bi = (y * W + bx) * 4;
      let r = data.data[ri];
      let g = data.data[di + 1];
      let b = data.data[bi + 2];
      if (y % spacing === 0) {
        r *= 1 - lineOpacity;
        g *= 1 - lineOpacity;
        b *= 1 - lineOpacity;
      }
      out[di] = clamp255(r);
      out[di + 1] = clamp255(g);
      out[di + 2] = clamp255(b);
      out[di + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

function filmGrain(data: ImageData, values: Record<string, number | boolean | string>, ctx: FilterRunCtx): ImageData {
  const amount = Number(values.amount ?? 25) / 100;
  const mono = Boolean(values.monochrome ?? true);
  const seed = Math.floor(ctx.t * 24);
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    const p = i / 4;
    const x = p % data.width;
    const y = (p / data.width) | 0;
    const n1 = (hashNoise(x, y, seed) - 0.5) * 255 * amount;
    if (mono) {
      out[i] = clamp255(out[i] + n1);
      out[i + 1] = clamp255(out[i + 1] + n1);
      out[i + 2] = clamp255(out[i + 2] + n1);
    } else {
      out[i] = clamp255(out[i] + (hashNoise(x, y, seed + 1) - 0.5) * 255 * amount);
      out[i + 1] = clamp255(out[i + 1] + (hashNoise(x, y, seed + 2) - 0.5) * 255 * amount);
      out[i + 2] = clamp255(out[i + 2] + (hashNoise(x, y, seed + 3) - 0.5) * 255 * amount);
    }
    // occasional dust speck
    if (hashNoise(x, y, seed + 9) > 0.9985) {
      out[i] = out[i + 1] = out[i + 2] = 255;
    }
  }
  return new ImageData(out, data.width, data.height);
}

function faxMachine(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const threshold = Number(values.threshold ?? 128);
  const dither = Boolean(values.dither ?? true);
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  const bayer4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lum = luminance(data.data[i], data.data[i + 1], data.data[i + 2]);
      const t = dither ? threshold + (bayer4[y % 4][x % 4] / 16 - 0.5) * 64 : threshold;
      const v = lum > t ? 255 : 0;
      out[i] = out[i + 1] = out[i + 2] = v;
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

const THERMAL_STOPS: [number, [number, number, number]][] = [
  [0, [8, 0, 60]],
  [0.25, [70, 0, 140]],
  [0.5, [200, 20, 40]],
  [0.75, [250, 140, 0]],
  [1, [255, 255, 200]],
];

function thermalColor(t: number): [number, number, number] {
  for (let i = 0; i < THERMAL_STOPS.length - 1; i++) {
    const [t0, c0] = THERMAL_STOPS[i];
    const [t1, c1] = THERMAL_STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return THERMAL_STOPS[THERMAL_STOPS.length - 1][1];
}

function thermalLut(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const intensity = Number(values.intensity ?? 100) / 100;
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    const lum = clamp01(luminance(out[i], out[i + 1], out[i + 2]) / 255);
    const [r, g, b] = thermalColor(lum);
    out[i] = clamp255(out[i] * (1 - intensity) + r * intensity);
    out[i + 1] = clamp255(out[i + 1] * (1 - intensity) + g * intensity);
    out[i + 2] = clamp255(out[i + 2] * (1 - intensity) + b * intensity);
  }
  return new ImageData(out, data.width, data.height);
}

function nightVision(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const intensity = Number(values.intensity ?? 80) / 100;
  const noiseAmt = Number(values.noise ?? 20) / 100;
  const W = data.width;
  const H = data.height;
  const cx = W / 2;
  const cy = H / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lum = luminance(data.data[i], data.data[i + 1], data.data[i + 2]) / 255;
      const boosted = clamp01(Math.pow(lum, 0.6) * (1 + intensity));
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
      const vig = clamp01(1 - Math.max(0, dist - 0.55) * 1.8);
      const n = (hashNoise(x, y, Math.floor(data.data[i]) % 7) - 0.5) * noiseAmt;
      const g = clamp255((boosted + n) * 255 * vig);
      out[i] = clamp255(g * 0.15);
      out[i + 1] = g;
      out[i + 2] = clamp255(g * 0.2);
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

export const simulateFilters: FilterDefinition[] = [
  {
    name: "vhsCrt",
    displayName: "VHS / CRT",
    category: "Simulate",
    description: "Scanlines with a touch of chromatic tape-head jitter.",
    options: [
      { key: "lineOpacity", label: "Line Opacity", type: "range", min: 0, max: 100, step: 1, default: 30 },
      { key: "lineSpacing", label: "Line Spacing", type: "range", min: 1, max: 6, step: 1, default: 2 },
      { key: "rgbShift", label: "RGB Shift", type: "range", min: 0, max: 10, step: 1, default: 2 },
    ],
    apply: vhsCrt,
  },
  {
    name: "filmGrain",
    displayName: "Film Grain",
    category: "Simulate",
    description: "Animated grain noise with occasional dust specks.",
    options: [
      { key: "amount", label: "Amount", type: "range", min: 0, max: 100, step: 1, default: 25 },
      { key: "monochrome", label: "Monochrome", type: "bool", default: true },
    ],
    apply: filmGrain,
  },
  {
    name: "faxMachine",
    displayName: "Fax Machine",
    category: "Simulate",
    description: "1-bit thermal-fax threshold, optionally ordered-dithered.",
    options: [
      { key: "threshold", label: "Threshold", type: "range", min: 0, max: 255, step: 1, default: 128 },
      { key: "dither", label: "Dither", type: "bool", default: true },
    ],
    apply: faxMachine,
  },
  {
    name: "thermalLut",
    displayName: "Thermal Camera",
    category: "Simulate",
    description: "Maps brightness onto a false-color thermal-imaging gradient.",
    options: [{ key: "intensity", label: "Intensity", type: "range", min: 0, max: 100, step: 1, default: 100 }],
    apply: thermalLut,
  },
  {
    name: "nightVision",
    displayName: "Night Vision",
    category: "Simulate",
    description: "Green-phosphor boosted luminance with noise and edge falloff.",
    options: [
      { key: "intensity", label: "Intensity", type: "range", min: 0, max: 100, step: 1, default: 80 },
      { key: "noise", label: "Noise", type: "range", min: 0, max: 100, step: 1, default: 20 },
    ],
    apply: nightVision,
  },
];
