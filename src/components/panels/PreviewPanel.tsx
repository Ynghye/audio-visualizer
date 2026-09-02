import { useEffect, useState } from "react";
import type { StageStats } from "../Stage";

interface PreviewPanelProps {
  outputScale: number;
  onOutputScaleChange: (v: number) => void;
  pixelated: boolean;
  onPixelatedChange: (v: boolean) => void;
  onCopyOutputToInput: () => void;
  getStats: () => StageStats | null;
  onPrevTab: () => void;
  onNextTab: () => void;
}

export function PreviewPanel({
  outputScale,
  onOutputScaleChange,
  pixelated,
  onPixelatedChange,
  onCopyOutputToInput,
  getStats,
  onPrevTab,
  onNextTab,
}: PreviewPanelProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState<StageStats | null>(null);

  useEffect(() => {
    if (!statsOpen) return;
    const id = setInterval(() => setStats(getStats()), 500);
    return () => clearInterval(id);
  }, [statsOpen, getStats]);

  return (
    <div className="param-group">
      <div className="panel-section-label">OUTPUT</div>

      <div className="opt-row">
        <div className="opt-row-top">
          <span>Output Scale</span>
          <span className="opt-val">{outputScale.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min={0.25}
          max={2}
          step={0.05}
          value={outputScale}
          onChange={(e) => onOutputScaleChange(parseFloat(e.target.value))}
        />
      </div>

      <div className="opt-row-select">
        <span>Scaling Algorithm</span>
        <select value={pixelated ? "pixelated" : "smooth"} onChange={(e) => onPixelatedChange(e.target.value === "pixelated")}>
          <option value="smooth">Smooth</option>
          <option value="pixelated">Pixelated</option>
        </select>
      </div>

      <button className="chain-add-row" onClick={onCopyOutputToInput}>
        &laquo; Copy output to input
      </button>

      <div className="panel-nav">
        <button onClick={onPrevTab}>← Effects</button>
        <button onClick={onNextTab}>Export →</button>
      </div>

      <button className="settings-toggle" onClick={() => setStatsOpen((o) => !o)}>
        <span>Settings</span>
        <span>{statsOpen ? "[-]" : "[+]"}</span>
      </button>
      {statsOpen && (
        <div className="settings-body">
          {stats
            ? `${stats.activeNames.join(" → ") || "None"} | ${stats.ms.toFixed(1)} ms | ${stats.fps.toFixed(1)} fps`
            : "No data yet"}
        </div>
      )}
    </div>
  );
}
