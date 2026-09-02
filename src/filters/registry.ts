import type { FilterCategory, FilterDefinition } from "./types";
import { FILTER_CATEGORIES } from "./types";
import { ditheringFilters } from "./canvas/dithering";
import { colorFilters } from "./canvas/color";
import { blurEdgesFilters } from "./canvas/blurEdges";
import { distortFilters } from "./canvas/distort";
import { glitchFilters } from "./canvas/glitch";
import { stylizeFilters } from "./canvas/stylize";
import { simulateFilters } from "./canvas/simulate";
import { advancedFilters } from "./canvas/advanced";

export const filterList: FilterDefinition[] = [
  ...ditheringFilters,
  ...colorFilters,
  ...blurEdgesFilters,
  ...distortFilters,
  ...glitchFilters,
  ...stylizeFilters,
  ...simulateFilters,
  ...advancedFilters,
];

export const filterIndex: Record<string, FilterDefinition> = Object.fromEntries(filterList.map((f) => [f.name, f]));

export const filtersByCategory: Record<FilterCategory, FilterDefinition[]> = Object.fromEntries(
  FILTER_CATEGORIES.map((cat) => [cat, filterList.filter((f) => f.category === cat)]),
) as Record<FilterCategory, FilterDefinition[]>;

export function searchFilters(query: string): FilterDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return filterList;
  return filterList.filter(
    (f) => f.displayName.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
  );
}
