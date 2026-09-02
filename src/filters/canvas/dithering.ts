import type { FilterDefinition } from "../types";
import { clamp255, clamp01 } from "./helpers";

interface Weight {
  dx: number;
  dy: number;
  w: number;
}

function errorDiffusionApply(kernel: Weight[]) {
  return (data: ImageData, values: Record<string, number | boolean | string>): ImageData => {
    const W = data.width;
    const H = data.height;
    const buf = new Float32Array(data.data.length);
    for (let i = 0; i < data.data.length; i++) buf[i] = data.data[i];
    const levels = Math.max(2, Math.round(Number(values.levels ?? 2)));
    const step = 255 / (levels - 1);
    const out = new Uint8ClampedArray(data.data.length);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) {
          const old = buf[i + c];
          const q = clamp255(Math.round(old / step) * step);
          out[i + c] = q;
          const err = old - q;
          if (err === 0) continue;
          for (const k of kernel) {
            const tx = x + k.dx;
            const ty = y + k.dy;
            if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;
            buf[(ty * W + tx) * 4 + c] += err * k.w;
          }
        }
        out[i + 3] = 255;
      }
    }
    return new ImageData(out, W, H);
  };
}

const LEVELS_OPTION = { key: "levels", label: "Levels", type: "range" as const, min: 2, max: 8, step: 1, default: 2 };

const floydSteinbergKernel: Weight[] = [
  { dx: 1, dy: 0, w: 7 / 16 },
  { dx: -1, dy: 1, w: 3 / 16 },
  { dx: 0, dy: 1, w: 5 / 16 },
  { dx: 1, dy: 1, w: 1 / 16 },
];

const atkinsonKernel: Weight[] = [
  { dx: 1, dy: 0, w: 1 / 8 },
  { dx: 2, dy: 0, w: 1 / 8 },
  { dx: -1, dy: 1, w: 1 / 8 },
  { dx: 0, dy: 1, w: 1 / 8 },
  { dx: 1, dy: 1, w: 1 / 8 },
  { dx: 0, dy: 2, w: 1 / 8 },
];

const jarvisKernel: Weight[] = [
  { dx: 1, dy: 0, w: 7 / 48 },
  { dx: 2, dy: 0, w: 5 / 48 },
  { dx: -2, dy: 1, w: 3 / 48 },
  { dx: -1, dy: 1, w: 5 / 48 },
  { dx: 0, dy: 1, w: 7 / 48 },
  { dx: 1, dy: 1, w: 5 / 48 },
  { dx: 2, dy: 1, w: 3 / 48 },
  { dx: -2, dy: 2, w: 1 / 48 },
  { dx: -1, dy: 2, w: 3 / 48 },
  { dx: 0, dy: 2, w: 5 / 48 },
  { dx: 1, dy: 2, w: 3 / 48 },
  { dx: 2, dy: 2, w: 1 / 48 },
];

const stuckiKernel: Weight[] = [
  { dx: 1, dy: 0, w: 8 / 42 },
  { dx: 2, dy: 0, w: 4 / 42 },
  { dx: -2, dy: 1, w: 2 / 42 },
  { dx: -1, dy: 1, w: 4 / 42 },
  { dx: 0, dy: 1, w: 8 / 42 },
  { dx: 1, dy: 1, w: 4 / 42 },
  { dx: 2, dy: 1, w: 2 / 42 },
  { dx: -2, dy: 2, w: 1 / 42 },
  { dx: -1, dy: 2, w: 2 / 42 },
  { dx: 0, dy: 2, w: 4 / 42 },
  { dx: 1, dy: 2, w: 2 / 42 },
  { dx: 2, dy: 2, w: 1 / 42 },
];

const burkesKernel: Weight[] = [
  { dx: 1, dy: 0, w: 8 / 32 },
  { dx: 2, dy: 0, w: 4 / 32 },
  { dx: -2, dy: 1, w: 2 / 32 },
  { dx: -1, dy: 1, w: 4 / 32 },
  { dx: 0, dy: 1, w: 8 / 32 },
  { dx: 1, dy: 1, w: 4 / 32 },
  { dx: 2, dy: 1, w: 2 / 32 },
];

const BAYER2 = [
  [0, 2],
  [3, 1],
];
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function orderedDitherApply(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const size = Math.round(Number(values.matrixSize ?? 8));
  const matrix = size === 2 ? BAYER2 : size === 4 ? BAYER4 : BAYER8;
  const n = size * size;
  const levels = Math.max(2, Math.round(Number(values.levels ?? 2)));
  const W = data.width;
  const H = data.height;
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const threshold = (matrix[y % size][x % size] + 0.5) / n - 0.5;
      for (let c = 0; c < 3; c++) {
        const v = clamp01(data.data[i + c] / 255 + threshold / levels);
        out[i + c] = clamp255((Math.round(v * (levels - 1)) / (levels - 1)) * 255);
      }
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

export const ditheringFilters: FilterDefinition[] = [
  {
    name: "floydSteinberg",
    displayName: "Floyd-Steinberg",
    category: "Dithering",
    description: "Classic 1976 error-diffusion dither — spreads quantization error to the next three neighbors.",
    options: [LEVELS_OPTION],
    apply: errorDiffusionApply(floydSteinbergKernel),
  },
  {
    name: "atkinson",
    displayName: "Atkinson",
    category: "Dithering",
    description: "Classic Mac dithering with 75% error diffusion for a crisp, high-contrast look.",
    options: [LEVELS_OPTION],
    apply: errorDiffusionApply(atkinsonKernel),
  },
  {
    name: "jarvis",
    displayName: "Jarvis-Judice-Ninke",
    category: "Dithering",
    description: "Wide 12-neighbor error diffusion kernel — smoother gradients than Floyd-Steinberg.",
    options: [LEVELS_OPTION],
    apply: errorDiffusionApply(jarvisKernel),
  },
  {
    name: "stucki",
    displayName: "Stucki",
    category: "Dithering",
    description: "Sharper variant of Jarvis with the same 12-neighbor spread, different weighting.",
    options: [LEVELS_OPTION],
    apply: errorDiffusionApply(stuckiKernel),
  },
  {
    name: "burkes",
    displayName: "Burkes",
    category: "Dithering",
    description: "A lighter, faster 7-neighbor error-diffusion kernel.",
    options: [LEVELS_OPTION],
    apply: errorDiffusionApply(burkesKernel),
  },
  {
    name: "orderedBayer",
    displayName: "Ordered (Bayer)",
    category: "Dithering",
    description: "Ordered dithering using a Bayer threshold matrix — regular crosshatch pattern, no error diffusion.",
    options: [
      {
        key: "matrixSize",
        label: "Matrix",
        type: "select",
        default: "8",
        options: [
          { label: "2×2", value: "2" },
          { label: "4×4", value: "4" },
          { label: "8×8", value: "8" },
        ],
      },
      LEVELS_OPTION,
    ],
    apply: orderedDitherApply,
  },
  {
    name: "terrainRelief",
    displayName: "Terrain Relief",
    category: "Dithering",
    description: "Lights the frame as a heightfield and ordered-dithers the shading — the app's signature 3D relief look.",
    options: [
      { key: "rotationX", label: "Rotation X", type: "range", min: -100, max: 100, step: 1, default: 0 },
      { key: "rotationY", label: "Rotation Y", type: "range", min: -100, max: 100, step: 1, default: 0 },
      { key: "lightPower", label: "Light Power", type: "range", min: 0, max: 100, step: 1, default: 65 },
      { key: "lightPosition", label: "Light Position", type: "range", min: 0, max: 100, step: 1, default: 40 },
      { key: "threshold", label: "Threshold", type: "range", min: 0, max: 100, step: 1, default: 18 },
      { key: "sharpness", label: "Sharpness", type: "range", min: 0, max: 100, step: 1, default: 55 },
      { key: "dotSize", label: "Dot Size", type: "range", min: 1, max: 8, step: 1, default: 3 },
      { key: "invert", label: "Invert", type: "bool", default: false },
      { key: "color", label: "Foreground", type: "color", default: "#000000" },
      { key: "bgColor", label: "Background", type: "color", default: "#ffffff" },
    ],
    renderGL: true,
  },
];
