import type { LoadedMedia } from "../../types";
import type { SecondaryVisual } from "../../App";

interface InputPanelProps {
  media: LoadedMedia | null;
  secondaryVisual: SecondaryVisual | null;
  onToggleSecondaryVisualMuted: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  hasAudio: boolean;
  volume: number;
  onVolumeChange: (v: number) => void;
}

export function InputPanel({
  media,
  secondaryVisual,
  onToggleSecondaryVisualMuted,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  hasAudio,
  volume,
  onVolumeChange,
}: InputPanelProps) {
  return (
    <div className="param-group">
      <div className="panel-section-label">MEDIA</div>
      {media ? (
        <div className="input-media-summary">
          <span className="kind">{media.kind}</span>
          <span className="input-media-name" title={media.name}>
            {media.name}
          </span>
          {media.dimensions && (
            <span className="dims">
              {media.dimensions.width}×{media.dimensions.height}px
            </span>
          )}
        </div>
      ) : (
        <div className="chain-options-empty">Use "Load Audio / Video / Photo" in the top bar to get started.</div>
      )}

      {secondaryVisual && (
        <div className="input-media-summary">
          <span className="kind">{secondaryVisual.kind}</span>
          <span className="input-media-name" title={secondaryVisual.name}>
            {secondaryVisual.name}
          </span>
          {secondaryVisual.dimensions && (
            <span className="dims">
              {secondaryVisual.dimensions.width}×{secondaryVisual.dimensions.height}px
            </span>
          )}
        </div>
      )}

      {secondaryVisual?.kind === "video" && (
        <div className="opt-row opt-row-bool">
          <span>Video Muted</span>
          <button className={`switch ${secondaryVisual.muted ? "on" : ""}`} onClick={onToggleSecondaryVisualMuted}>
            <span className="knob" />
          </button>
        </div>
      )}

      <div className="panel-section-label">VIEW</div>
      <div className="opt-row-top" style={{ marginBottom: -4 }}>
        <span>Zoom</span>
        <span className="opt-val">{Math.round(zoom * 100)}%</span>
      </div>
      <div className="zoom-control full">
        <button onClick={onZoomOut}>−</button>
        <button className="zoom-value" onClick={onZoomReset}>
          reset
        </button>
        <button onClick={onZoomIn}>+</button>
      </div>

      {hasAudio && (
        <>
          <div className="panel-section-label">AUDIO</div>
          <div className="opt-row">
            <div className="opt-row-top">
              <span>Volume</span>
              <span className="opt-val">{volume.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.01}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            />
          </div>
        </>
      )}
    </div>
  );
}
