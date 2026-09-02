import type { FilterDefinition } from "../types";
import { clamp255 } from "./helpers";

/** Separable box blur with a sliding-window sum — O(width*height) per pass regardless of radius. */
function boxBlurPass(src: Float32Array, W: number, H: number, radius: number, horizontal: boolean): Float32Array {
  const out = new Float32Array(src.length);
  const size = radius * 2 + 1;
  if (horizontal) {
    for (let y = 0; y < H; y++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let x = -radius; x <= radius; x++) {
          const xi = Math.min(W - 1, Math.max(0, x));
          sum += src[(y * W + xi) * 4 + c];
        }
        for (let x = 0; x < W; x++) {
          out[(y * W + x) * 4 + c] = sum / size;
          const addX = Math.min(W - 1, x + radius + 1);
          const subX = Math.max(0, x - radius);
          sum += src[(y * W + addX) * 4 + c] - src[(y * W + subX) * 4 + c];
        }
      }
    }
  } else {
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let y = -radius; y <= radius; y++) {
          const yi = Math.min(H - 1, Math.max(0, y));
          sum += src[(yi * W + x) * 4 + c];
        }
        for (let y = 0; y < H; y++) {
          out[(y * W + x) * 4 + c] = sum / size;
          const addY = Math.min(H - 1, y + radius + 1);
          const subY = Math.max(0, y - radius);
          sum += src[(addY * W + x) * 4 + c] - src[(subY * W + x) * 4 + c];
        }
      }
    }
  }
  for (let i = 3; i < src.length; i += 4) out[i] = src[i];
  return out;
}

function toFloat(data: ImageData): Float32Array {
  const f = new Float32Array(data.data.length);
  for (let i = 0; i < f.length; i++) f[i] = data.data[i];
  return f;
}

function toImageData(f: Float32Array, W: number, H: number): ImageData {
  const out = new Uint8ClampedArray(f.length);
  for (let i = 0; i < f.length; i++) out[i] = clamp255(f[i]);
  return new ImageData(out, W, H);
}

function blurBuffer(data: ImageData, radius: number, passes: number): Float32Array {
  let buf = toFloat(data);
  for (let p = 0; p < passes; p++) {
    buf = boxBlurPass(buf, data.width, data.height, radius, true);
    buf = boxBlurPass(buf, data.width, data.height, radius, false);
  }
  return buf;
}

function gaussianBlur(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const radius = Math.max(0, Math.round(Number(values.radius ?? 4)));
  if (radius === 0) return data;
  return toImageData(blurBuffer(data, radius, 3), data.width, data.height);
}

function boxBlur(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const radius = Math.max(0, Math.round(Number(values.radius ?? 3)));
  if (radius === 0) return data;
  return toImageData(blurBuffer(data, radius, 1), data.width, data.height);
}

function sharpen(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const amount = Number(values.amount ?? 50) / 100;
  const radius = Math.max(1, Math.round(Number(values.radius ?? 1)));
  const blurred = blurBuffer(data, radius, 2);
  const out = new Uint8ClampedArray(data.data.length);
  for (let i = 0; i < out.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = data.data[i + c];
      out[i + c] = clamp255(orig + amount * (orig - blurred[i + c]));
    }
    out[i + 3] = 255;
  }
  return new ImageData(out, data.width, data.height);
}

const SOBEL_X = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
];
const SOBEL_Y = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1],
];

function sobelEdges(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const W = data.width;
  const H = data.height;
  const threshold = Number(values.threshold ?? 50);
  const invertOut = Boolean(values.invert ?? false);
  const gray = new Float32Array(W * H);
  for (let i = 0, p = 0; i < data.data.length; i += 4, p++) {
    gray[p] = 0.2126 * data.data[i] + 0.7152 * data.data[i + 1] + 0.0722 * data.data[i + 2];
  }
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const sx = Math.min(W - 1, Math.max(0, x + kx));
          const sy = Math.min(H - 1, Math.max(0, y + ky));
          const v = gray[sy * W + sx];
          gx += v * SOBEL_X[ky + 1][kx + 1];
          gy += v * SOBEL_Y[ky + 1][kx + 1];
        }
      }
      let mag = Math.sqrt(gx * gx + gy * gy);
      mag = mag > threshold ? 255 : 0;
      if (invertOut) mag = 255 - mag;
      const i = (y * W + x) * 4;
      out[i] = out[i + 1] = out[i + 2] = mag;
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

function emboss(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const W = data.width;
  const H = data.height;
  const strength = Number(values.strength ?? 1);
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const nx = Math.min(W - 1, x + 1);
      const ny = Math.min(H - 1, y + 1);
      const j = (y * W + nx) * 4;
      const k = (ny * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const diff = (data.data[i + c] - data.data[j + c] + (data.data[i + c] - data.data[k + c])) * strength;
        out[i + c] = clamp255(128 + diff);
      }
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

export const blurEdgesFilters: FilterDefinition[] = [
  {
    name: "gaussianBlur",
    displayName: "Gaussian Blur",
    category: "Blur & Edges",
    description: "Smooth blur via a 3-pass separable box-blur approximation.",
    options: [{ key: "radius", label: "Radius", type: "range", min: 0, max: 20, step: 1, default: 4 }],
    apply: gaussianBlur,
  },
  {
    name: "boxBlur",
    displayName: "Box Blur",
    category: "Blur & Edges",
    description: "Fast, blocky single-pass box blur.",
    options: [{ key: "radius", label: "Radius", type: "range", min: 0, max: 20, step: 1, default: 3 }],
    apply: boxBlur,
  },
  {
    name: "sharpen",
    displayName: "Sharpen",
    category: "Blur & Edges",
    description: "Unsharp mask — boosts local contrast against a blurred copy of itself.",
    options: [
      { key: "amount", label: "Amount", type: "range", min: 0, max: 200, step: 5, default: 50 },
      { key: "radius", label: "Radius", type: "range", min: 1, max: 5, step: 1, default: 1 },
    ],
    apply: sharpen,
  },
  {
    name: "sobelEdges",
    displayName: "Edge Detect",
    category: "Blur & Edges",
    description: "Sobel gradient magnitude, thresholded to a clean black/white edge map.",
    options: [
      { key: "threshold", label: "Threshold", type: "range", min: 0, max: 255, step: 1, default: 50 },
      { key: "invert", label: "Invert", type: "bool", default: false },
    ],
    apply: sobelEdges,
  },
  {
    name: "emboss",
    displayName: "Emboss",
    category: "Blur & Edges",
    description: "Directional relief shading from local pixel differences.",
    options: [{ key: "strength", label: "Strength", type: "range", min: 0.2, max: 5, step: 0.1, default: 1 }],
    apply: emboss,
  },
];
