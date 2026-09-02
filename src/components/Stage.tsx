import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { AudioEngine } from "../lib/audioEngine";
import { GLRenderer } from "../gl/GLRenderer";
import { createCanvasPool, runChain } from "../filters/runtime";
import type { ChainEntry } from "../filters/types";
import type { LoadedMedia } from "../types";

const STAGE_BG = "#000000";
/** Shown whenever there's no loaded video/photo (including audio-only) — the chain
 * still runs on it, so an audio-linked filter param is visibly reactive out of the box. */
const DEFAULT_IMAGE_URL = "/default-image.png";

export interface BaseFrame {
  source: CanvasImageSource;
  w: number;
  h: number;
}

export interface StageStats {
  ms: number;
  fps: number;
  activeNames: string[];
}

export interface StageHandle {
  getDisplayCanvas: () => HTMLCanvasElement | null;
  getBaseFrame: () => BaseFrame | null;
  getGLRenderer: () => GLRenderer | null;
  getResultCanvas: () => HTMLCanvasElement | null;
  getStats: () => StageStats | null;
}

interface StageProps {
  media: LoadedMedia | null;
  chain: ChainEntry[];
  engine: AudioEngine;
  zoom: number;
  outputScale: number;
  pixelated: boolean;
}

export const Stage = forwardRef<StageHandle, StageProps>(function Stage(
  { media, chain, engine, zoom, outputScale, pixelated },
  ref,
) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRendererRef = useRef<GLRenderer | null>(null);
  const poolRef = useRef(createCanvasPool());
  const temporalStateRef = useRef(new Map<string, ImageData>());
  const defaultImageRef = useRef<HTMLImageElement | null>(null);
  const baseFrameRef = useRef<BaseFrame | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const statsRef = useRef<StageStats | null>(null);

  const chainRef = useRef(chain);
  chainRef.current = chain;
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const outputScaleRef = useRef(outputScale);
  outputScaleRef.current = outputScale;
  const pixelatedRef = useRef(pixelated);
  pixelatedRef.current = pixelated;

  useImperativeHandle(ref, () => ({
    getDisplayCanvas: () => displayCanvasRef.current,
    getBaseFrame: () => baseFrameRef.current,
    getGLRenderer: () => glRendererRef.current,
    getResultCanvas: () => resultCanvasRef.current,
    getStats: () => statsRef.current,
  }));

  useEffect(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;

    const glCanvas = document.createElement("canvas");
    glCanvasRef.current = glCanvas;
    glRendererRef.current = new GLRenderer(glCanvas);
    const defaultImg = new Image();
    defaultImg.src = DEFAULT_IMAGE_URL;
    defaultImageRef.current = defaultImg;
    const displayCtx = displayCanvas.getContext("2d")!;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (displayCanvas.width !== w || displayCanvas.height !== h) {
        displayCanvas.width = w;
        displayCanvas.height = h;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let rafId = 0;
    const start = performance.now();
    let lastFrameAt = performance.now();
    let fpsEma = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const w = displayCanvas.width;
      const h = displayCanvas.height;
      if (!w || !h) return;

      const now = performance.now();
      const delta = now - lastFrameAt;
      lastFrameAt = now;
      if (delta > 0) {
        const instFps = 1000 / delta;
        fpsEma = fpsEma === 0 ? instFps : fpsEma * 0.9 + instFps * 0.1;
      }

      const t = (now - start) / 1000;
      const m = mediaRef.current;

      let base: BaseFrame | null = null;
      if (m?.kind === "video" && m.visualEl instanceof HTMLVideoElement && m.visualEl.readyState >= 2) {
        base = { source: m.visualEl, w: m.visualEl.videoWidth || 1, h: m.visualEl.videoHeight || 1 };
      } else if (m?.kind === "image" && m.visualEl instanceof HTMLImageElement && m.visualEl.naturalWidth) {
        base = { source: m.visualEl, w: m.visualEl.naturalWidth, h: m.visualEl.naturalHeight };
      } else {
        const img = defaultImageRef.current;
        if (img && img.complete && img.naturalWidth) {
          base = { source: img, w: img.naturalWidth, h: img.naturalHeight };
        }
      }
      if (!base) return; // default image hasn't finished its first load yet
      baseFrameRef.current = base;

      const result = runChain(
        base.source,
        base.w,
        base.h,
        chainRef.current,
        poolRef.current,
        glRendererRef.current!,
        temporalStateRef.current,
        t,
        outputScaleRef.current,
        engine.getBands(),
      );
      resultCanvasRef.current = result.canvas;
      statsRef.current = { ms: result.ms, fps: fpsEma, activeNames: result.activeNames };

      displayCtx.imageSmoothingEnabled = !pixelatedRef.current;
      displayCtx.fillStyle = STAGE_BG;
      displayCtx.fillRect(0, 0, w, h);
      const zoomVal = zoomRef.current;
      const scale = Math.min(w / result.canvas.width, h / result.canvas.height) * zoomVal;
      const dw = result.canvas.width * scale;
      const dh = result.canvas.height * scale;
      displayCtx.drawImage(result.canvas, (w - dw) / 2, (h - dh) / 2, dw, dh);
    };
    tick();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, [engine]);

  return <canvas ref={displayCanvasRef} className="stage-canvas active" />;
});
