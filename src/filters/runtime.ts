import type { GLRenderer, TerrainParams } from "../gl/GLRenderer";
import { filterIndex } from "./registry";
import type { ChainEntry, FilterDefinition, OptionValue } from "./types";
import type { Bands } from "../types";

const ZERO_BANDS: Bands = { bass: 0, mid: 0, treble: 0, level: 0 };

/**
 * Applies each option's audio-band link (if any) on top of its base value —
 * `base + (bandLevel - 0.5) * range * depth`, clamped to the option's min/max.
 */
function withAudioLinks(filter: FilterDefinition, entry: ChainEntry, bands: Bands): Record<string, OptionValue> {
  const links = entry.audioLinks;
  if (!links || Object.keys(links).length === 0) return entry.values;

  const out = { ...entry.values };
  for (const [key, band] of Object.entries(links)) {
    if (!band) continue;
    const opt = filter.options.find((o) => o.key === key);
    if (!opt || opt.type !== "range") continue;
    const min = opt.min ?? 0;
    const max = opt.max ?? 1;
    const base = Number(entry.values[key] ?? opt.default);
    const modulated = base + (bands[band] - 0.5) * (max - min) * 0.9;
    out[key] = Math.min(max, Math.max(min, modulated));
  }
  return out;
}

function getSourceSize(source: CanvasImageSource): { w: number; h: number } {
  if (source instanceof HTMLVideoElement) return { w: source.videoWidth, h: source.videoHeight };
  if (source instanceof HTMLImageElement) return { w: source.naturalWidth, h: source.naturalHeight };
  if (source instanceof HTMLCanvasElement) return { w: source.width, h: source.height };
  const sized = source as { width?: number; height?: number };
  return { w: sized.width ?? 0, h: sized.height ?? 0 };
}

/** Draws `source` cover-fit into the dw×dh destination — fills it entirely, cropping
 * the overflow axis, instead of stretching the source to match a different aspect ratio. */
function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, dw: number, dh: number) {
  const { w: sw, h: sh } = getSourceSize(source);
  if (!sw || !sh) {
    ctx.drawImage(source, 0, 0, dw, dh);
    return;
  }
  const scale = Math.max(dw / sw, dh / sh);
  const rw = sw * scale;
  const rh = sh * scale;
  ctx.drawImage(source, (dw - rw) / 2, (dh - rh) / 2, rw, rh);
}

export interface CanvasPool {
  a: HTMLCanvasElement;
  b: HTMLCanvasElement;
}

export function createCanvasPool(): CanvasPool {
  return { a: document.createElement("canvas"), b: document.createElement("canvas") };
}

const BASE_WORK_DIM = 1536;

export interface ChainRunResult {
  canvas: HTMLCanvasElement;
  ms: number;
  activeNames: string[];
}

/**
 * Runs a base frame through the enabled chain entries in order, ping-ponging between
 * two pooled canvases, and returns whichever canvas holds the final result. Processing
 * happens at a resolution capped on the long edge (scaled by `outputScale`) so CPU pixel
 * filters stay responsive regardless of the display's device-pixel resolution.
 */
export function runChain(
  baseSource: CanvasImageSource,
  baseW: number,
  baseH: number,
  chain: ChainEntry[],
  pool: CanvasPool,
  glRenderer: GLRenderer,
  temporalState: Map<string, ImageData>,
  t: number,
  outputScale = 1,
  bands: Bands = ZERO_BANDS,
): ChainRunResult {
  const start = performance.now();
  const maxDim = BASE_WORK_DIM * Math.max(0.1, outputScale);
  const scale = Math.min(1, maxDim / Math.max(baseW, baseH, 1));
  const w = Math.max(1, Math.round(baseW * scale));
  const h = Math.max(1, Math.round(baseH * scale));

  for (const c of [pool.a, pool.b]) {
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
  }

  let current = pool.a;
  let scratch = pool.b;
  const startCtx = current.getContext("2d")!;
  startCtx.clearRect(0, 0, w, h);
  startCtx.drawImage(baseSource, 0, 0, w, h);

  const enabled = chain.filter((e) => e.enabled);
  const activeIds = new Set(enabled.map((e) => e.id));
  for (const id of temporalState.keys()) {
    if (!activeIds.has(id)) temporalState.delete(id);
  }

  for (const entry of enabled) {
    const filter = filterIndex[entry.filterName];
    if (!filter) continue;
    const values = withAudioLinks(filter, entry, bands);

    if (filter.renderGL) {
      glRenderer.resize(w, h);
      glRenderer.updateHeightmap(current);
      glRenderer.render(values as unknown as TerrainParams, w, h);
      const sctx = scratch.getContext("2d")!;
      sctx.clearRect(0, 0, w, h);
      sctx.drawImage(glRenderer.canvasEl, 0, 0, w, h);
    } else if (filter.apply) {
      const cctx = current.getContext("2d", { willReadFrequently: true })!;
      const imgData = cctx.getImageData(0, 0, w, h);
      const prev = filter.temporal ? temporalState.get(entry.id) : undefined;
      const result = filter.apply(imgData, values, { width: w, height: h, t, prev });
      if (filter.temporal) temporalState.set(entry.id, result);
      const sctx = scratch.getContext("2d")!;
      sctx.putImageData(result, 0, 0);
    } else {
      continue;
    }
    const tmp = current;
    current = scratch;
    scratch = tmp;
  }

  return { canvas: current, ms: performance.now() - start, activeNames: enabled.map((e) => filterIndex[e.filterName]?.displayName ?? e.filterName) };
}

/**
 * Renders a single filter (not a chain) at whatever size `targetCanvas` already is —
 * used for the small hover-preview thumbnails in the chain list and category browser.
 */
export function runSinglePreview(
  baseSource: CanvasImageSource,
  filterName: string,
  values: Record<string, OptionValue>,
  targetCanvas: HTMLCanvasElement,
  glRenderer: GLRenderer | null,
  t: number,
) {
  const w = targetCanvas.width;
  const h = targetCanvas.height;
  const ctx = targetCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  drawCover(ctx, baseSource, w, h);

  const filter = filterIndex[filterName];
  if (!filter) return;

  if (filter.renderGL && glRenderer) {
    glRenderer.resize(w, h);
    glRenderer.updateHeightmap(targetCanvas);
    glRenderer.render(values as unknown as TerrainParams, w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glRenderer.canvasEl, 0, 0, w, h);
  } else if (filter.apply) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const result = filter.apply(imgData, values, { width: w, height: h, t });
    ctx.putImageData(result, 0, 0);
  }
}
