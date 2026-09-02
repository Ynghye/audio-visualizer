import type { FilterDefinition } from "../types";
import { clamp255, clamp01, rgbToHsl, hslToRgb, hexToRgbTuple, luminance } from "./helpers";

function brightnessContrast(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const brightness = Number(values.brightness ?? 0);
  const contrast = Number(values.contrast ?? 0);
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = clamp255(factor * (out[i] - 128) + 128 + brightness);
    out[i + 1] = clamp255(factor * (out[i + 1] - 128) + 128 + brightness);
    out[i + 2] = clamp255(factor * (out[i + 2] - 128) + 128 + brightness);
  }
  return new ImageData(out, data.width, data.height);
}

function hueSaturation(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const hueShift = Number(values.hue ?? 0) / 360;
  const satShift = Number(values.saturation ?? 0) / 100;
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    const [h, s, l] = rgbToHsl(out[i], out[i + 1], out[i + 2]);
    let nh = h + hueShift;
    nh -= Math.floor(nh);
    const ns = clamp01(s + satShift);
    const [r, g, b] = hslToRgb(nh, ns, l);
    out[i] = clamp255(r);
    out[i + 1] = clamp255(g);
    out[i + 2] = clamp255(b);
  }
  return new ImageData(out, data.width, data.height);
}

function levels(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const black = Number(values.blackPoint ?? 0);
  const white = Number(values.whitePoint ?? 255);
  const gamma = Math.max(0.1, Number(values.gamma ?? 1));
  const range = Math.max(1, white - black);
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = clamp01((out[i + c] - black) / range);
      out[i + c] = clamp255(Math.pow(v, 1 / gamma) * 255);
    }
  }
  return new ImageData(out, data.width, data.height);
}

function invert(data: ImageData): ImageData {
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = 255 - out[i];
    out[i + 1] = 255 - out[i + 1];
    out[i + 2] = 255 - out[i + 2];
  }
  return new ImageData(out, data.width, data.height);
}

function duotone(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const [sr, sg, sb] = hexToRgbTuple(String(values.shadowColor ?? "#1a1a2e"));
  const [hr, hg, hb] = hexToRgbTuple(String(values.highlightColor ?? "#ffb347"));
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    const t = luminance(out[i], out[i + 1], out[i + 2]) / 255;
    out[i] = clamp255(sr + (hr - sr) * t);
    out[i + 1] = clamp255(sg + (hg - sg) * t);
    out[i + 2] = clamp255(sb + (hb - sb) * t);
  }
  return new ImageData(out, data.width, data.height);
}

const CHANNEL_ORDERS: Record<string, [number, number, number]> = {
  RGB: [0, 1, 2],
  RBG: [0, 2, 1],
  GRB: [1, 0, 2],
  GBR: [1, 2, 0],
  BRG: [2, 0, 1],
  BGR: [2, 1, 0],
};

function channelSwap(data: ImageData, values: Record<string, number | boolean | string>): ImageData {
  const order = CHANNEL_ORDERS[String(values.order ?? "RGB")] ?? [0, 1, 2];
  const out = new Uint8ClampedArray(data.data);
  for (let i = 0; i < out.length; i += 4) {
    const src = [data.data[i], data.data[i + 1], data.data[i + 2]];
    out[i] = src[order[0]];
    out[i + 1] = src[order[1]];
    out[i + 2] = src[order[2]];
  }
  return new ImageData(out, data.width, data.height);
}

export const colorFilters: FilterDefinition[] = [
  {
    name: "brightnessContrast",
    displayName: "Brightness / Contrast",
    category: "Color",
    description: "Standard linear brightness and contrast adjustment.",
    options: [
      { key: "brightness", label: "Brightness", type: "range", min: -100, max: 100, step: 1, default: 0 },
      { key: "contrast", label: "Contrast", type: "range", min: -100, max: 100, step: 1, default: 0 },
    ],
    apply: brightnessContrast,
  },
  {
    name: "hueSaturation",
    displayName: "Hue / Saturation",
    category: "Color",
    description: "Rotates hue and boosts or cuts saturation in HSL space.",
    options: [
      { key: "hue", label: "Hue", type: "range", min: -180, max: 180, step: 1, default: 0 },
      { key: "saturation", label: "Saturation", type: "range", min: -100, max: 100, step: 1, default: 0 },
    ],
    apply: hueSaturation,
  },
  {
    name: "levels",
    displayName: "Levels",
    category: "Color",
    description: "Remaps black/white points and gamma, like a curves/levels adjustment.",
    options: [
      { key: "blackPoint", label: "Black Point", type: "range", min: 0, max: 254, step: 1, default: 0 },
      { key: "whitePoint", label: "White Point", type: "range", min: 1, max: 255, step: 1, default: 255 },
      { key: "gamma", label: "Gamma", type: "range", min: 0.2, max: 3, step: 0.05, default: 1 },
    ],
    apply: levels,
  },
  {
    name: "invert",
    displayName: "Invert",
    category: "Color",
    description: "Inverts every color channel.",
    options: [],
    apply: invert,
  },
  {
    name: "duotone",
    displayName: "Duotone",
    category: "Color",
    description: "Maps luminance onto a two-color gradient.",
    options: [
      { key: "shadowColor", label: "Shadows", type: "color", default: "#1a1a2e" },
      { key: "highlightColor", label: "Highlights", type: "color", default: "#ffb347" },
    ],
    apply: duotone,
  },
  {
    name: "channelSwap",
    displayName: "Channel Swap",
    category: "Color",
    description: "Reorders the RGB channels for surreal false-color looks.",
    options: [
      {
        key: "order",
        label: "Order",
        type: "select",
        default: "GBR",
        options: Object.keys(CHANNEL_ORDERS).map((k) => ({ label: k, value: k })),
      },
    ],
    apply: channelSwap,
  },
];
