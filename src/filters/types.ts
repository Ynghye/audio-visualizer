export type FilterCategory =
  | "Dithering"
  | "Color"
  | "Blur & Edges"
  | "Distort"
  | "Glitch"
  | "Stylize"
  | "Simulate"
  | "Advanced";

export const FILTER_CATEGORIES: FilterCategory[] = [
  "Dithering",
  "Color",
  "Blur & Edges",
  "Distort",
  "Glitch",
  "Stylize",
  "Simulate",
  "Advanced",
];

export type OptionValue = number | boolean | string;

export interface FilterOptionDef {
  key: string;
  label: string;
  type: "range" | "bool" | "select" | "color";
  min?: number;
  max?: number;
  step?: number;
  default: OptionValue;
  options?: { label: string; value: string }[];
}

export interface FilterRunCtx {
  width: number;
  height: number;
  t: number;
  /** Previous frame's output for this chain slot, for temporal filters. Undefined if none yet. */
  prev?: ImageData;
}

export interface FilterDefinition {
  name: string;
  displayName: string;
  category: FilterCategory;
  description: string;
  temporal?: boolean;
  options: FilterOptionDef[];
  /** CPU pixel filter. Most filters implement this. */
  apply?: (data: ImageData, values: Record<string, OptionValue>, ctx: FilterRunCtx) => ImageData;
  /** Special-cased GL filter (currently only the terrain relief effect). */
  renderGL?: true;
}

export type AudioBand = "bass" | "mid" | "treble" | "level";

export interface ChainEntry {
  id: string;
  filterName: string;
  enabled: boolean;
  values: Record<string, OptionValue>;
  /** Maps a range option's key to an audio band that modulates it live, on top of its base value. */
  audioLinks: Partial<Record<string, AudioBand>>;
}

export function defaultValues(filter: FilterDefinition): Record<string, OptionValue> {
  const out: Record<string, OptionValue> = {};
  for (const opt of filter.options) out[opt.key] = opt.default;
  return out;
}
