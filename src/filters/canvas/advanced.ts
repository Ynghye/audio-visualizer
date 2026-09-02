import type { FilterDefinition, FilterRunCtx } from "../types";
import { clamp255, luminance } from "./helpers";

function cellularAutomata(data: ImageData, values: Record<string, number | boolean | string>, ctx: FilterRunCtx): ImageData {
  const cell = Math.max(2, Math.round(Number(values.cellSize ?? 6)));
  const W = data.width;
  const H = data.height;
  const gw = Math.ceil(W / cell);
  const gh = Math.ceil(H / cell);
  const alive = new Uint8Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const px = Math.min(W - 1, gx * cell);
      const py = Math.min(H - 1, gy * cell);
      const i = (py * W + px) * 4;
      if (ctx.prev) {
        alive[gy * gw + gx] = ctx.prev.data[i] > 127 ? 1 : 0;
      } else {
        const lum = luminance(data.data[i], data.data[i + 1], data.data[i + 2]);
        alive[gy * gw + gx] = lum < 110 ? 1 : 0;
      }
    }
  }

  const next = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let n = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = (gx + ox + gw) % gw;
          const ny = (gy + oy + gh) % gh;
          n += alive[ny * gw + nx];
        }
      }
      const cur = alive[gy * gw + gx];
      next[gy * gw + gx] = cur ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
    }
  }

  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const gx = Math.min(gw - 1, Math.floor(x / cell));
      const gy = Math.min(gh - 1, Math.floor(y / cell));
      const v = next[gy * gw + gx] ? 255 : 0;
      const i = (y * W + x) * 4;
      out[i] = out[i + 1] = out[i + 2] = v;
      out[i + 3] = 255;
    }
  }
  return new ImageData(out, W, H);
}

function kaleidoscope(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const segments = Math.max(2, Math.round(Number(values.segments ?? 6)));
  const rot = (Number(values.rotation ?? 0) * Math.PI) / 180;
  const W = data.width;
  const H = data.height;
  const cx = W / 2;
  const cy = H / 2;
  const wedge = (Math.PI * 2) / segments;
  const out = new Uint8ClampedArray(data.data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      let ang = Math.atan2(dy, dx) - rot;
      ang = ((ang % wedge) + wedge) % wedge;
      if (ang > wedge / 2) ang = wedge - ang;
      const sx = Math.min(W - 1, Math.max(0, Math.round(cx + Math.cos(ang) * r)));
      const sy = Math.min(H - 1, Math.max(0, Math.round(cy + Math.sin(ang) * r)));
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

function motionTrail(data: ImageData, values: Record<string, number | boolean | string>, ctx: FilterRunCtx): ImageData {
  if (!ctx.prev) return data;
  const decay = Number(values.decay ?? 80) / 100;
  const out = new Uint8ClampedArray(data.data.length);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = clamp255(data.data[i] * (1 - decay) + ctx.prev.data[i] * decay);
    out[i + 1] = clamp255(data.data[i + 1] * (1 - decay) + ctx.prev.data[i + 1] * decay);
    out[i + 2] = clamp255(data.data[i + 2] * (1 - decay) + ctx.prev.data[i + 2] * decay);
    out[i + 3] = 255;
  }
  return new ImageData(out, data.width, data.height);
}

function thresholdMap(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const threshold = Number(values.threshold ?? 128);
  const soft = Boolean(values.soft ?? false);
  const out = new Uint8ClampedArray(data.data.length);
  for (let i = 0; i < out.length; i += 4) {
    const lum = luminance(data.data[i], data.data[i + 1], data.data[i + 2]);
    const v = soft ? clamp255(255 / (1 + Math.exp(-(lum - threshold) / 12))) : lum > threshold ? 255 : 0;
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return new ImageData(out, data.width, data.height);
}

export const advancedFilters: FilterDefinition[] = [
  {
    name: "cellularAutomata",
    displayName: "Cellular Automata",
    category: "Advanced",
    description: "Conway's Game of Life, reseeded from the source image and evolving one generation per frame.",
    temporal: true,
    options: [{ key: "cellSize", label: "Cell Size", type: "range", min: 2, max: 20, step: 1, default: 6 }],
    apply: cellularAutomata,
  },
  {
    name: "kaleidoscope",
    displayName: "Kaleidoscope",
    category: "Advanced",
    description: "Mirrors the frame into rotationally symmetric wedges.",
    options: [
      { key: "segments", label: "Segments", type: "range", min: 2, max: 16, step: 1, default: 6 },
      { key: "rotation", label: "Rotation", type: "range", min: 0, max: 360, step: 1, default: 0 },
    ],
    apply: kaleidoscope,
  },
  {
    name: "motionTrail",
    displayName: "Motion Trail",
    category: "Advanced",
    description: "Ghosts previous frames into the current one for a trailing-light effect.",
    temporal: true,
    options: [{ key: "decay", label: "Decay", type: "range", min: 0, max: 98, step: 1, default: 80 }],
    apply: motionTrail,
  },
  {
    name: "thresholdMap",
    displayName: "Threshold Map",
    category: "Advanced",
    description: "Reduces the frame to pure black/white by a luminance cutoff.",
    options: [
      { key: "threshold", label: "Threshold", type: "range", min: 0, max: 255, step: 1, default: 128 },
      { key: "soft", label: "Soft Edge", type: "bool", default: false },
    ],
    apply: thresholdMap,
  },
];
