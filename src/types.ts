export type MediaKind = "audio" | "video" | "image";

export interface LoadedMedia {
  kind: MediaKind;
  url: string;
  name: string;
  /** Element to draw / sample as a base frame: video or image only. */
  visualEl: HTMLVideoElement | HTMLImageElement | null;
  /** Element to wire into the Web Audio graph: audio or video only. */
  audioEl: HTMLMediaElement | null;
  /** Pixel dimensions of the visual source, once known (video/image only). */
  dimensions: { width: number; height: number } | null;
}

export interface Bands {
  bass: number;
  mid: number;
  treble: number;
  level: number;
}
