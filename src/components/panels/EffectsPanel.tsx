import { useEffect, useRef, useState } from "react";
import type { AudioBand, ChainEntry } from "../../filters/types";
import { filterIndex } from "../../filters/registry";
import { runSinglePreview } from "../../filters/runtime";
import type { BaseFrame } from "../Stage";
import type { GLRenderer } from "../../gl/GLRenderer";
import { OptionControl } from "../OptionControl";

export type BrowserTarget = { mode: "add" } | { mode: "replace"; entryId: string };

interface EffectsPanelProps {
  chain: ChainEntry[];
  onChainChange: (chain: ChainEntry[]) => void;
  activeEntryId: string | null;
  onSetActive: (id: string | null) => void;
  onOpenBrowser: (target: BrowserTarget) => void;
  getBaseFrame: () => BaseFrame | null;
  getGLRenderer: () => GLRenderer | null;
  hasAudio: boolean;
}

export function EffectsPanel({
  chain,
  onChainChange,
  activeEntryId,
  onSetActive,
  onOpenBrowser,
  getBaseFrame,
  getGLRenderer,
  hasAudio,
}: EffectsPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hoveredId) return;
    const entry = chain.find((e) => e.id === hoveredId);
    if (!entry) return;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const base = getBaseFrame();
      const canvas = previewCanvasRef.current;
      if (!base || !canvas) return;
      if (canvas.width !== 150 || canvas.height !== 94) {
        canvas.width = 150;
        canvas.height = 94;
      }
      runSinglePreview(base.source, entry.filterName, entry.values, canvas, getGLRenderer(), (performance.now() - start) / 1000);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [hoveredId, chain, getBaseFrame, getGLRenderer]);

  function updateEntry(id: string, patch: Partial<ChainEntry>) {
    onChainChange(chain.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function updateValue(id: string, key: string, value: ChainEntry["values"][string]) {
    onChainChange(chain.map((e) => (e.id === id ? { ...e, values: { ...e.values, [key]: value } } : e)));
  }

  function updateAudioLink(id: string, key: string, band: AudioBand | undefined) {
    onChainChange(
      chain.map((e) => {
        if (e.id !== id) return e;
        const audioLinks = { ...e.audioLinks };
        if (band) audioLinks[key] = band;
        else delete audioLinks[key];
        return { ...e, audioLinks };
      }),
    );
  }

  function removeEntry(id: string) {
    onChainChange(chain.filter((e) => e.id !== id));
    if (activeEntryId === id) onSetActive(null);
  }

  function handleDrop(targetIndex: number) {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === targetIndex) return;
    const next = [...chain];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    onChainChange(next);
  }

  return (
    <>
      <div className="chain-header">
        <span className="chain-title">FILTER CHAIN</span>
        <span className="chain-count">
          {chain.length} stage{chain.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="chain-actions">
        <button onClick={() => onOpenBrowser({ mode: "add" })}>Library...</button>
        <button onClick={() => onChainChange([])} disabled={chain.length === 0}>
          Clear
        </button>
      </div>

      <div className="chain-list">
        {chain.map((entry, i) => {
          const filter = filterIndex[entry.filterName];
          if (!filter) return null;
          const isActive = activeEntryId === entry.id;
          return (
            <div key={entry.id} className="chain-row-wrap">
              <div
                className={`chain-row ${isActive ? "active" : ""}`}
                draggable
                onDragStart={() => (dragIndexRef.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                onMouseEnter={(e) => {
                  setHoveredId(entry.id);
                  const r = e.currentTarget.getBoundingClientRect();
                  setHoverPos({ top: r.top, left: r.left });
                }}
                onMouseLeave={() => setHoveredId((h) => (h === entry.id ? null : h))}
              >
                <span className="drag-handle">≡</span>
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(e) => updateEntry(entry.id, { enabled: e.target.checked })}
                />
                <span className="chain-index">{String(i + 1).padStart(2, "0")}</span>
                <button className="chain-name" onClick={() => onSetActive(isActive ? null : entry.id)}>
                  {filter.displayName}
                </button>
                <button className="chain-caret" onClick={() => onOpenBrowser({ mode: "replace", entryId: entry.id })}>
                  ▾
                </button>
                <button className="chain-remove" onClick={() => removeEntry(entry.id)}>
                  ×
                </button>
              </div>

              {isActive && (
                <div className="chain-options">
                  {filter.options.length === 0 && <div className="chain-options-empty">No parameters.</div>}
                  {filter.options.map((opt) => (
                    <OptionControl
                      key={opt.key}
                      option={opt}
                      value={entry.values[opt.key]}
                      onChange={(v) => updateValue(entry.id, opt.key, v)}
                      audioLink={entry.audioLinks[opt.key]}
                      onAudioLinkChange={(band) => updateAudioLink(entry.id, opt.key, band)}
                      hasAudio={hasAudio}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button className="chain-add-row" onClick={() => onOpenBrowser({ mode: "add" })}>
          + Add filter...
        </button>
      </div>

      {hoveredId &&
        hoverPos &&
        (() => {
          const entry = chain.find((e) => e.id === hoveredId);
          const filter = entry ? filterIndex[entry.filterName] : null;
          if (!entry || !filter) return null;
          return (
            <div className="hover-preview" style={{ top: hoverPos.top, left: hoverPos.left - 160 }}>
              <canvas ref={previewCanvasRef} />
              <div className="hover-preview-label">{filter.displayName} only</div>
            </div>
          );
        })()}
    </>
  );
}
