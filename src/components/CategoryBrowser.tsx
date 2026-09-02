import { useEffect, useRef, useState } from "react";
import type { FilterCategory } from "../filters/types";
import { FILTER_CATEGORIES } from "../filters/types";
import { filtersByCategory, searchFilters } from "../filters/registry";
import { runSinglePreview } from "../filters/runtime";
import type { BaseFrame } from "./Stage";
import type { GLRenderer } from "../gl/GLRenderer";

interface CategoryBrowserProps {
  onClose: () => void;
  onSelect: (filterName: string) => void;
  getBaseFrame: () => BaseFrame | null;
  getGLRenderer: () => GLRenderer | null;
}

export function CategoryBrowser({ onClose, onSelect, getBaseFrame, getGLRenderer }: CategoryBrowserProps) {
  const [category, setCategory] = useState<FilterCategory | null>(null);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const searching = query.trim().length > 0;
  const listFilters = searching ? searchFilters(query) : category ? filtersByCategory[category] : [];
  const hoveredFilter = listFilters.find((f) => f.name === hovered) ?? listFilters[0] ?? null;

  useEffect(() => {
    if (!hovered && listFilters.length > 0) setHovered(listFilters[0].name);
  }, [category, query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hoveredFilter) return;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const base = getBaseFrame();
      const canvas = previewCanvasRef.current;
      if (!base || !canvas) return;
      if (canvas.width !== 260 || canvas.height !== 160) {
        canvas.width = 260;
        canvas.height = 160;
      }
      const defaults = Object.fromEntries(hoveredFilter.options.map((o) => [o.key, o.default]));
      runSinglePreview(base.source, hoveredFilter.name, defaults, canvas, getGLRenderer(), (performance.now() - start) / 1000);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [hoveredFilter, getBaseFrame, getGLRenderer]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="browser-modal frosted" onClick={(e) => e.stopPropagation()}>
        <div className="browser-header">
          <span className="browser-title">FILTER LIBRARY</span>
          <button className="browser-close" onClick={onClose}>
            ×
          </button>
        </div>

        <input
          className="browser-search"
          type="text"
          placeholder="Search by name, category, or description..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHovered(null);
          }}
          autoFocus
        />

        {!searching && !category && (
          <div className="category-grid">
            {FILTER_CATEGORIES.map((cat) => {
              const items = filtersByCategory[cat];
              return (
                <button key={cat} className="category-card" onClick={() => setCategory(cat)}>
                  <div className="category-card-top">
                    <span className="category-name">{cat}</span>
                    <span className="category-count">{items.length}</span>
                  </div>
                  <div className="category-examples">{items.slice(0, 3).map((f) => f.displayName).join(" · ")}</div>
                </button>
              );
            })}
          </div>
        )}

        {(searching || category) && (
          <div className="browser-body">
            {!searching && (
              <button className="browser-back" onClick={() => setCategory(null)}>
                ← Categories
              </button>
            )}
            <div className="browser-split">
              <div className="browser-list">
                {listFilters.map((f) => (
                  <button
                    key={f.name}
                    className={`browser-list-item ${hoveredFilter?.name === f.name ? "hovered" : ""}`}
                    onMouseEnter={() => setHovered(f.name)}
                    onClick={() => onSelect(f.name)}
                  >
                    <span className="browser-list-name">{f.displayName}</span>
                    <span className="browser-list-cat">{f.category}</span>
                  </button>
                ))}
                {listFilters.length === 0 && <div className="browser-empty">No filters match.</div>}
              </div>

              <div className="browser-detail">
                {hoveredFilter ? (
                  <>
                    <canvas className="browser-preview" ref={previewCanvasRef} />
                    <div className="browser-detail-name">{hoveredFilter.displayName}</div>
                    <div className="browser-detail-cat">{hoveredFilter.category}</div>
                    <p className="browser-detail-desc">{hoveredFilter.description}</p>
                    <button className="browser-select-btn" onClick={() => onSelect(hoveredFilter.name)}>
                      Add to Chain
                    </button>
                  </>
                ) : (
                  <div className="browser-empty">Hover a filter to preview it.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
