interface ExportPanelProps {
  onExport: () => void;
  recording: boolean;
}

export function ExportPanel({ onExport, recording }: ExportPanelProps) {
  return (
    <div className="param-group">
      <div className="panel-section-label">EXPORT</div>
      <p className="chain-options-empty">
        Records the current view as a WebM video, including audio if a source is connected. Click again to stop and save.
      </p>
      <button className={`export-btn ${recording ? "recording" : ""}`} onClick={onExport}>
        {recording ? "STOP & SAVE" : "EXPORT"}
      </button>
    </div>
  );
}
